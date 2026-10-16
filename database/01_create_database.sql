-- =====================================================================
-- FinTrack database script 01/04 — CREATE DATABASE (MySQL 8 dialect)
-- Run order: 01 -> 02 -> 03 -> 04
-- Run as a privileged account (e.g. Laragon root). Safe to re-run.
-- IMPORTANT: always run these scripts with a UTF-8 client, e.g.
--   mysql --default-character-set=utf8mb4 -u <user> -p -e "SOURCE <file>"
-- =====================================================================

CREATE DATABASE IF NOT EXISTS fintrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Development application login (dev only; password lives in local .env,
-- never committed). Re-running keeps the existing password.
CREATE USER IF NOT EXISTS 'fintrack'@'localhost' IDENTIFIED BY 'fintrack_dev';
GRANT ALL PRIVILEGES ON fintrack.* TO 'fintrack'@'localhost';
FLUSH PRIVILEGES;
