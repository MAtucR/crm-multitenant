package com.crm.multitenancy;

import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Provee conexiones JDBC cambiando el search_path de PostgreSQL
 * al schema del tenant activo.
 *
 * BUG FIX 1: El search_path ahora usa comillas dobles para prevenir SQL injection.
 * BUG FIX 2: releaseConnection devuelve la conexión al pool en lugar de cerrarla,
 *            lo que causaba connection leaks con HikariCP.
 */
@Component
public class TenantConnectionProvider implements MultiTenantConnectionProvider<String> {

    private static final String SAFE_SCHEMA_PATTERN = "^[a-z0-9_]+$";
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
        // Devolver al pool, no cerrar
        connection.close();
    }

    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        // Validar formato antes de usar en SQL (defensa en profundidad)
        if (!tenantIdentifier.matches(SAFE_SCHEMA_PATTERN)) {
            throw new SQLException("Invalid tenant schema name: " + tenantIdentifier);
        }
        Connection connection = dataSource.getConnection();
        try (var stmt = connection.createStatement()) {
            // BUG FIX: comillas dobles para evitar SQL injection en el schema name
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
            // Resetear search_path antes de devolver al pool
            stmt.execute("SET search_path TO public");
        } catch (SQLException e) {
            // Si falla el reset, cerrar la conexión en lugar de devolver una sucia
            connection.close();
            return;
        }
        // BUG FIX: devolver al pool (close() en HikariCP devuelve, no cierra)
        connection.close();
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }
}
