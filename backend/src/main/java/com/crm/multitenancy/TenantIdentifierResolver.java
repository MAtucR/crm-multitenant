package com.crm.multitenancy;

import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.stereotype.Component;

/**
 * Hibernate llama a este resolver antes de cada operación JPA
 * para saber qué schema usar. Devuelve el tenant del ThreadLocal.
 *
 * BUG FIX: El método toSchemaName() se extrae como estático y público
 * para que TenantProvisioningService use exactamente la misma lógica
 * de normalización. Antes, ambas clases tenían código duplicado con
 * posibles diferencias (p.ej. uno aplicaba replaceAll y el otro no),
 * pudiendo crear el schema con un nombre y luego buscarlo con otro.
 */
@Component
public class TenantIdentifierResolver implements CurrentTenantIdentifierResolver<String> {

    private static final String DEFAULT_SCHEMA = "public";

    /**
     * Única fuente de verdad para convertir un tenant_id en nombre de schema.
     * Ej: "AcmeCorp" → "tenant_acmecorp", "my-tenant" → "tenant_my_tenant"
     */
    public static String toSchemaName(String tenantId) {
        return "tenant_" + tenantId.toLowerCase().replaceAll("[^a-z0-9_]", "_");
    }

    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            return DEFAULT_SCHEMA;
        }
        return toSchemaName(tenantId);
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
