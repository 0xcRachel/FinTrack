-- Migration for existing databases: add avatar support.
USE fintrack;
ALTER TABLE users ADD COLUMN avatar_url MEDIUMTEXT NULL AFTER email;
