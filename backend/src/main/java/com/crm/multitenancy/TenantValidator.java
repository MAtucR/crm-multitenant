package com.crm.multitenancy;

import org.springframework.stereotype.Component;

/**
 * Valida que un tenant_id sea seguro antes de usarlo como schema name.
 * Previene path traversal, SQL injection y nombres reservados de PostgreSQL.
 */
@Component
public class TenantValidator {

    private static final String SAFE_PATTERN = "^[a-z0-9][a-z0-9_]{1,48}[a-z0-9]$";

    private static final java.util.Set<String> RESERVED = java.util.Set.of(
            "public", "pg_catalog", "information_schema", "pg_toast",
            "admin", "root", "postgres"
    );

    public void validate(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalArgumentException("tenant_id no puede ser vacío");
        }
        if (!tenantId.matches(SAFE_PATTERN)) {
            throw new IllegalArgumentException(
                    "tenant_id inválido. Solo letras minúsculas, números y guiones bajos (3-50 chars): " + tenantId);
        }
        if (RESERVED.contains(tenantId.toLowerCase())) {
            throw new IllegalArgumentException("tenant_id reservado: " + tenantId);
        }
    }

    public boolean isValid(String tenantId) {
        try {
            validate(tenantId);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
