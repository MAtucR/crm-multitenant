package com.crm.multitenancy;

/**
 * Almacena el tenant_id actual en un ThreadLocal.
 * Se limpia al final de cada request mediante TenantInterceptor.
 *
 * BUG FIX: Cambiado de InheritableThreadLocal a ThreadLocal.
 * InheritableThreadLocal hereda el valor del thread padre a los hijos.
 * En un thread pool de servidor (Tomcat/Undertow), los threads se reusan:
 * cuando un thread del pool crea un child thread (p.ej. @Async, parallel streams),
 * el child hereda el tenant_id del request que estaba procesando el padre en ese
 * momento — que puede ser de OTRO tenant. Esto causa cross-tenant data leakage.
 * ThreadLocal es el tipo correcto: cada thread tiene su propio valor, aislado.
 */
public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {}

    public static void setTenantId(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static String getTenantId() {
        return CURRENT_TENANT.get();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
