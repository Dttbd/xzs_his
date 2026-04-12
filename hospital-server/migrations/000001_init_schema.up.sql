-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. regions
CREATE TABLE IF NOT EXISTS regions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(50)  NOT NULL,
    status      SMALLINT     NOT NULL DEFAULT 1,
    sort_order  INTEGER      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_code ON regions (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_regions_deleted_at ON regions (deleted_at);

-- 2. provinces
CREATE TABLE IF NOT EXISTS provinces (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    region_id        UUID        NOT NULL REFERENCES regions(id),
    name             VARCHAR(100) NOT NULL,
    code             VARCHAR(50)  NOT NULL,
    default_handler  UUID,
    status           SMALLINT     NOT NULL DEFAULT 1,
    sort_order       INTEGER      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_provinces_code ON provinces (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_provinces_region_id ON provinces (region_id);
CREATE INDEX IF NOT EXISTS idx_provinces_deleted_at ON provinces (deleted_at);

-- 3. users
CREATE TABLE IF NOT EXISTS users (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    username       VARCHAR(100) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    real_name      VARCHAR(100) NOT NULL,
    phone          VARCHAR(20),
    email          VARCHAR(255),
    avatar_url     VARCHAR(500),
    region_id      UUID         REFERENCES regions(id),
    province_id    UUID         REFERENCES provinces(id),
    wechat_userid  VARCHAR(100),
    status         SMALLINT     NOT NULL DEFAULT 1,
    last_login_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_region_id ON users (region_id);
CREATE INDEX IF NOT EXISTS idx_users_province_id ON users (province_id);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);

-- 4. roles
CREATE TABLE IF NOT EXISTS roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(50)  NOT NULL,
    description VARCHAR(500),
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    status      SMALLINT     NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_code ON roles (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles (deleted_at);

-- 5. user_roles (many2many join table)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id  UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

-- 6. hospital_categories (self-referencing)
CREATE TABLE IF NOT EXISTS hospital_categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(50)  NOT NULL,
    parent_id   UUID         REFERENCES hospital_categories(id),
    sort_order  INTEGER      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hospital_categories_code ON hospital_categories (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hospital_categories_parent_id ON hospital_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_hospital_categories_deleted_at ON hospital_categories (deleted_at);

-- 7. hospitals
CREATE TABLE IF NOT EXISTS hospitals (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    name             VARCHAR(200) NOT NULL,
    code             VARCHAR(50)  NOT NULL,
    category_id      UUID         REFERENCES hospital_categories(id),
    level            VARCHAR(50),
    province_id      UUID         REFERENCES provinces(id),
    city             VARCHAR(100),
    address          VARCHAR(500),
    contact_name     VARCHAR(100),
    contact_phone    VARCHAR(20),
    contact_email    VARCHAR(255),
    bed_count        INTEGER      NOT NULL DEFAULT 0,
    department_count INTEGER      NOT NULL DEFAULT 0,
    is_specialized   BOOLEAN      NOT NULL DEFAULT FALSE,
    specialty_type   VARCHAR(100),
    owner_user_id    UUID         REFERENCES users(id),
    status           SMALLINT     NOT NULL DEFAULT 1,
    remark           TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hospitals_code ON hospitals (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hospitals_category_id ON hospitals (category_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_province_id ON hospitals (province_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_owner_user_id ON hospitals (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_deleted_at ON hospitals (deleted_at);

-- 8. field_definitions
CREATE TABLE IF NOT EXISTS field_definitions (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    field_key      VARCHAR(100) NOT NULL,
    field_name     VARCHAR(100) NOT NULL,
    field_type     VARCHAR(50)  NOT NULL,
    options        JSONB,
    is_required    BOOLEAN      NOT NULL DEFAULT FALSE,
    is_filterable  BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order     INTEGER      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_definitions_field_key ON field_definitions (field_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_field_definitions_deleted_at ON field_definitions (deleted_at);

-- 9. hospital_fields
CREATE TABLE IF NOT EXISTS hospital_fields (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id  UUID        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    field_key    VARCHAR(100) NOT NULL,
    field_value  TEXT
);
CREATE INDEX IF NOT EXISTS idx_hospital_fields_hospital_id ON hospital_fields (hospital_id);

-- 10. ticket_types
CREATE TABLE IF NOT EXISTS ticket_types (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(50)  NOT NULL,
    icon        VARCHAR(100),
    description VARCHAR(500),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INTEGER      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_types_code ON ticket_types (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_types_deleted_at ON ticket_types (deleted_at);

-- 11. ticket_statuses
CREATE TABLE IF NOT EXISTS ticket_statuses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(50)  NOT NULL,
    color       VARCHAR(50),
    is_initial  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_terminal BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order  INTEGER      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_statuses_code ON ticket_statuses (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_statuses_deleted_at ON ticket_statuses (deleted_at);

-- 12. ticket_transitions
CREATE TABLE IF NOT EXISTS ticket_transitions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    from_status_id  UUID        NOT NULL REFERENCES ticket_statuses(id),
    to_status_id    UUID        NOT NULL REFERENCES ticket_statuses(id),
    name            VARCHAR(100) NOT NULL,
    allowed_roles   JSONB
);
CREATE INDEX IF NOT EXISTS idx_ticket_transitions_from_status_id ON ticket_transitions (from_status_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transitions_to_status_id ON ticket_transitions (to_status_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transitions_deleted_at ON ticket_transitions (deleted_at);

-- 13. tickets
CREATE TABLE IF NOT EXISTS tickets (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    ticket_no    VARCHAR(50)  NOT NULL,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    type_id      UUID         NOT NULL REFERENCES ticket_types(id),
    status_id    UUID         NOT NULL REFERENCES ticket_statuses(id),
    priority     SMALLINT     NOT NULL DEFAULT 0,
    hospital_id  UUID         REFERENCES hospitals(id),
    creator_id   UUID         NOT NULL REFERENCES users(id),
    assignee_id  UUID         REFERENCES users(id),
    province_id  UUID         REFERENCES provinces(id),
    region_id    UUID         REFERENCES regions(id),
    resolved_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_ticket_no ON tickets (ticket_no) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_type_id ON tickets (type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_id ON tickets (status_id);
CREATE INDEX IF NOT EXISTS idx_tickets_hospital_id ON tickets (hospital_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON tickets (creator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_province_id ON tickets (province_id);
CREATE INDEX IF NOT EXISTS idx_tickets_region_id ON tickets (region_id);
CREATE INDEX IF NOT EXISTS idx_tickets_deleted_at ON tickets (deleted_at);

-- 14. ticket_comments
CREATE TABLE IF NOT EXISTS ticket_comments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    ticket_id    UUID         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES users(id),
    content      TEXT         NOT NULL,
    is_internal  BOOLEAN      NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_deleted_at ON ticket_comments (deleted_at);

-- 15. ticket_attachments
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    ticket_id    UUID         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    comment_id   UUID         REFERENCES ticket_comments(id),
    file_name    VARCHAR(255) NOT NULL,
    file_url     VARCHAR(500) NOT NULL,
    file_size    BIGINT       NOT NULL DEFAULT 0,
    file_type    VARCHAR(100),
    uploader_id  UUID         NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_comment_id ON ticket_attachments (comment_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_deleted_at ON ticket_attachments (deleted_at);

-- 16. ticket_logs
CREATE TABLE IF NOT EXISTS ticket_logs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    ticket_id    UUID         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES users(id),
    action       VARCHAR(50)  NOT NULL,
    from_status  VARCHAR(50),
    to_status    VARCHAR(50),
    detail       JSONB
);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket_id ON ticket_logs (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_deleted_at ON ticket_logs (deleted_at);

-- 17. bulletins
CREATE TABLE IF NOT EXISTS bulletins (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    title        VARCHAR(200) NOT NULL,
    content      TEXT,
    scope_type   VARCHAR(20)  NOT NULL,
    scope_id     UUID         NOT NULL,
    author_id    UUID         NOT NULL REFERENCES users(id),
    is_pinned    BOOLEAN      NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    status       SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bulletins_scope_id ON bulletins (scope_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_deleted_at ON bulletins (deleted_at);

-- 18. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    content     TEXT,
    type        VARCHAR(50)  NOT NULL,
    ref_type    VARCHAR(50),
    ref_id      UUID,
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications (deleted_at);
