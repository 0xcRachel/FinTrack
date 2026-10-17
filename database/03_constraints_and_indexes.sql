-- =====================================================================
-- FinTrack database script 03/04 — CONSTRAINTS + INDEXES (MySQL 8)
-- Run order: 01 -> 02 -> 03 -> 04 ONCE per schema AS A PRIVILEGED ACCOUNT (root):
-- trigger creation requires SUPER / log_bin_trust_function_creators.
-- =====================================================================

USE fintrack;

-- ========================================================= FOREIGN KEYS ==
ALTER TABLE accounts
  ADD CONSTRAINT fk_accounts_user FOREIGN KEY (user_id)
  REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE categories
  ADD CONSTRAINT fk_categories_user FOREIGN KEY (user_id)
  REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_user FOREIGN KEY (user_id)
  REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_category FOREIGN KEY (category_id)
  REFERENCES categories (category_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_source FOREIGN KEY (source_account_id)
  REFERENCES accounts (account_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_dest FOREIGN KEY (destination_account_id)
  REFERENCES accounts (account_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE budgets
  ADD CONSTRAINT fk_budgets_user FOREIGN KEY (user_id)
  REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE budgets
  ADD CONSTRAINT fk_budgets_category FOREIGN KEY (category_id)
  REFERENCES categories (category_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE savings_goals
  ADD CONSTRAINT fk_goals_user FOREIGN KEY (user_id)
  REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE savings_goals
  ADD CONSTRAINT fk_goals_linked_account FOREIGN KEY (linked_account_id)
  REFERENCES accounts (account_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE goal_contributions
  ADD CONSTRAINT fk_contrib_goal FOREIGN KEY (goal_id)
  REFERENCES savings_goals (goal_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE application_settings
  ADD CONSTRAINT fk_settings_user FOREIGN KEY (user_id)
  REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================== CHECKS ==
ALTER TABLE accounts
  ADD CONSTRAINT ck_accounts_type
  CHECK (account_type IN ('CASH','BANK','SAVINGS','CREDIT_CARD','OTHER'));

ALTER TABLE accounts
  ADD CONSTRAINT ck_accounts_opening
  CHECK (opening_balance >= 0 OR account_type = 'CREDIT_CARD');

ALTER TABLE accounts
  ADD CONSTRAINT ck_accounts_currency CHECK (CHAR_LENGTH(currency_code) = 3);

ALTER TABLE categories
  ADD CONSTRAINT ck_categories_type CHECK (category_type IN ('INCOME','EXPENSE'));

ALTER TABLE transactions
  ADD CONSTRAINT ck_transactions_amount CHECK (amount > 0);

-- NOTE: the type/role invariant (INCOME/EXPENSE/TRANSFER account roles)
-- is intentionally NOT a CHECK here: MySQL forbids CHECKs covering FK
-- columns (error 3823). It is enforced by the BEFORE INSERT/UPDATE
-- triggers at the bottom of this script (last line of defense).

ALTER TABLE transactions
  ADD CONSTRAINT ck_transactions_currency CHECK (CHAR_LENGTH(currency_code) = 3);

ALTER TABLE budgets
  ADD CONSTRAINT ck_budgets_period
  CHECK (period_type IN ('WEEKLY','MONTHLY','QUARTERLY','YEARLY','CUSTOM'));

ALTER TABLE budgets
  ADD CONSTRAINT ck_budgets_dates CHECK (end_date >= start_date);

ALTER TABLE budgets
  ADD CONSTRAINT ck_budgets_amount CHECK (amount >= 0);

ALTER TABLE budgets
  ADD CONSTRAINT ck_budgets_threshold
  CHECK (warning_threshold_percent BETWEEN 0 AND 100);

ALTER TABLE budgets
  ADD CONSTRAINT ck_budgets_currency CHECK (CHAR_LENGTH(currency_code) = 3);

ALTER TABLE savings_goals
  ADD CONSTRAINT ck_goals_target CHECK (target_amount > 0);

ALTER TABLE savings_goals
  ADD CONSTRAINT ck_goals_status
  CHECK (status IN ('ACTIVE','COMPLETED','ARCHIVED'));

ALTER TABLE savings_goals
  ADD CONSTRAINT ck_goals_currency CHECK (CHAR_LENGTH(currency_code) = 3);

ALTER TABLE goal_contributions
  ADD CONSTRAINT ck_contrib_amount CHECK (amount > 0);

ALTER TABLE goal_contributions
  ADD CONSTRAINT ck_contrib_type
  CHECK (contribution_type IN ('CONTRIBUTION','WITHDRAWAL'));

ALTER TABLE application_settings
  ADD CONSTRAINT ck_settings_key CHECK (CHAR_LENGTH(setting_key) > 0);

-- ============================================================== UNIQUE ==
CREATE UNIQUE INDEX uq_users_email ON users (email);
CREATE UNIQUE INDEX uq_accounts_user_name ON accounts (user_id, name);
CREATE UNIQUE INDEX uq_categories_user_type_name ON categories (user_id, category_type, name);
CREATE UNIQUE INDEX uq_budgets_user_cat_period
  ON budgets (user_id, category_id, start_date, end_date);
CREATE UNIQUE INDEX uq_goals_user_name ON savings_goals (user_id, name);
CREATE UNIQUE INDEX uq_settings_user_key ON application_settings (user_id, setting_key);

-- ============================================================== INDEX ==
CREATE INDEX ix_transactions_user_date ON transactions (user_id, transaction_date);
CREATE INDEX ix_transactions_type ON transactions (user_id, transaction_type);
CREATE INDEX ix_transactions_source ON transactions (source_account_id);
CREATE INDEX ix_transactions_dest ON transactions (destination_account_id);
CREATE INDEX ix_transactions_category ON transactions (category_id);
CREATE INDEX ix_accounts_user ON accounts (user_id);
CREATE INDEX ix_contrib_goal_date ON goal_contributions (goal_id, contribution_date);
CREATE INDEX ix_budgets_user_dates ON budgets (user_id, start_date, end_date);

-- ============================================================= TRIGGERS ==
-- Transaction type/role invariant (CHECK forbidden on FK columns: MySQL error 3823).
--   INCOME   : source NULL,       destination set,   category required
--   EXPENSE  : source set,        destination NULL,  category required
--   TRANSFER : both set, distinct accounts, category NULL
-- The service layer ALSO validates these rules to return clean 400s;
-- triggers are the last line of defense for data integrity.
DELIMITER $$

DROP TRIGGER IF EXISTS trg_transactions_before_insert $$

CREATE TRIGGER trg_transactions_before_insert
BEFORE INSERT ON transactions FOR EACH ROW
BEGIN
  IF NEW.transaction_type NOT IN ('INCOME', 'EXPENSE', 'TRANSFER') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: transaction_type must be INCOME, EXPENSE or TRANSFER';
  END IF;
  IF NEW.transaction_type = 'INCOME'
     AND (NEW.source_account_id IS NOT NULL
          OR NEW.destination_account_id IS NULL
          OR NEW.category_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: INCOME requires source NULL, destination set, category set';
  END IF;
  IF NEW.transaction_type = 'EXPENSE'
     AND (NEW.source_account_id IS NULL
          OR NEW.destination_account_id IS NOT NULL
          OR NEW.category_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: EXPENSE requires source set, destination NULL, category set';
  END IF;
  IF NEW.transaction_type = 'TRANSFER'
     AND (NEW.source_account_id IS NULL
          OR NEW.destination_account_id IS NULL
          OR NEW.source_account_id = NEW.destination_account_id
          OR NEW.category_id IS NOT NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: TRANSFER requires two distinct accounts and no category';
  END IF;
END $$

DROP TRIGGER IF EXISTS trg_transactions_before_update $$

CREATE TRIGGER trg_transactions_before_update
BEFORE UPDATE ON transactions FOR EACH ROW
BEGIN
  IF NEW.transaction_type NOT IN ('INCOME', 'EXPENSE', 'TRANSFER') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: transaction_type must be INCOME, EXPENSE or TRANSFER';
  END IF;
  IF NEW.transaction_type = 'INCOME'
     AND (NEW.source_account_id IS NOT NULL
          OR NEW.destination_account_id IS NULL
          OR NEW.category_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: INCOME requires source NULL, destination set, category set';
  END IF;
  IF NEW.transaction_type = 'EXPENSE'
     AND (NEW.source_account_id IS NULL
          OR NEW.destination_account_id IS NOT NULL
          OR NEW.category_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: EXPENSE requires source set, destination NULL, category set';
  END IF;
  IF NEW.transaction_type = 'TRANSFER'
     AND (NEW.source_account_id IS NULL
          OR NEW.destination_account_id IS NULL
          OR NEW.source_account_id = NEW.destination_account_id
          OR NEW.category_id IS NOT NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'TRG: TRANSFER requires two distinct accounts and no category';
  END IF;
END $$

DELIMITER ;
