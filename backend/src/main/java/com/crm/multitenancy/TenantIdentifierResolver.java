package com.crm.multitenancy;

import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.stereotype.Component;

/**
 * Hibernate llama a este resolver antes de cada operación JPA
 * para saber qué schema usar. Devuelve el tenant del ThreadLocal.
 */
@Component
public class TenantIdentifierResolver implements CurrentTenantIdentifierResolver<String> {

    private static final String DEFAULT_SCHEMA = "public";

    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            return DEFAULT_SCHEMA;
        }
        // Cada tenant tiene un schema llamado tenant_<id>
        return "tenant_" + tenantId.toLowerCase().replaceAll("[^a-z0-9_]", "_");
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
