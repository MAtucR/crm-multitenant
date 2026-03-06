# CRM Multitenant SaaS

Arquitectura fullstack SaaS con multitenancy real (schema-per-tenant), observabilidad Dynatrace-ready y despliegue GitOps en k3s.

## Stack

| Capa | Tecnología |
|------|------------|
| Auth | Keycloak 24 (OIDC / JWT + claim `tenant_id`) |
| Frontend / BFF | Next.js 14 App Router |
| Backend | Spring Boot 3.3, Java 21, WebMVC |
| Multitenancy | Schema-per-Tenant (Hibernate 6) |
| Base de datos | PostgreSQL 16 |
| Observabilidad | Micrometer Tracing → OTLP → Dynatrace |
| Infraestructura | k3s + Traefik + Argo CD |

## Estructura del proyecto

```
crm-multitenant/
├── backend/                     # Spring Boot 3.3 (Java 21)
│   ├── Dockerfile               # Multi-stage build
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/crm/
│       │   ├── multitenancy/    # TenantContext, Resolver, Provider, Interceptor
│       │   ├── config/          # Security, Web (RestClient + trazas)
│       │   ├── domain/          # Entidades JPA: Contact, Deal
│       │   ├── repository/      # Spring Data JPA
│       │   └── controller/      # REST: /api/contacts, /api/deals
│       └── resources/
│           ├── application.yml  # Config principal
│           ├── logback-spring.xml  # JSON logging con traceId/spanId
│           └── db/
│               ├── init/           # SQL ejecutado al iniciar PostgreSQL
│               └── migration/      # Flyway por schema de tenant
├── frontend/                    # Next.js 14 (App Router)
│   ├── Dockerfile
│   ├── src/
│   │   ├── middleware.ts        # Genera traceparent W3C, protege rutas
│   │   ├── lib/auth.ts          # NextAuth + Keycloak
│   │   └── app/
│   │       ├── api/proxy/       # BFF proxy con propagación de JWT + traceparent
│   │       └── dashboard/       # RSC pages: contacts, deals
│   └── package.json
├── k8s/                         # Manifiestos Kubernetes
│   ├── namespace.yaml
│   ├── postgres/
│   ├── keycloak/
│   ├── backend/                 # Ingress wildcard *.api.crm.example.com
│   ├── frontend/
│   ├── middleware/              # Traefik Middleware para trace headers
│   └── argocd/
│       └── application.yaml     # Argo CD Application apuntando a /k8s
├── keycloak/
│   └── realm-export.json        # Realm CRM con usuarios, roles, mapper tenant_id
└── docker-compose.yml          # Stack completo local
```

## Cómo levantar localmente

```bash
docker compose up -d
```

| Servicio | URL |
|----------|-----|
| Keycloak | http://localhost:8080 (admin/admin) |
| Backend  | http://localhost:8081 |
| Frontend | http://localhost:3000 |

## Flujo de multitenancy (Schema-per-Tenant)

```
Usuario ──[OIDC]──► Keycloak ──[JWT + tenant_id claim]──► Frontend (Next.js)
                                                              │
                                          Bearer JWT + traceparent W3C
                                                              │
                                                              ▼
                                                  Backend (Spring Boot)
                                                      │
                                             TenantInterceptor
                                             extrae tenant_id del JWT
                                                      │
                                             TenantContext (ThreadLocal)
                                                      │
                                             TenantIdentifierResolver
                                             resuelve schema: tenant_acme
                                                      │
                                             TenantConnectionProvider
                                             SET search_path = tenant_acme
                                                      │
                                             PostgreSQL ──► schema tenant_acme
```

## Observabilidad (Dynatrace)

- **Trazas:** Micrometer Tracing + OTLP exporter → Dynatrace OTEL endpoint
- **Métricas:** Micrometer Prometheus → scrapeado con `metrics.dynatrace.com/scrape: 'true'`
- **Logs:** JSON estructurado con `traceId` y `spanId` en cada línea (logstash-logback-encoder)
- **Propagación W3C:** `traceparent` generado en Next.js middleware y propagado end-to-end

## Despliegue GitOps (Argo CD)

```bash
# Aplicar el Application resource de Argo CD
kubectl apply -f k8s/argocd/application.yaml -n argocd
```

Argo CD sincroniza automáticamente la carpeta `/k8s` al cluster k3s.
Cada push a `main` desencadena un sync con `selfHeal: true` y `prune: true`.

## Provisionar un nuevo tenant

```bash
curl -X POST https://api.acme.crm.example.com/api/admin/tenants/nuevotenant/provision \
  -H "Authorization: Bearer <JWT_ADMIN>"
```

Esto crea el schema `tenant_nuevotenant` en PostgreSQL y aplica todas las migraciones Flyway.
