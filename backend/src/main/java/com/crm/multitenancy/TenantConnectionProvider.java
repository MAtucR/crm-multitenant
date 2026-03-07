package com.crm.multitenancy;

import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

@Component
public class TenantConnectionProvider implements MultiTenantConnectionProvider<String> {

    private static final String SAFE_SCHEMA_PATTERN = "^[a-z0-9_]+$";
    private final DataSource dataSource;

    public TenantConnectionProvider(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // BUG FIX: Hibernate 6 requiere implementar unwrap() de org.hibernate.service.spi.Wrapped
    // Sin esto el proyecto no compila con Hibernate 6.x
    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        if (unwrapType.isAssignableFrom(getClass())) {
            return unwrapType.cast(this);
        }
        if (unwrapType.isAssignableFrom(dataSource.getClass())) {
            return unwrapType.cast(dataSource);
        }
        throw new IllegalArgumentException("Cannot unwrap to " + unwrapType.getName());
    }

    @Override
    public boolean isUnwrappableAs(Class<?> unwrapType) {
        return unwrapType.isAssignableFrom(getClass())
            || unwrapType.isAssignableFrom(dataSource.getClass());
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
        if (!tenantIdentifier.matches(SAFE_SCHEMA_PATTERN)) {
            throw new SQLException("Invalid tenant schema: " + tenantIdentifier);
        }
        Connection connection = dataSource.getConnection();
        try (var stmt = connection.createStatement()) {
            stmt.execute("SET search_path TO \"" + tenantIdentifier + "\", public");
        } catch (SQLException e) {
            connection.close();
            throw e;
        }
        return connection;
    }

    @Override
    public void releaseConnection(String tenantIdentifier, Connection connection) throws SQLException {
        try (var stmt = connection.createStatement()) {
            stmt.execute("SET search_path TO public");
        } catch (SQLException e) {
            connection.close();
            return;
        }
        connection.close();
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }
}
