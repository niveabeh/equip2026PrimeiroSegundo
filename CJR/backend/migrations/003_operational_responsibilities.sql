ALTER TABLE stakeholders ADD COLUMN owner_id text REFERENCES users(id);
ALTER TABLE stakeholders ADD COLUMN phase text NOT NULL DEFAULT 'before' CHECK(phase IN ('before','during','after'));
ALTER TABLE stakeholders ADD COLUMN operational_status text NOT NULL DEFAULT 'scheduled' CHECK(operational_status IN ('scheduled','confirmed','in_progress','finished'));
ALTER TABLE stakeholders ADD COLUMN notes text NOT NULL DEFAULT '';
ALTER TABLE stakeholders ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE activities ADD COLUMN stakeholder_id text REFERENCES stakeholders(id);
CREATE INDEX activity_stakeholder ON activities(stakeholder_id);
INSERT INTO schema_migrations VALUES(3);
