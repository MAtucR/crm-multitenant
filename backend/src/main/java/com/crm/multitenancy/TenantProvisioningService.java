package com.crm.multitenancy;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;

/**
 * Crea el schema de un nuevo tenant en PostgreSQL
 * y aplica las migraciones Flyway sobre ese schema.
 *
 * Uso: llamarlo al registrar un nuevo tenant en el sistema.
 */
@Service
public class TenantProvisioningService {

    private static final Logger log = LoggerFactory.getLogger(TenantProvisioningService.class);

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    public TenantProvisioningService(DataSource dataSource, JdbcTemplate jdbc) {
        this.dataSource = dataSource;
        this.jdbc = jdbc;
    }

    public void provisionTenant(String tenantId) {
        String schemaName = "tenant_" + tenantId.toLowerCase().replaceAll("[^a-z0-9_]", "_");

        // 1. Crear el schema si no existe
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);
        log.info("Schema '{}' creado o ya existente.", schemaName);

        // 2. Correr Flyway sobre ese schema
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .schemas(schemaName)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .load();

        flyway.migrate();
        log.info("Migraciones aplicadas en schema '{}'.", schemaName);

        // 3. Registrar el tenant en la tabla pública
        jdbc.update(
                "INSERT INTO public.tenants (id, name, schema_name) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                tenantId, tenantId, schemaName
        );
    }
}
