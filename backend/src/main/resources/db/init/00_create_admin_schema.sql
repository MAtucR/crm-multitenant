-- Script ejecutado al iniciar PostgreSQL (docker-entrypoint-initdb.d)
-- Crea el schema 'public' para tablas de administración del sistema.

CREATE SCHEMA IF NOT EXISTS public;

-- Tabla de tenants registrados (usada por TenantProvisioningService)
CREATE TABLE IF NOT EXISTS public.tenants (
    id          VARCHAR(100) PRIMARY KEY,   -- ej: 'acme', 'globex'
    name        VARCHAR(255) NOT NULL,
    schema_name VARCHAR(100) NOT NULL UNIQUE,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datos de ejemplo
INSERT INTO public.tenants (id, name, schema_name) VALUES
    ('acme',   'Acme Corp',    'tenant_acme'),
    ('globex', 'Globex Inc',   'tenant_globex')
ON CONFLICT DO NOTHING;
