package com.crm.controller;

import com.crm.multitenancy.TenantProvisioningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoint de administración para provisionar nuevos tenants.
 * Solo accesible con rol ADMIN (claim de Keycloak).
 */
@RestController
@RequestMapping("/api/admin/tenants")
@RequiredArgsConstructor
public class TenantAdminController {

    private final TenantProvisioningService provisioningService;

    @PostMapping("/{tenantId}/provision")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public void provision(@PathVariable String tenantId) {
        provisioningService.provisionTenant(tenantId);
    }
}
