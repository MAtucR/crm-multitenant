package com.crm.multitenancy;

import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Provee conexiones JDBC cambiando el search_path de PostgreSQL
 * al schema del tenant activo. Hibernate 6 lo llama en cada
 * unidad de trabajo (transaction).
 */
@Component
public class TenantConnectionProvider implements MultiTenantConnectionProvider<String> {

    private final DataSource dataSource;

    public TenantConnectionProvider(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Connection getAnyConnection() throws SQLException {
        return dataSource.getConnection();
    }

    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }

    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        Connection connection = dataSource.getConnection();
        // Cambiar el schema activo de PostgreSQL
        try (var stmt = connection.createStatement()) {
            stmt.execute("SET search_path TO " + tenantIdentifier + ", public");
        }
        return connection;
    }

    @Override
    public void releaseConnection(String tenantIdentifier, Connection connection) throws SQLException {
        // Restaurar al schema público antes de devolver al pool
        try (var stmt = connection.createStatement()) {
            stmt.execute("SET search_path TO public");
        }
        connection.close();
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }
}
