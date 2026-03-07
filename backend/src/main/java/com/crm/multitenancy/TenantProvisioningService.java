package com.crm.multitenancy;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;

@Service
public class TenantProvisioningService {

    private static final Logger log = LoggerFactory.getLogger(TenantProvisioningService.class);

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;
    private final TenantValidator validator;

    public TenantProvisioningService(DataSource dataSource,
                                     JdbcTemplate jdbc,
                                     TenantValidator validator) {
        this.dataSource = dataSource;
        this.jdbc = jdbc;
        this.validator = validator;
    }

    /**
     * BUG FIX 1: Eliminado @Transactional.
     * CREATE SCHEMA es DDL y en PostgreSQL no debe mezclarse con la gestión
     * de transacciones de Spring porque Flyway crea sus propias conexiones
     * y transacciones internas. Tener @Transactional aquí podía causar que
     * el schema quedara visible antes de que Flyway terminara, o que Flyway
     * fallara por conflictos de conexión/transacción activa.
     *
     * BUG FIX 2: Usa TenantIdentifierResolver.toSchemaName() como única
     * fuente de verdad para el nombre del schema, en lugar de duplicar
     * la lógica de normalización (que antes difería entre esta clase y el
     * resolver, causando que el schema se creara con un nombre y se buscara
     * con otro).
     */
    public void provisionTenant(String tenantId) {
        // Validar antes de cualquier operación
        validator.validate(tenantId);

        // Misma normalización que TenantIdentifierResolver usa en runtime
        String schemaName = TenantIdentifierResolver.toSchemaName(tenantId);

        // Crear schema (usa comillas dobles para seguridad)
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS \"" + schemaName + "\"");
        log.info("Schema '{}' creado o ya existente.", schemaName);

        // Correr Flyway sobre ese schema
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .schemas(schemaName)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .load();

        var result = flyway.migrate();
        log.info("Flyway: {} migraciones aplicadas en schema '{}'.", result.migrationsExecuted, schemaName);

        // Registrar en tabla pública
        jdbc.update(
                "INSERT INTO public.tenants (id, name, schema_name) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                tenantId, tenantId, schemaName
        );

        log.info("Tenant '{}' provisionado correctamente.", tenantId);
    }
}
