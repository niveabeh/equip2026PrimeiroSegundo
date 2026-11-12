ALTER TABLE activities ADD COLUMN phase text NOT NULL DEFAULT 'before' CHECK(phase IN ('before','during','after'));
ALTER TABLE audit ADD COLUMN source text NOT NULL DEFAULT 'application' CHECK(source IN ('application','demo'));
CREATE TABLE sponsors (
  id text PRIMARY KEY,
  edition_id text NOT NULL REFERENCES editions(id),
  name text NOT NULL,
  contribution text NOT NULL,
  counterpart text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  owner_id text NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK(status IN ('prospect','contacted','confirmed','delivered')),
  notes text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX sponsor_edition ON sponsors(edition_id);
CREATE TABLE demo_seed_versions(version integer PRIMARY KEY);
INSERT INTO schema_migrations VALUES(2);
