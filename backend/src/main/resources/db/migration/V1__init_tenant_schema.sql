-- Flyway aplica esta migración en cada schema de tenant
-- Se ejecuta programáticamente desde TenantProvisioningService

CREATE TABLE IF NOT EXISTS contacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(50),
    company     VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    amount      NUMERIC(15,2),
    stage       VARCHAR(50) NOT NULL DEFAULT 'LEAD',
    contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
    closed_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(50) NOT NULL,   -- CALL, EMAIL, MEETING
    notes       TEXT,
    deal_id     UUID REFERENCES deals(id) ON DELETE CASCADE,
    contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_stage      ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_activities_deal  ON activities(deal_id);
