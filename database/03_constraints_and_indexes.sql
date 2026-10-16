-- =====================================================================
-- FinTrack database script 03/04 — CONSTRAINTS + INDEXES (MySQL 8)
-- Foreign keys, CHECK invariants, UNIQUE rules, performance indexes.
-- Run order: 01 -> 02 -> 03 -> 04.
-- Run with a UTF-8 client: mysql --default-character-set=utf8mb4 ...
-- NOTE: run this file ONCE per schema AS A PRIVILEGED ACCOUNT (root):
-- trigger creation requires SUPER / log_bin_trust_function_creators.
-- Deletion policy: user-owned rows CASCADE; rows referenced by financial
-- history RESTRICT (archive instead of deleting); optional links SET NULL.
-- =====================================================================

USE fintrack;

-- ========================================================= FOREIGN KEYS ==
ALTER TABLE Accounts
  ADD CONSTRAINT FK_Accounts_User FOREIGN KEY (UserId)
  REFERENCES Users (UserId) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE Categories
  ADD CONSTRAINT FK_Categories_User FOREIGN KEY (UserId)
  REFERENCES Users (UserId) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE Transactions
  ADD CONSTRAINT FK_Transactions_User FOREIGN KEY (UserId)
  REFERENCES Users (UserId) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE Transactions
  ADD CONSTRAINT FK_Transactions_Category FOREIGN KEY (CategoryId)
  REFERENCES Categories (CategoryId) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE Transactions
  ADD CONSTRAINT FK_Transactions_Source FOREIGN KEY (SourceAccountId)
  REFERENCES Accounts (AccountId) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE Transactions
  ADD CONSTRAINT FK_Transactions_Dest FOREIGN KEY (DestinationAccountId)
  REFERENCES Accounts (AccountId) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE Budgets
  ADD CONSTRAINT FK_Budgets_User FOREIGN KEY (UserId)
  REFERENCES Users (UserId) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE Budgets
  ADD CONSTRAINT FK_Budgets_Category FOREIGN KEY (CategoryId)
  REFERENCES Categories (CategoryId) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE SavingsGoals
  ADD CONSTRAINT FK_Goals_User FOREIGN KEY (UserId)
  REFERENCES Users (UserId) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE SavingsGoals
  ADD CONSTRAINT FK_Goals_LinkedAccount FOREIGN KEY (LinkedAccountId)
  REFERENCES Accounts (AccountId) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE GoalContributions
  ADD CONSTRAINT FK_Contrib_Goal FOREIGN KEY (GoalId)
  REFERENCES SavingsGoals (GoalId) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE ApplicationSettings
  ADD CONSTRAINT FK_Settings_User FOREIGN KEY (UserId)
  REFERENCES Users (UserId) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================== CHECKS ==
-- NOTE: MySQL (error 3823) forbids CHECK constraints on columns that are
-- also protected by FOREIGN KEY referential actions. Therefore the
-- transaction type/role invariant is enforced by TRIGGERS (see bottom of
-- this file); only non-FK columns carry CHECKs here.
ALTER TABLE Accounts
  ADD CONSTRAINT CK_Accounts_Type
  CHECK (AccountType IN ('CASH','BANK','SAVINGS','CREDIT_CARD','OTHER'));

ALTER TABLE Accounts
  ADD CONSTRAINT CK_Accounts_Opening
  CHECK (OpeningBalance >= 0 OR AccountType = 'CREDIT_CARD');

ALTER TABLE Accounts
  ADD CONSTRAINT CK_Accounts_Currency CHECK (CHAR_LENGTH(CurrencyCode) = 3);

ALTER TABLE Categories
  ADD CONSTRAINT CK_Categories_Type CHECK (CategoryType IN ('INCOME','EXPENSE'));

ALTER TABLE Transactions
  ADD CONSTRAINT CK_Transactions_Amount CHECK (Amount > 0);

ALTER TABLE Transactions
  ADD CONSTRAINT CK_Transactions_Currency CHECK (CHAR_LENGTH(CurrencyCode) = 3);

ALTER TABLE Budgets
  ADD CONSTRAINT CK_Budgets_Period
  CHECK (PeriodType IN ('WEEKLY','MONTHLY','QUARTERLY','YEARLY','CUSTOM'));

ALTER TABLE Budgets
  ADD CONSTRAINT CK_Budgets_Dates CHECK (EndDate >= StartDate);

ALTER TABLE Budgets
  ADD CONSTRAINT CK_Budgets_Amount CHECK (Amount >= 0);

ALTER TABLE Budgets
  ADD CONSTRAINT CK_Budgets_Threshold
  CHECK (WarningThresholdPercent BETWEEN 0 AND 100);

ALTER TABLE Budgets
  ADD CONSTRAINT CK_Budgets_Currency CHECK (CHAR_LENGTH(CurrencyCode) = 3);

ALTER TABLE SavingsGoals
  ADD CONSTRAINT CK_Goals_Target CHECK (TargetAmount > 0);

ALTER TABLE SavingsGoals
  ADD CONSTRAINT CK_Goals_Status
  CHECK (Status IN ('ACTIVE','COMPLETED','ARCHIVED'));

ALTER TABLE SavingsGoals
  ADD CONSTRAINT CK_Goals_Currency CHECK (CHAR_LENGTH(CurrencyCode) = 3);

ALTER TABLE GoalContributions
  ADD CONSTRAINT CK_Contrib_Amount CHECK (Amount > 0);

ALTER TABLE GoalContributions
  ADD CONSTRAINT CK_Contrib_Type
  CHECK (ContributionType IN ('CONTRIBUTION','WITHDRAWAL'));

ALTER TABLE ApplicationSettings
  ADD CONSTRAINT CK_Settings_Key CHECK (CHAR_LENGTH(SettingKey) > 0);

-- ============================================================== UNIQUE ==
CREATE UNIQUE INDEX UQ_Users_Email ON Users (Email);
CREATE UNIQUE INDEX UQ_Accounts_User_Name ON Accounts (UserId, Name);
CREATE UNIQUE INDEX UQ_Categories_User_Type_Name ON Categories (UserId, CategoryType, Name);
CREATE UNIQUE INDEX UQ_Budgets_User_Cat_Period
  ON Budgets (UserId, CategoryId, StartDate, EndDate);
CREATE UNIQUE INDEX UQ_Goals_User_Name ON SavingsGoals (UserId, Name);
CREATE UNIQUE INDEX UQ_Settings_User_Key ON ApplicationSettings (UserId, SettingKey);

-- ============================================================== INDEX ==
CREATE INDEX IX_Transactions_User_Date ON Transactions (UserId, TransactionDate);
CREATE INDEX IX_Transactions_Type ON Transactions (UserId, TransactionType);
CREATE INDEX IX_Transactions_Source ON Transactions (SourceAccountId);
CREATE INDEX IX_Transactions_Dest ON Transactions (DestinationAccountId);
CREATE INDEX IX_Transactions_Category ON Transactions (CategoryId);
CREATE INDEX IX_Accounts_User ON Accounts (UserId);
CREATE INDEX IX_Contrib_Goal_Date ON GoalContributions (GoalId, ContributionDate);
CREATE INDEX IX_Budgets_User_Dates ON Budgets (UserId, StartDate, EndDate);

-- ============================================================= TRIGGERS ==
-- Transaction type/role invariant (cannot be a CHECK: error 3823, the
-- account/category columns carry FK referential actions).
--   INCOME   : Source NULL,       Destination set,   category required
--   EXPENSE  : Source set,        Destination NULL,  category required
--   TRANSFER : both set, distinct accounts, category NULL
-- The service layer ALSO validates these rules to return clean 400s;
-- triggers are the last line of defense for data integrity.
DELIMITER $$

DROP TRIGGER IF EXISTS TRG_Transactions_BeforeInsert $$

CREATE TRIGGER TRG_Transactions_BeforeInsert
BEFORE INSERT ON Transactions FOR EACH ROW
BEGIN
  IF NEW.TransactionType NOT IN ('INCOME', 'EXPENSE', 'TRANSFER') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: TransactionType must be INCOME, EXPENSE or TRANSFER';
  END IF;
  IF NEW.TransactionType = 'INCOME'
     AND (NEW.SourceAccountId IS NOT NULL
          OR NEW.DestinationAccountId IS NULL
          OR NEW.CategoryId IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: INCOME requires Source NULL, Destination set, Category set';
  END IF;
  IF NEW.TransactionType = 'EXPENSE'
     AND (NEW.SourceAccountId IS NULL
          OR NEW.DestinationAccountId IS NOT NULL
          OR NEW.CategoryId IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: EXPENSE requires Source set, Destination NULL, Category set';
  END IF;
  IF NEW.TransactionType = 'TRANSFER'
     AND (NEW.SourceAccountId IS NULL
          OR NEW.DestinationAccountId IS NULL
          OR NEW.SourceAccountId = NEW.DestinationAccountId
          OR NEW.CategoryId IS NOT NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: TRANSFER requires two distinct accounts and no category';
  END IF;
END $$

DROP TRIGGER IF EXISTS TRG_Transactions_BeforeUpdate $$

CREATE TRIGGER TRG_Transactions_BeforeUpdate
BEFORE UPDATE ON Transactions FOR EACH ROW
BEGIN
  IF NEW.TransactionType NOT IN ('INCOME', 'EXPENSE', 'TRANSFER') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: TransactionType must be INCOME, EXPENSE or TRANSFER';
  END IF;
  IF NEW.TransactionType = 'INCOME'
     AND (NEW.SourceAccountId IS NOT NULL
          OR NEW.DestinationAccountId IS NULL
          OR NEW.CategoryId IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: INCOME requires Source NULL, Destination set, Category set';
  END IF;
  IF NEW.TransactionType = 'EXPENSE'
     AND (NEW.SourceAccountId IS NULL
          OR NEW.DestinationAccountId IS NOT NULL
          OR NEW.CategoryId IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: EXPENSE requires Source set, Destination NULL, Category set';
  END IF;
  IF NEW.TransactionType = 'TRANSFER'
     AND (NEW.SourceAccountId IS NULL
          OR NEW.DestinationAccountId IS NULL
          OR NEW.SourceAccountId = NEW.DestinationAccountId
          OR NEW.CategoryId IS NOT NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: TRANSFER requires two distinct accounts and no category';
  END IF;
END $$

DELIMITER ;
