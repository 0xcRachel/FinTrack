-- =====================================================================
-- Migration for existing databases: personal + family financial spaces.
-- Run once as a privileged account after 01..05.
-- =====================================================================
USE fintrack;

CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id      BIGINT       NOT NULL AUTO_INCREMENT,
  data_owner_user_id BIGINT      NOT NULL COMMENT 'User whose rows hold this space data',
  created_by_user_id BIGINT      NOT NULL,
  name              VARCHAR(60)  NOT NULL,
  workspace_type    VARCHAR(16)  NOT NULL COMMENT 'PERSONAL|FAMILY',
  is_default        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version           BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id),
  UNIQUE KEY uq_workspaces_data_owner (data_owner_user_id),
  KEY idx_workspaces_created_by (created_by_user_id),
  CONSTRAINT fk_workspaces_data_owner FOREIGN KEY (data_owner_user_id)
    REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_workspaces_created_by FOREIGN KEY (created_by_user_id)
    REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_workspaces_type CHECK (workspace_type IN ('PERSONAL', 'FAMILY'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workspace_members (
  member_id    BIGINT      NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT      NOT NULL,
  user_id      BIGINT      NOT NULL,
  role         VARCHAR(16) NOT NULL COMMENT 'OWNER|MEMBER',
  joined_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id),
  UNIQUE KEY uq_workspace_member (workspace_id, user_id),
  KEY idx_workspace_members_user (user_id),
  CONSTRAINT fk_workspace_members_space FOREIGN KEY (workspace_id)
    REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_workspace_members_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_workspace_members_role CHECK (role IN ('OWNER', 'MEMBER'))
) ENGINE=InnoDB;

-- Every existing account gets a personal space backed by its own data.
INSERT INTO workspaces (data_owner_user_id, created_by_user_id, name, workspace_type,
                        is_default, created_at, updated_at, version)
SELECT u.user_id, u.user_id, 'Personal workspace', 'PERSONAL', 1, NOW(), NOW(), 0
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.data_owner_user_id = u.user_id
);

INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT w.workspace_id, w.data_owner_user_id, 'OWNER', NOW()
FROM workspaces w
WHERE w.is_default = 1
  AND NOT EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = w.workspace_id AND m.user_id = w.data_owner_user_id
  );
