CREATE TABLE group_camps (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  quest_title TEXT NOT NULL,
  quest_description TEXT NOT NULL DEFAULT '',
  host_name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  host_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE group_camp_invites (
  id BIGSERIAL PRIMARY KEY,
  camp_id BIGINT NOT NULL REFERENCES group_camps(id) ON DELETE CASCADE,
  invitee_name TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP
);

CREATE INDEX idx_group_camp_invites_camp ON group_camp_invites(camp_id, created_at);
CREATE INDEX idx_group_camp_invites_token ON group_camp_invites(invite_token);