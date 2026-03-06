package com.crm.multitenancy;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public void provisionTenant(String tenantId) {
        // Validar antes de cualquier operación
        validator.validate(tenantId);

        String schemaName = "tenant_" + tenantId.toLowerCase();

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
