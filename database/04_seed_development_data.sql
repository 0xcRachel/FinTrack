-- =====================================================================
-- FinTrack database script 04/04 — DEVELOPMENT SEED DATA (MySQL 8)
-- *** DEMONSTRATION DATA ONLY — NOT REAL FINANCIAL INFORMATION ***
-- Run order: 01 -> 02 -> 03 -> 04. Run ONCE on an empty database.
-- Run with a UTF-8 client: mysql --default-character-set=utf8mb4 ...
-- Demo login: demo@fintrack.local / Demo@1234  (BCrypt hash below)
-- Amounts are in DECIMAL(19,4); VND values use whole units.
-- Column naming: snake_case to match Spring Boot / Hibernate physical naming.
-- =====================================================================

USE fintrack;

-- ------------------------------------------------------------ Demo user --
INSERT INTO users (full_name, email, password_hash, is_active)
VALUES ('Người Dùng Demo', 'demo@fintrack.local',
        '$2y$10$MTTS1PAphmsLoBsdoFOhwOd6oJK.qldNDBNT9NCJXBakrS68qZNG2', 1);
SET @u = LAST_INSERT_ID();

-- --------------------------------------------------------------- Accounts --
INSERT INTO accounts (user_id, name, account_type, currency_code, opening_balance, description)
VALUES (@u, 'Tiền mặt', 'CASH', 'VND', 5000000, 'Ví tiền mặt hàng ngày');
SET @cash = LAST_INSERT_ID();

INSERT INTO accounts (user_id, name, account_type, currency_code, opening_balance, description)
VALUES (@u, 'Vietcombank •• 1234', 'BANK', 'VND', 50000000, 'Tài khoản thanh toán chính');
SET @bank = LAST_INSERT_ID();

INSERT INTO accounts (user_id, name, account_type, currency_code, opening_balance, description)
VALUES (@u, 'USD Savings', 'SAVINGS', 'USD', 2000, 'Tiết kiệm ngoại tệ (minh họa đa tiền tệ)');
SET @usd = LAST_INSERT_ID();

-- ---------------------------------------------------------- Categories --
-- Global defaults (user_id NULL). icon_name = Lucide identifiers.
INSERT INTO categories (user_id, name, category_type, description, color_hex, icon_name) VALUES
  (NULL, 'Salary',            'INCOME',  'Lương hàng tháng',            '#22C55E', 'briefcase'),
  (NULL, 'Freelance',         'INCOME',  'Thu nhập tự do',              '#14B8A6', 'laptop'),
  (NULL, 'Investment Income', 'INCOME',  'Cổ tức / lãi đầu tư',         '#A78BFA', 'trending-up'),
  (NULL, 'Other Income',      'INCOME',  'Thu nhập khác',               '#94A3B8', 'wallet'),
  (NULL, 'Food & Dining',     'EXPENSE', 'Ăn uống',                     '#F59E0B', 'utensils'),
  (NULL, 'Transportation',    'EXPENSE', 'Đi lại, xăng xe',             '#38BDF8', 'car'),
  (NULL, 'Shopping',          'EXPENSE', 'Mua sắm',                     '#EC4899', 'shopping-bag'),
  (NULL, 'Housing',           'EXPENSE', 'Thuê nhà, phí ở',             '#8B5CF6', 'home'),
  (NULL, 'Utilities',         'EXPENSE', 'Điện nước internet',          '#EAB308', 'plug-zap'),
  (NULL, 'Health',            'EXPENSE', 'Sức khỏe, thuốc men',         '#EF4444', 'heart-pulse'),
  (NULL, 'Entertainment',     'EXPENSE', 'Giải trí',                    '#F97316', 'clapperboard'),
  (NULL, 'Education',         'EXPENSE', 'Học tập',                     '#0EA5E9', 'graduation-cap'),
  (NULL, 'Other Expense',     'EXPENSE', 'Chi tiêu khác',               '#64748B', 'circle-dot');

SELECT category_id INTO @c_salary FROM categories WHERE user_id IS NULL AND name = 'Salary';
SELECT category_id INTO @c_freelance FROM categories WHERE user_id IS NULL AND name = 'Freelance';
SELECT category_id INTO @c_food FROM categories WHERE user_id IS NULL AND name = 'Food & Dining';
SELECT category_id INTO @c_transport FROM categories WHERE user_id IS NULL AND name = 'Transportation';
SELECT category_id INTO @c_shopping FROM categories WHERE user_id IS NULL AND name = 'Shopping';
SELECT category_id INTO @c_housing FROM categories WHERE user_id IS NULL AND name = 'Housing';
SELECT category_id INTO @c_util FROM categories WHERE user_id IS NULL AND name = 'Utilities';
SELECT category_id INTO @c_health FROM categories WHERE user_id IS NULL AND name = 'Health';
SELECT category_id INTO @c_ent FROM categories WHERE user_id IS NULL AND name = 'Entertainment';
SELECT category_id INTO @c_edu FROM categories WHERE user_id IS NULL AND name = 'Education';
SELECT category_id INTO @c_other FROM categories WHERE user_id IS NULL AND name = 'Other Expense';

-- ----------------------------------------------------------- Transactions --
-- INCOME: source NULL + destination set. EXPENSE: source set + dest NULL.
-- TRANSFER: both set, distinct, same currency, category NULL.
INSERT INTO transactions
  (user_id, transaction_type, amount, currency_code, category_id,
   source_account_id, destination_account_id, transaction_date, description, merchant)
VALUES
  (@u, 'INCOME', 30000000, 'VND', @c_salary, NULL, @bank, '2026-09-28', 'Lương tháng 9', 'Công ty ABC'),
  (@u, 'EXPENSE', 8000000, 'VND', @c_housing, @bank, NULL, '2026-09-29', 'Tiền thuê nhà tháng 10', NULL),
  (@u, 'EXPENSE', 1200000, 'VND', @c_food, @cash, NULL, '2026-09-30', 'Đi chợ cuối tháng', 'Chợ Bến Thành'),
  (@u, 'INCOME', 30000000, 'VND', @c_salary, NULL, @bank, '2026-10-05', 'Lương tháng 10', 'Công ty ABC'),
  (@u, 'EXPENSE', 8000000, 'VND', @c_housing, @bank, NULL, '2026-10-06', 'Tiền thuê nhà tháng 10', NULL),
  (@u, 'EXPENSE', 250000, 'VND', @c_food, @cash, NULL, '2026-10-07', 'Ăn trưa', NULL),
  (@u, 'TRANSFER', 5000000, 'VND', NULL, @bank, @cash, '2026-10-08', 'Rút tiền mặt', NULL),
  (@u, 'EXPENSE', 500000, 'VND', @c_transport, @cash, NULL, '2026-10-10', 'Đổ xăng', 'Petrolimex'),
  (@u, 'EXPENSE', 850000, 'VND', @c_util, @bank, NULL, '2026-10-12', 'Tiền điện tháng 10', 'EVN'),
  (@u, 'INCOME', 7500000, 'VND', @c_freelance, NULL, @bank, '2026-10-14', 'Dự án freelance website', 'Khách hàng XYZ'),
  (@u, 'EXPENSE', 2300000, 'VND', @c_shopping, @bank, NULL, '2026-10-15', 'Mua giày thể thao', 'Shopee'),
  (@u, 'EXPENSE', 650000, 'VND', @c_ent, @cash, NULL, '2026-10-18', 'Xem phim cuối tuần', 'CGV'),
  (@u, 'EXPENSE', 420000, 'VND', @c_food, @cash, NULL, '2026-10-20', 'Cà phê với bạn', 'Highlands Coffee'),
  (@u, 'EXPENSE', 1200000, 'VND', @c_health, @bank, NULL, '2026-10-21', 'Khám sức khỏe định kỳ', 'Pharmacity'),
  (@u, 'TRANSFER', 3000000, 'VND', NULL, @bank, @cash, '2026-10-22', 'Rút tiền mặt chi tiêu', NULL),
  (@u, 'EXPENSE', 1800000, 'VND', @c_edu, @bank, NULL, '2026-10-24', 'Khóa học tiếng Anh', 'Trung tâm ELSA'),
  (@u, 'EXPENSE', 300000, 'VND', @c_transport, @cash, NULL, '2026-10-25', 'Đi Grab', 'Grab'),
  (@u, 'EXPENSE', 180000, 'VND', @c_food, @cash, NULL, '2026-10-26', 'Ăn sáng', NULL),
  (@u, 'EXPENSE', 95000, 'VND', @c_other, @cash, NULL, '2026-10-28', 'In tài liệu — kiểm tra CSV: dấu "phẩy", và dòng mới', 'Tiệm "Photo" A,B');

-- ---------------------------------------------------------------- Budgets --
INSERT INTO budgets
  (user_id, category_id, name, amount, currency_code, period_type, start_date, end_date, warning_threshold_percent)
VALUES
  (@u, @c_food, 'Ăn uống — Tháng 10/2026', 3000000, 'VND', 'MONTHLY', '2026-10-01', '2026-10-31', 80),
  (@u, @c_transport, 'Đi lại — Tháng 10/2026', 1500000, 'VND', 'MONTHLY', '2026-10-01', '2026-10-31', 80);

-- ------------------------------------------------------------ Savings goal --
INSERT INTO savings_goals
  (user_id, name, target_amount, currency_code, target_date, linked_account_id, description, status)
VALUES
  (@u, 'Quỹ dự phòng khẩn cấp', 100000000, 'VND', '2027-06-30', @bank,
   'Mục tiêu 6 tháng chi phí sinh hoạt (tiến độ = tổng đóng góp, sổ độc lập)', 'ACTIVE');
SET @goal = LAST_INSERT_ID();

INSERT INTO goal_contributions (goal_id, amount, contribution_date, contribution_type, description)
VALUES
  (@goal, 5000000, '2026-10-10', 'CONTRIBUTION', 'Trích lương tháng 10'),
  (@goal, 3000000, '2026-10-24', 'CONTRIBUTION', 'Trích freelance');

-- ---------------------------------------------------------------- Settings --
INSERT INTO application_settings (user_id, setting_key, setting_value) VALUES
  (@u, 'theme', 'dark'),
  (@u, 'displayCurrency', 'VND'),
  (@u, 'locale', 'vi-VN'),
  (@u, 'dateFormat', 'dd/MM/yyyy'),
  (@u, 'dashboardDefaultPeriod', 'THIS_MONTH');
