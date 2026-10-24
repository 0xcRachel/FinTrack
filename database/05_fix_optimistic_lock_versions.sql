-- =====================================================================
-- FinTrack database script 05/05 - OPTIMISTIC-LOCK VERSION REPAIR (MySQL 8)
--
-- Why this exists:
--   Hibernate treats a NULL @Version value as "new entity". Any UPDATE on a
--   row seeded without a version therefore attempted an INSERT (or failed
--   with an optimistic-lock exception), producing HTTP 500 on edit/archive.
--
-- This script is idempotent. Run it once on databases created before the
-- version columns were made NOT NULL DEFAULT 0.
-- =====================================================================

USE fintrack;

UPDATE users                 SET version = 0 WHERE version IS NULL;
UPDATE accounts              SET version = 0 WHERE version IS NULL;
UPDATE categories            SET version = 0 WHERE version IS NULL;
UPDATE transactions          SET version = 0 WHERE version IS NULL;
UPDATE budgets               SET version = 0 WHERE version IS NULL;
UPDATE savings_goals         SET version = 0 WHERE version IS NULL;
UPDATE goal_contributions    SET version = 0 WHERE version IS NULL;
UPDATE application_settings  SET version = 0 WHERE version IS NULL;

ALTER TABLE users                MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE accounts             MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE categories           MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE transactions         MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE budgets              MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE savings_goals        MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE goal_contributions   MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE application_settings MODIFY version BIGINT NOT NULL DEFAULT 0;
