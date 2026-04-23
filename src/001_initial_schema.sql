-- =============================================================================
-- 001_initial_schema.sql
-- מערכת ניהול דיירים וגבייה - בניין אלמוג
-- Supabase / PostgreSQL dialect
-- =============================================================================

-- הפעלת הרחבות
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE app_user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER');
CREATE TYPE role_color AS ENUM ('blue','green','purple','orange','red','pink','yellow','indigo');
CREATE TYPE resident_type AS ENUM ('owner','tenant','operator');
CREATE TYPE whatsapp_sync_status AS ENUM ('pending','synced','no_avatar','unavailable','failed');
CREATE TYPE debt_status_auto AS ENUM ('תקין','לגבייה מיידית','חריגה מופרזת');
CREATE TYPE legal_status_source AS ENUM ('AUTO_DEFAULT','MANUAL','IMPORT','SYSTEM_FIX');
CREATE TYPE import_run_status AS ENUM ('RUNNING','SUCCESS','PARTIAL','FAILED');
CREATE TYPE import_mode AS ENUM ('fill_missing','reset');
CREATE TYPE status_type AS ENUM ('LEGAL','GENERAL');
CREATE TYPE legal_status_history_source AS ENUM ('AUTO_DEFAULT','MANUAL','IMPORT','SYSTEM_FIX');
CREATE TYPE task_priority AS ENUM ('low','high','urgent');
CREATE TYPE task_status AS ENUM ('open','in_progress','resolved');
CREATE TYPE task_target_type AS ENUM ('room','area');
CREATE TYPE chat_direction AS ENUM ('sent','received');
CREATE TYPE chat_message_type AS ENUM ('text','image','document');
CREATE TYPE chat_link_status AS ENUM ('linked','unlinked');
CREATE TYPE notification_type AS ENUM (
  'task_assigned','task_reassigned','task_due_today','task_due_tomorrow',
  'task_due_overdue','task_pro_assigned','task_pro_reassigned','task_pro_completed',
  'task_pro_due_today','task_pro_due_tomorrow','task_pro_due_overdue',
  'appointment_due_today','appointment_due_tomorrow','appointment_assigned',
  'appointment_updated','whatsapp_message_received','whatsapp_message_received_unlinked',
  'issue_created','issue_assigned','issue_status_changed','issue_resolved',
  'issue_urgent_created','internal_chat_message_received','internal_chat_mention'
);
CREATE TYPE notification_source_module AS ENUM ('tasks','calendar','whatsapp','issues','internal_chat');
CREATE TYPE notification_priority AS ENUM ('low','normal','high','urgent');
CREATE TYPE appointment_type AS ENUM ('פגישה','משימה','אחר');
CREATE TYPE calendar_event_status AS ENUM ('scheduled','completed','cancelled');
CREATE TYPE calendar_event_kind AS ENUM ('meeting','event');
CREATE TYPE calendar_event_recurrence_type AS ENUM ('weekly','monthly','yearly');
CREATE TYPE calendar_event_recurrence_end_type AS ENUM ('never','until_date','count');
CREATE TYPE calendar_event_source_type AS ENUM ('manual','generated_occurrence');
CREATE TYPE calendar_participant_source AS ENUM ('user','resident','supplier');
CREATE TYPE calendar_attendance_status AS ENUM ('pending','accepted','declined','tentative');
CREATE TYPE task_audit_action AS ENUM ('created','updated');

-- =============================================================================
-- HELPER: updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE: roles
-- =============================================================================

CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT,

  name          TEXT NOT NULL,
  description   TEXT,
  color         role_color NOT NULL DEFAULT 'blue',
  accessible_pages  TEXT[] NOT NULL DEFAULT '{}',
  can_edit_records  BOOLEAN NOT NULL DEFAULT FALSE,
  can_add_records   BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete_records BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: app_users
-- =============================================================================

CREATE TABLE app_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT,

  first_name    TEXT NOT NULL,
  last_name     TEXT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT,
  password_hash TEXT NOT NULL,
  role          app_user_role NOT NULL DEFAULT 'VIEWER',
  role_id       UUID REFERENCES roles(id) ON DELETE SET NULL,
  department    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  base44_user_invited BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_app_users_username ON app_users(username);
CREATE INDEX idx_app_users_role_id  ON app_users(role_id);

CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: statuses
-- =============================================================================

CREATE TABLE statuses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT,

  name          TEXT NOT NULL,
  type          status_type NOT NULL DEFAULT 'GENERAL',
  description   TEXT,
  color         TEXT NOT NULL DEFAULT 'bg-slate-100 text-slate-700',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  notification_emails TEXT
);

-- constraint: רק סטטוס אחד מסוג LEGAL יכול להיות ברירת מחדל
CREATE UNIQUE INDEX idx_statuses_one_legal_default
  ON statuses(type) WHERE (type = 'LEGAL' AND is_default = TRUE);

CREATE TRIGGER trg_statuses_updated_at
  BEFORE UPDATE ON statuses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: contacts
-- =============================================================================

CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT,

  apartment_number  TEXT NOT NULL UNIQUE,
  owner_name        TEXT,
  owner_phone       TEXT,
  owner_email       TEXT,
  tenant_name       TEXT,
  tenant_phone      TEXT,
  tenant_email      TEXT,
  contact_type      TEXT,   -- legacy
  resident_type     resident_type NOT NULL DEFAULT 'owner',
  operator_id       UUID,   -- FK -> operators (not in initial schema)
  owner_is_primary_contact    BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_is_primary_contact   BOOLEAN NOT NULL DEFAULT FALSE,
  operator_is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
  address           TEXT,
  notes             TEXT,
  management_fees   NUMERIC(12,2),
  tags              TEXT[] NOT NULL DEFAULT '{}',
  whatsapp_profile_image      TEXT,
  whatsapp_profile_image_url  TEXT,
  whatsapp_profile_sync_status whatsapp_sync_status,
  whatsapp_profile_last_synced_at TIMESTAMPTZ,
  whatsapp_profile_sync_error TEXT,
  last_whatsapp_sent_at       TIMESTAMPTZ
);

CREATE INDEX idx_contacts_apartment_number ON contacts(apartment_number);
CREATE INDEX idx_contacts_owner_phone      ON contacts(owner_phone);
CREATE INDEX idx_contacts_tenant_phone     ON contacts(tenant_phone);

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: debtor_records
-- =============================================================================

CREATE TABLE debtor_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT,

  apartment_number TEXT NOT NULL,
  owner_name       TEXT,
  phone_owner      TEXT,
  phone_tenant     TEXT,
  phone_primary    TEXT,
  phones_raw       TEXT,
  phones_manual_override BOOLEAN NOT NULL DEFAULT FALSE,

  total_debt       NUMERIC(14,2) NOT NULL DEFAULT 0,
  monthly_debt     NUMERIC(14,2) NOT NULL DEFAULT 0,
  special_debt     NUMERIC(14,2) NOT NULL DEFAULT 0,
  details_monthly  TEXT,
  details_special  TEXT,
  management_months_raw TEXT,
  months_in_arrears NUMERIC(6,1),

  debt_status_auto  debt_status_auto NOT NULL DEFAULT 'תקין',
  legal_status_id   UUID REFERENCES statuses(id) ON DELETE SET NULL,
  legal_status_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  legal_status_updated_at TIMESTAMPTZ,
  legal_status_updated_by TEXT,
  legal_status_source     legal_status_source NOT NULL DEFAULT 'AUTO_DEFAULT',
  legal_status_lock       BOOLEAN NOT NULL DEFAULT FALSE,
  legal_status_manual     TEXT,  -- deprecated

  notes             TEXT,
  last_contact_date DATE,
  next_action_date  DATE,

  imported_this_run    BOOLEAN NOT NULL DEFAULT FALSE,
  last_import_run_id   TEXT,
  last_import_at       TIMESTAMPTZ,
  flagged_as_cleared   BOOLEAN NOT NULL DEFAULT FALSE,
  cleared_at           TIMESTAMPTZ,
  source_row_hash      TEXT,
  is_archived          BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT chk_total_debt_non_negative CHECK (total_debt >= 0)
);

CREATE UNIQUE INDEX idx_debtor_records_apartment_active
  ON debtor_records(apartment_number) WHERE is_archived = FALSE;

CREATE INDEX idx_debtor_records_legal_status ON debtor_records(legal_status_id);
CREATE INDEX idx_debtor_records_debt_status  ON debtor_records(debt_status_auto);
CREATE INDEX idx_debtor_records_is_archived  ON debtor_records(is_archived);
CREATE INDEX idx_debtor_records_next_action  ON debtor_records(next_action_date);

CREATE TRIGGER trg_debtor_records_updated_at
  BEFORE UPDATE ON debtor_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: legal_status_history
-- =============================================================================

CREATE TABLE legal_status_history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT,

  debtor_record_id UUID NOT NULL REFERENCES debtor_records(id) ON DELETE CASCADE,
  apartment_number TEXT,
  old_status_id    UUID REFERENCES statuses(id) ON DELETE SET NULL,
  old_status_name  TEXT,
  new_status_id    UUID NOT NULL REFERENCES statuses(id) ON DELETE RESTRICT,
  new_status_name  TEXT,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by       TEXT,
  source           legal_status_history_source NOT NULL DEFAULT 'MANUAL',
  notes            TEXT
);

CREATE INDEX idx_legal_history_debtor    ON legal_status_history(debtor_record_id);
CREATE INDEX idx_legal_history_changed_at ON legal_status_history(changed_at DESC);

CREATE TRIGGER trg_legal_history_updated_at
  BEFORE UPDATE ON legal_status_history
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: import_runs
-- =============================================================================

CREATE TABLE import_runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT,

  import_run_id    TEXT NOT NULL UNIQUE,
  file_name        TEXT,
  started_at       TIMESTAMPTZ NOT NULL,
  finished_at      TIMESTAMPTZ,
  status           import_run_status NOT NULL DEFAULT 'RUNNING',
  stage            TEXT,
  import_mode      import_mode,

  total_rows_read     INT NOT NULL DEFAULT 0,
  unique_apartments   INT NOT NULL DEFAULT 0,
  success_rows_count  INT NOT NULL DEFAULT 0,
  created_count       INT NOT NULL DEFAULT 0,
  updated_count       INT NOT NULL DEFAULT 0,
  failed_rows_count   INT NOT NULL DEFAULT 0,
  skipped_rows_count  INT NOT NULL DEFAULT 0,
  cleared_count       INT NOT NULL DEFAULT 0,
  invalid_monthly_count INT NOT NULL DEFAULT 0,
  invalid_special_count INT NOT NULL DEFAULT 0,

  error_summary    TEXT,
  error_details    JSONB NOT NULL DEFAULT '[]',
  qa_validation    BOOLEAN,
  qa_delta         NUMERIC(14,2)
);

CREATE INDEX idx_import_runs_started_at ON import_runs(started_at DESC);
CREATE INDEX idx_import_runs_status     ON import_runs(status);

CREATE TRIGGER trg_import_runs_updated_at
  BEFORE UPDATE ON import_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: comments
-- =============================================================================

CREATE TABLE comments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT,

  debtor_record_id UUID NOT NULL REFERENCES debtor_records(id) ON DELETE CASCADE,
  apartment_number TEXT,
  content          TEXT NOT NULL,
  author_name      TEXT NOT NULL,
  author_email     TEXT
);

CREATE INDEX idx_comments_debtor_record ON comments(debtor_record_id);
CREATE INDEX idx_comments_created_at    ON comments(created_at DESC);

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: tasks
-- =============================================================================

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT,

  title           TEXT NOT NULL,
  description     TEXT,
  target_type     task_target_type NOT NULL DEFAULT 'room',
  target_id       TEXT NOT NULL,
  priority        task_priority NOT NULL DEFAULT 'low',
  status          task_status NOT NULL DEFAULT 'open',
  reporter_email  TEXT,
  assigned_to     TEXT,
  images          TEXT[] NOT NULL DEFAULT '{}',
  videos          TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  history         JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_tasks_status      ON tasks(status);
CREATE INDEX idx_tasks_priority    ON tasks(priority);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_target_id   ON tasks(target_id);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: task_audit_logs
-- =============================================================================

CREATE TABLE task_audit_logs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           TEXT,

  task_id              UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action               task_audit_action NOT NULL,
  changed_by_username  TEXT NOT NULL,
  changed_by_name      TEXT,
  changes              TEXT  -- JSON string
);

CREATE INDEX idx_task_audit_task_id ON task_audit_logs(task_id);

CREATE TRIGGER trg_task_audit_updated_at
  BEFORE UPDATE ON task_audit_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: whatsapp_templates
-- =============================================================================

CREATE TABLE whatsapp_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  TEXT,

  name        TEXT NOT NULL UNIQUE,
  content     TEXT NOT NULL
);

CREATE TRIGGER trg_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: chat_messages
-- =============================================================================

CREATE TABLE chat_messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT,

  contact_id          UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_phone       TEXT NOT NULL,
  sender_chat_id      TEXT,
  sender_phone_raw    TEXT,
  external_message_id TEXT UNIQUE,
  link_status         chat_link_status NOT NULL DEFAULT 'linked',
  direction           chat_direction NOT NULL,
  message_type        chat_message_type NOT NULL,
  content             TEXT,
  timestamp           TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_chat_messages_contact_id    ON chat_messages(contact_id);
CREATE INDEX idx_chat_messages_contact_phone ON chat_messages(contact_phone);
CREATE INDEX idx_chat_messages_timestamp     ON chat_messages(timestamp DESC);
CREATE INDEX idx_chat_messages_direction     ON chat_messages(direction);
CREATE INDEX idx_chat_messages_link_status   ON chat_messages(link_status);

CREATE TRIGGER trg_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: notifications
-- =============================================================================

CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT,

  user_username       TEXT NOT NULL,
  type                notification_type NOT NULL,
  title               TEXT,
  message             TEXT NOT NULL,
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  source_module       notification_source_module,
  source_entity_type  TEXT,
  source_entity_id    TEXT,
  action_url          TEXT,
  priority            notification_priority NOT NULL DEFAULT 'normal',
  dedupe_key          TEXT UNIQUE,
  task_id             TEXT,
  task_pro_id         TEXT,
  task_type           TEXT,
  assigner_name       TEXT
);

CREATE INDEX idx_notifications_user_username ON notifications(user_username);
CREATE INDEX idx_notifications_is_read       ON notifications(is_read);
CREATE INDEX idx_notifications_created_at    ON notifications(created_at DESC);

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: appointments
-- =============================================================================

CREATE TABLE appointments (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         TEXT,

  title              TEXT NOT NULL,
  appointment_type   appointment_type NOT NULL DEFAULT 'פגישה',
  attendees_users    JSONB NOT NULL DEFAULT '[]',
  attendees_contacts TEXT[] NOT NULL DEFAULT '{}',
  date               DATE NOT NULL,
  start_time         TEXT NOT NULL,
  end_time           TEXT NOT NULL,
  start_datetime     TIMESTAMPTZ,
  end_datetime       TIMESTAMPTZ,
  is_recurring       BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern TEXT,
  recurrence_interval INT NOT NULL DEFAULT 1,
  recurrence_count   INT,
  series_id          TEXT,
  series_occurrence_number INT,
  is_exception       BOOLEAN NOT NULL DEFAULT FALSE,
  location           TEXT,
  reminder_before    TEXT,
  reminder_method    TEXT NOT NULL DEFAULT 'email',
  event_color        TEXT,
  description        TEXT,
  attachments        TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_appointments_date      ON appointments(date);
CREATE INDEX idx_appointments_series_id ON appointments(series_id);

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: calendar_events
-- =============================================================================

CREATE TABLE calendar_events (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             TEXT,

  title                  TEXT NOT NULL,
  item_kind              calendar_event_kind NOT NULL DEFAULT 'meeting',
  meeting_type           TEXT,
  event_date             DATE NOT NULL,
  start_datetime         TIMESTAMPTZ,
  end_datetime           TIMESTAMPTZ,
  is_all_day             BOOLEAN NOT NULL DEFAULT FALSE,
  location               TEXT,
  reminder_offset_minutes INT,
  reminder_channel       TEXT NOT NULL DEFAULT 'none',
  color_key              TEXT,
  description            TEXT,
  recurrence_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type        calendar_event_recurrence_type,
  recurrence_interval    INT NOT NULL DEFAULT 1,
  recurrence_end_type    calendar_event_recurrence_end_type NOT NULL DEFAULT 'never',
  recurrence_until_date  DATE,
  recurrence_count       INT,
  parent_series_id       UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  source_type            calendar_event_source_type NOT NULL DEFAULT 'manual',
  status                 calendar_event_status NOT NULL DEFAULT 'scheduled',
  owner_user_id          TEXT,
  owner_user_name        TEXT
);

CREATE INDEX idx_calendar_events_event_date     ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_status         ON calendar_events(status);
CREATE INDEX idx_calendar_events_parent_series  ON calendar_events(parent_series_id);

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: calendar_event_participants
-- =============================================================================

CREATE TABLE calendar_event_participants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT,

  calendar_event_id   UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  participant_source  calendar_participant_source NOT NULL,
  participant_id      TEXT NOT NULL,
  display_name_cache  TEXT,
  email_cache         TEXT,
  phone_cache         TEXT,
  attendance_status   calendar_attendance_status NOT NULL DEFAULT 'pending',

  CONSTRAINT uq_event_participant UNIQUE (calendar_event_id, participant_source, participant_id)
);

CREATE INDEX idx_cal_participants_event ON calendar_event_participants(calendar_event_id);

CREATE TRIGGER trg_cal_participants_updated_at
  BEFORE UPDATE ON calendar_event_participants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: settings (singleton - יש רשומה אחת בלבד)
-- =============================================================================

CREATE TABLE settings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        TEXT,

  threshold_ok_max          NUMERIC(12,2) NOT NULL DEFAULT 1000,
  threshold_collect_from    NUMERIC(12,2) NOT NULL DEFAULT 1500,
  threshold_legal_from      NUMERIC(12,2) NOT NULL DEFAULT 5000,
  make_enabled              BOOLEAN NOT NULL DEFAULT FALSE,
  make_webhook_status_change_url          TEXT,
  make_webhook_new_lawsuit_candidate_url  TEXT,
  make_webhook_new_record_url             TEXT,
  building_name             TEXT NOT NULL DEFAULT 'בניין אלמוג',
  building_address          TEXT NOT NULL DEFAULT 'דוד אלעזר 10, חיפה',
  last_import_at            TIMESTAMPTZ,
  green_api_instance_id     TEXT,
  green_api_token           TEXT,
  resend_api_key            TEXT,
  gmail_sender_email        TEXT DEFAULT 'ronen.yeadim@gmail.com',

  CONSTRAINT chk_settings_singleton CHECK (id IS NOT NULL),
  CONSTRAINT chk_threshold_order CHECK (
    threshold_ok_max > 0 AND
    threshold_collect_from > threshold_ok_max AND
    threshold_legal_from > threshold_collect_from
  )
);

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- הערה: המערכת משתמשת ב-AppUser פנימי + localStorage session.
-- ב-Supabase יש להעביר את username/role דרך JWT custom claims
-- או דרך פונקציית helper: current_setting('app.current_user_role').
-- כל הפוליסות להלן מניחות שה-role מועבר כ-custom claim בטוקן.

-- Helper functions
CREATE OR REPLACE FUNCTION current_app_role() RETURNS TEXT AS $$
  SELECT COALESCE(current_setting('app.current_user_role', TRUE), 'VIEWER');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_app_username() RETURNS TEXT AS $$
  SELECT COALESCE(current_setting('app.current_username', TRUE), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_super() RETURNS BOOLEAN AS $$
  SELECT current_app_role() IN ('ADMIN', 'SUPER_ADMIN');
$$ LANGUAGE sql STABLE;

-- ---- app_users ----
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_users_select_self_or_admin"
  ON app_users FOR SELECT
  USING (
    is_admin_or_super()
    OR username = current_app_username()
  );

CREATE POLICY "app_users_insert_admin_only"
  ON app_users FOR INSERT
  WITH CHECK (is_admin_or_super());

CREATE POLICY "app_users_update_admin_or_self"
  ON app_users FOR UPDATE
  USING (is_admin_or_super() OR username = current_app_username())
  WITH CHECK (is_admin_or_super() OR username = current_app_username());

CREATE POLICY "app_users_delete_super_only"
  ON app_users FOR DELETE
  USING (current_app_role() = 'SUPER_ADMIN');

-- ---- roles ----
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_all"
  ON roles FOR SELECT USING (TRUE);

CREATE POLICY "roles_insert_super_only"
  ON roles FOR INSERT WITH CHECK (current_app_role() = 'SUPER_ADMIN');

CREATE POLICY "roles_update_super_only"
  ON roles FOR UPDATE USING (current_app_role() = 'SUPER_ADMIN');

CREATE POLICY "roles_delete_super_only"
  ON roles FOR DELETE USING (current_app_role() = 'SUPER_ADMIN');

-- ---- statuses ----
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "statuses_select_all"
  ON statuses FOR SELECT USING (TRUE);

CREATE POLICY "statuses_write_admin"
  ON statuses FOR INSERT WITH CHECK (is_admin_or_super());

CREATE POLICY "statuses_update_admin"
  ON statuses FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "statuses_delete_super"
  ON statuses FOR DELETE USING (current_app_role() = 'SUPER_ADMIN');

-- ---- contacts ----
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select_all_roles"
  ON contacts FOR SELECT USING (TRUE);

CREATE POLICY "contacts_insert_admin"
  ON contacts FOR INSERT WITH CHECK (is_admin_or_super());

CREATE POLICY "contacts_update_admin"
  ON contacts FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "contacts_delete_admin"
  ON contacts FOR DELETE USING (is_admin_or_super());

-- ---- debtor_records ----
ALTER TABLE debtor_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debtor_records_select_all"
  ON debtor_records FOR SELECT USING (TRUE);

CREATE POLICY "debtor_records_insert_admin"
  ON debtor_records FOR INSERT WITH CHECK (is_admin_or_super());

CREATE POLICY "debtor_records_update_admin"
  ON debtor_records FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "debtor_records_delete_super"
  ON debtor_records FOR DELETE USING (current_app_role() = 'SUPER_ADMIN');

-- ---- legal_status_history ----
ALTER TABLE legal_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lsh_select_all"
  ON legal_status_history FOR SELECT USING (TRUE);

CREATE POLICY "lsh_insert_admin"
  ON legal_status_history FOR INSERT WITH CHECK (is_admin_or_super());

CREATE POLICY "lsh_update_admin"
  ON legal_status_history FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "lsh_delete_super"
  ON legal_status_history FOR DELETE USING (current_app_role() = 'SUPER_ADMIN');

-- ---- import_runs ----
ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_runs_select_all"
  ON import_runs FOR SELECT USING (TRUE);

CREATE POLICY "import_runs_write_admin"
  ON import_runs FOR INSERT WITH CHECK (is_admin_or_super());

CREATE POLICY "import_runs_update_admin"
  ON import_runs FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "import_runs_delete_super"
  ON import_runs FOR DELETE USING (current_app_role() = 'SUPER_ADMIN');

-- ---- comments ----
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_all"
  ON comments FOR SELECT USING (TRUE);

CREATE POLICY "comments_insert_all_roles"
  ON comments FOR INSERT WITH CHECK (current_app_role() IN ('SUPER_ADMIN','ADMIN','VIEWER'));

CREATE POLICY "comments_update_admin"
  ON comments FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "comments_delete_admin"
  ON comments FOR DELETE USING (is_admin_or_super());

-- ---- tasks ----
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_all"
  ON tasks FOR SELECT USING (TRUE);

CREATE POLICY "tasks_insert_all"
  ON tasks FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "tasks_update_admin"
  ON tasks FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "tasks_delete_admin"
  ON tasks FOR DELETE USING (is_admin_or_super());

-- ---- task_audit_logs ----
ALTER TABLE task_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_audit_select_all"
  ON task_audit_logs FOR SELECT USING (TRUE);

CREATE POLICY "task_audit_insert_all"
  ON task_audit_logs FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "task_audit_update_admin"
  ON task_audit_logs FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "task_audit_delete_super"
  ON task_audit_logs FOR DELETE USING (current_app_role() = 'SUPER_ADMIN');

-- ---- whatsapp_templates ----
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_templates_select_all"
  ON whatsapp_templates FOR SELECT USING (TRUE);

CREATE POLICY "wa_templates_write_admin"
  ON whatsapp_templates FOR INSERT WITH CHECK (is_admin_or_super());

CREATE POLICY "wa_templates_update_admin"
  ON whatsapp_templates FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "wa_templates_delete_admin"
  ON whatsapp_templates FOR DELETE USING (is_admin_or_super());

-- ---- chat_messages ----
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_select_all"
  ON chat_messages FOR SELECT USING (TRUE);

CREATE POLICY "chat_insert_all"
  ON chat_messages FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "chat_update_admin"
  ON chat_messages FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "chat_delete_admin"
  ON chat_messages FOR DELETE USING (is_admin_or_super());

-- ---- notifications ----
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own_or_admin"
  ON notifications FOR SELECT
  USING (
    is_admin_or_super()
    OR user_username = current_app_username()
  );

CREATE POLICY "notif_insert_all"
  ON notifications FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "notif_update_own_or_admin"
  ON notifications FOR UPDATE
  USING (
    is_admin_or_super()
    OR user_username = current_app_username()
  );

CREATE POLICY "notif_delete_own_or_admin"
  ON notifications FOR DELETE
  USING (
    is_admin_or_super()
    OR user_username = current_app_username()
  );

-- ---- appointments ----
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_all"
  ON appointments FOR SELECT USING (TRUE);

CREATE POLICY "appointments_insert_all"
  ON appointments FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "appointments_update_admin"
  ON appointments FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "appointments_delete_admin"
  ON appointments FOR DELETE USING (is_admin_or_super());

-- ---- calendar_events ----
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cal_events_select_all"
  ON calendar_events FOR SELECT USING (TRUE);

CREATE POLICY "cal_events_insert_all"
  ON calendar_events FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "cal_events_update_admin"
  ON calendar_events FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "cal_events_delete_admin"
  ON calendar_events FOR DELETE USING (is_admin_or_super());

-- ---- calendar_event_participants ----
ALTER TABLE calendar_event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cal_part_select_all"
  ON calendar_event_participants FOR SELECT USING (TRUE);

CREATE POLICY "cal_part_insert_all"
  ON calendar_event_participants FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "cal_part_update_admin"
  ON calendar_event_participants FOR UPDATE USING (is_admin_or_super());

CREATE POLICY "cal_part_delete_admin"
  ON calendar_event_participants FOR DELETE USING (is_admin_or_super());

-- ---- settings ----
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_all"
  ON settings FOR SELECT USING (TRUE);

CREATE POLICY "settings_insert_super"
  ON settings FOR INSERT WITH CHECK (current_app_role() = 'SUPER_ADMIN');

CREATE POLICY "settings_update_super"
  ON settings FOR UPDATE USING (current_app_role() = 'SUPER_ADMIN');

CREATE POLICY "settings_delete_super"
  ON settings FOR DELETE USING (current_app_role() = 'SUPER_ADMIN');

-- =============================================================================
-- COMMENTS (documentation)
-- =============================================================================

COMMENT ON TABLE app_users         IS 'משתמשי המערכת הפנימיים - לא קשורים ל-Supabase Auth';
COMMENT ON TABLE roles             IS 'תפקידים מותאמים אישית עם הרשאות granular';
COMMENT ON TABLE contacts          IS 'אנשי קשר - דיירים ובעלי דירות';
COMMENT ON TABLE debtor_records    IS 'רשומות חובות לדירות, מיובאות מ-Bllink/Excel';
COMMENT ON TABLE legal_status_history IS 'היסטוריית שינויים בסטטוס משפטי';
COMMENT ON TABLE import_runs       IS 'תיעוד ריצות ייבוא נתונים';
COMMENT ON TABLE comments          IS 'הערות על רשומות חייבים';
COMMENT ON TABLE tasks             IS 'משימות כלליות (דור ישן)';
COMMENT ON TABLE task_audit_logs   IS 'לוג ביקורת לשינויים במשימות';
COMMENT ON TABLE whatsapp_templates IS 'תבניות הודעות WhatsApp';
COMMENT ON TABLE chat_messages     IS 'הודעות WhatsApp נכנסות ויוצאות';
COMMENT ON TABLE notifications     IS 'התראות למשתמשי המערכת';
COMMENT ON TABLE appointments      IS 'פגישות ואירועים ביומן (דור ישן)';
COMMENT ON TABLE calendar_events   IS 'אירועי לוח שנה מורחבים';
COMMENT ON TABLE calendar_event_participants IS 'משתתפי אירועי לוח שנה';
COMMENT ON TABLE settings          IS 'הגדרות מערכת גלובליות (singleton)';

COMMENT ON COLUMN debtor_records.legal_status_lock IS 'true = עודכן ידנית, לא לדרוס בייבוא';
COMMENT ON COLUMN debtor_records.phones_manual_override IS 'true = טלפונים עודכנו ידנית, לא לדרוס';
COMMENT ON COLUMN whatsapp_templates.content IS 'תומך במשתנים: {{name}}, {{debt}}, {{monthly}}, {{special}}';