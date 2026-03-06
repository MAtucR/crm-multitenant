package com.crm.config;

import com.crm.multitenancy.TenantConnectionProvider;
import com.crm.multitenancy.TenantIdentifierResolver;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * BUG FIX: Hibernate 6 requiere que TenantIdentifierResolver y
 * MultiTenantConnectionProvider se registren como beans de Spring,
 * no como nombres de clase en application.yml.
 *
 * Usar strings en yaml (hibernate.tenant_identifier_resolver: com.crm...)
 * causa ClassNotFoundException o ignora la config silenciosamente en SB 3.x.
 */
@Configuration
public class HibernateConfig {

    private final TenantConnectionProvider tenantConnectionProvider;
    private final TenantIdentifierResolver tenantIdentifierResolver;

    public HibernateConfig(TenantConnectionProvider tenantConnectionProvider,
                           TenantIdentifierResolver tenantIdentifierResolver) {
        this.tenantConnectionProvider = tenantConnectionProvider;
        this.tenantIdentifierResolver = tenantIdentifierResolver;
    }

    @Bean
    public HibernatePropertiesCustomizer hibernateMultitenancyCustomizer() {
        return properties -> {
            properties.put(AvailableSettings.MULTI_TENANT_CONNECTION_PROVIDER, tenantConnectionProvider);
            properties.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, tenantIdentifierResolver);
        };
    }
}
