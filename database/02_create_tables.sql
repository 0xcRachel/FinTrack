-- =====================================================================
-- FinTrack database script 02/04 â€” CREATE TABLES (MySQL 8 / InnoDB)
-- Run order: 01 -> 02 -> 03 -> 04
-- Column naming: snake_case to match Spring Boot / Hibernate physical naming.
-- =====================================================================

USE fintrack;

-- ---------------------------------------------------------------- Users --
CREATE TABLE IF NOT EXISTS users (
  user_id       BIGINT       NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'BCrypt hash, never plaintext',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version      BIGINT       NULL COMMENT 'Optimistic-lock version (JPA @Version)',
  PRIMARY KEY (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------- Accounts --
CREATE TABLE IF NOT EXISTS accounts (
  account_id      BIGINT         NOT NULL AUTO_INCREMENT,
  user_id         BIGINT         NOT NULL,
  name            VARCHAR(100)   NOT NULL,
  account_type    VARCHAR(30)    NOT NULL COMMENT 'CASH|BANK|SAVINGS|CREDIT_CARD|OTHER',
  currency_code VARCHAR(3)        NOT NULL,
  opening_balance DECIMAL(19,4)  NOT NULL DEFAULT 0.0000,
  description     VARCHAR(500)   NULL,
  is_archived     TINYINT(1)     NOT NULL DEFAULT 0,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version      BIGINT       NULL COMMENT 'Optimistic-lock version (JPA @Version)',
  PRIMARY KEY (account_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------- Categories --
CREATE TABLE IF NOT EXISTS categories (
  category_id   BIGINT       NOT NULL AUTO_INCREMENT,
  user_id       BIGINT       NULL COMMENT 'NULL = global default category',
  name          VARCHAR(100) NOT NULL,
  category_type VARCHAR(20)  NOT NULL COMMENT 'INCOME|EXPENSE',
  description   VARCHAR(500) NULL,
  color_hex     VARCHAR(7)   NULL COMMENT 'e.g. #22C55E',
  icon_name     VARCHAR(50)  NULL COMMENT 'Lucide icon identifier',
  is_archived   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version      BIGINT       NULL COMMENT 'Optimistic-lock version (JPA @Version)',
  PRIMARY KEY (category_id)
) ENGINE=InnoDB;

-- --------------------------------------------------------- Transactions --
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id        BIGINT        NOT NULL AUTO_INCREMENT,
  user_id               BIGINT        NOT NULL,
  transaction_type      VARCHAR(10)   NOT NULL COMMENT 'INCOME|EXPENSE|TRANSFER',
  amount                DECIMAL(19,4) NOT NULL COMMENT 'Always positive; direction implied by type+accounts',
  currency_code VARCHAR(3)       NOT NULL,
  category_id           BIGINT        NULL,
  source_account_id     BIGINT        NULL,
  destination_account_id BIGINT       NULL,
  -- Account-role convention (also enforced by CHECK in 03):
  --   INCOME   : source NULL,        destination = receiving account
  --   EXPENSE  : source = payer,     destination NULL
  --   TRANSFER : source and destination set, distinct, same currency
  transaction_date DATE          NOT NULL,
  description        VARCHAR(500)  NULL,
  merchant           VARCHAR(200)  NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version      BIGINT       NULL COMMENT 'Optimistic-lock version (JPA @Version)',
  PRIMARY KEY (transaction_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------------- Budgets --
CREATE TABLE IF NOT EXISTS budgets (
  budget_id                   BIGINT        NOT NULL AUTO_INCREMENT,
  user_id                     BIGINT        NOT NULL,
  category_id                 BIGINT        NOT NULL,
  name                        VARCHAR(150)  NOT NULL,
  amount                      DECIMAL(19,4) NOT NULL COMMENT 'Zero allowed; utilization then undefined (null)',
  currency_code VARCHAR(3)       NOT NULL,
  period_type                 VARCHAR(20)   NOT NULL COMMENT 'WEEKLY|MONTHLY|QUARTERLY|YEARLY|CUSTOM',
  start_date                  DATE          NOT NULL,
  end_date                    DATE          NOT NULL,
  warning_threshold_percent   INT           NOT NULL DEFAULT 80,
  created_at                  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version      BIGINT       NULL COMMENT 'Optimistic-lock version (JPA @Version)',
  PRIMARY KEY (budget_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------- SavingsGoals --
CREATE TABLE IF NOT EXISTS savings_goals (
  goal_id            BIGINT        NOT NULL AUTO_INCREMENT,
  user_id            BIGINT        NOT NULL,
  name               VARCHAR(150)  NOT NULL,
  target_amount      DECIMAL(19,4) NOT NULL,
  currency_code VARCHAR(3)       NOT NULL,
  target_date        DATE          NULL,
  linked_account_id  BIGINT        NULL COMMENT 'Informational link only; progress is contribution-based',
  description        VARCHAR(500)  NULL,
  status             VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE|COMPLETED|ARCHIVED',
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version      BIGINT       NULL COMMENT 'Optimistic-lock version (JPA @Version)',
  PRIMARY KEY (goal_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------- GoalContributions --
CREATE TABLE IF NOT EXISTS goal_contributions (
  contribution_id    BIGINT        NOT NULL AUTO_INCREMENT,
  goal_id            BIGINT        NOT NULL,
  amount             DECIMAL(19,4) NOT NULL,
  contribution_date  DATE          NOT NULL,
  contribution_type  VARCHAR(20)   NOT NULL COMMENT 'CONTRIBUTION|WITHDRAWAL',
  description        VARCHAR(500)  NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version      BIGINT       NULL COMMENT 'Optimistic-lock version (JPA @Version)',
  PRIMARY KEY (contribution_id)
) ENGINE=InnoDB;

-- -------------------------------------------------- ApplicationSettings --
CREATE TABLE IF NOT EXISTS application_settings (
  setting_id    BIGINT        NOT NULL AUTO_INCREMENT,
  user_id       BIGINT        NOT NULL,
  setting_key   VARCHAR(100)  NOT NULL,
  setting_value VARCHAR(1000) NULL COMMENT 'Never passwords / DB credentials / secrets',
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version      BIGINT       NULL COMMENT 'Optimistic-lock version (JPA @Version)',
  PRIMARY KEY (setting_id)
) ENGINE=InnoDB;
