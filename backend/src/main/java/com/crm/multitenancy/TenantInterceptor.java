package com.crm.multitenancy;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Interceptor de Spring MVC que:
 * 1. Extrae el claim 'tenant_id' del JWT de Keycloak.
 * 2. Lo almacena en TenantContext para que Hibernate use el schema correcto.
 * 3. Lo limpia al terminar el request (afterCompletion).
 */
@Component
public class TenantInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(TenantInterceptor.class);
    private static final String TENANT_CLAIM = "tenant_id";

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {

        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            String tenantId = jwt.getClaimAsString(TENANT_CLAIM);
            if (tenantId != null && !tenantId.isBlank()) {
                TenantContext.setTenantId(tenantId);
                log.debug("Tenant activo: {}", tenantId);
            } else {
                log.warn("JWT sin claim '{}'. Usando schema public.", TENANT_CLAIM);
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler, Exception ex) {
        TenantContext.clear();
    }
}
