-- =====================================================================
-- FinTrack database script 02/04 — CREATE TABLES (MySQL 8 / InnoDB)
-- Structural definitions only: PKs, NOT NULL, defaults.
-- Foreign keys, CHECKs, UNIQUEs and INDEXes live in 03.
-- Run order: 01 -> 02 -> 03 -> 04
-- Run with a UTF-8 client: mysql --default-character-set=utf8mb4 ...
-- Conventions:
--   * Money      : DECIMAL(19,4), always with a 3-letter CurrencyCode.
--   * Text       : utf8mb4 (inherited from database default).
--   * Dates      : DATE for business calendar dates (no tz shifting),
--                  DATETIME (UTC by backend convention) for audit stamps.
-- =====================================================================

USE fintrack;

-- ---------------------------------------------------------------- Users --
CREATE TABLE IF NOT EXISTS Users (
  UserId       BIGINT       NOT NULL AUTO_INCREMENT,
  FullName     VARCHAR(100) NOT NULL,
  Email        VARCHAR(255) NOT NULL,
  PasswordHash VARCHAR(255) NOT NULL COMMENT 'BCrypt hash, never plaintext',
  IsActive     TINYINT(1)   NOT NULL DEFAULT 1,
  CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (UserId)
) ENGINE=InnoDB;

-- ------------------------------------------------------------- Accounts --
CREATE TABLE IF NOT EXISTS Accounts (
  AccountId      BIGINT         NOT NULL AUTO_INCREMENT,
  UserId         BIGINT         NOT NULL,
  Name           VARCHAR(100)   NOT NULL,
  AccountType    VARCHAR(30)    NOT NULL COMMENT 'CASH|BANK|SAVINGS|CREDIT_CARD|OTHER',
  CurrencyCode   CHAR(3)        NOT NULL,
  OpeningBalance DECIMAL(19,4)  NOT NULL DEFAULT 0.0000,
  Description    VARCHAR(500)   NULL,
  IsArchived     TINYINT(1)     NOT NULL DEFAULT 0,
  CreatedAt      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (AccountId)
) ENGINE=InnoDB;

-- ----------------------------------------------------------- Categories --
CREATE TABLE IF NOT EXISTS Categories (
  CategoryId   BIGINT       NOT NULL AUTO_INCREMENT,
  UserId       BIGINT       NULL COMMENT 'NULL = global default category',
  Name         VARCHAR(100) NOT NULL,
  CategoryType VARCHAR(20)  NOT NULL COMMENT 'INCOME|EXPENSE',
  Description  VARCHAR(500) NULL,
  ColorHex     VARCHAR(7)   NULL COMMENT 'e.g. #22C55E',
  IconName     VARCHAR(50)  NULL COMMENT 'Lucide icon identifier',
  IsArchived   TINYINT(1)   NOT NULL DEFAULT 0,
  CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (CategoryId)
) ENGINE=InnoDB;

-- --------------------------------------------------------- Transactions --
CREATE TABLE IF NOT EXISTS Transactions (
  TransactionId      BIGINT        NOT NULL AUTO_INCREMENT,
  UserId             BIGINT        NOT NULL,
  TransactionType    VARCHAR(10)   NOT NULL COMMENT 'INCOME|EXPENSE|TRANSFER',
  Amount             DECIMAL(19,4) NOT NULL COMMENT 'Always positive; direction comes from type+accounts',
  CurrencyCode       CHAR(3)       NOT NULL,
  CategoryId         BIGINT        NULL,
  SourceAccountId    BIGINT        NULL,
  DestinationAccountId BIGINT      NULL,
  -- Account-role convention (also enforced by CHECK in 03):
  --   INCOME   : Source NULL,        Destination = receiving account
  --   EXPENSE  : Source = payer,     Destination NULL
  --   TRANSFER : Source and Destination set, distinct, same currency
  TransactionDate    DATE          NOT NULL,
  Description        VARCHAR(500)  NULL,
  Merchant           VARCHAR(200)  NULL,
  CreatedAt          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (TransactionId)
) ENGINE=InnoDB;

-- -------------------------------------------------------------- Budgets --
CREATE TABLE IF NOT EXISTS Budgets (
  BudgetId               BIGINT        NOT NULL AUTO_INCREMENT,
  UserId                 BIGINT        NOT NULL,
  CategoryId             BIGINT        NOT NULL,
  Name                   VARCHAR(150)  NOT NULL,
  Amount                 DECIMAL(19,4) NOT NULL COMMENT 'Zero allowed; utilization then undefined (null)',
  CurrencyCode           CHAR(3)       NOT NULL,
  PeriodType             VARCHAR(20)   NOT NULL COMMENT 'WEEKLY|MONTHLY|QUARTERLY|YEARLY|CUSTOM',
  StartDate              DATE          NOT NULL,
  EndDate                DATE          NOT NULL,
  WarningThresholdPercent INT          NOT NULL DEFAULT 80,
  CreatedAt              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (BudgetId)
) ENGINE=InnoDB;

-- ---------------------------------------------------------- SavingsGoals --
CREATE TABLE IF NOT EXISTS SavingsGoals (
  GoalId          BIGINT        NOT NULL AUTO_INCREMENT,
  UserId          BIGINT        NOT NULL,
  Name            VARCHAR(150)  NOT NULL,
  TargetAmount    DECIMAL(19,4) NOT NULL,
  CurrencyCode    CHAR(3)       NOT NULL,
  TargetDate      DATE          NULL,
  LinkedAccountId BIGINT        NULL COMMENT 'Informational link only; progress is contribution-based',
  Description     VARCHAR(500)  NULL,
  Status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE|COMPLETED|ARCHIVED',
  CreatedAt       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (GoalId)
) ENGINE=InnoDB;

-- ---------------------------------------------------- GoalContributions --
CREATE TABLE IF NOT EXISTS GoalContributions (
  ContributionId   BIGINT        NOT NULL AUTO_INCREMENT,
  GoalId           BIGINT        NOT NULL,
  Amount           DECIMAL(19,4) NOT NULL,
  ContributionDate DATE          NOT NULL,
  ContributionType VARCHAR(20)   NOT NULL COMMENT 'CONTRIBUTION|WITHDRAWAL',
  Description      VARCHAR(500)  NULL,
  CreatedAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ContributionId)
) ENGINE=InnoDB;

-- -------------------------------------------------- ApplicationSettings --
CREATE TABLE IF NOT EXISTS ApplicationSettings (
  SettingId   BIGINT        NOT NULL AUTO_INCREMENT,
  UserId      BIGINT        NOT NULL,
  SettingKey  VARCHAR(100)  NOT NULL,
  SettingValue VARCHAR(1000) NULL COMMENT 'Never passwords / DB credentials / secrets',
  UpdatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (SettingId)
) ENGINE=InnoDB;
