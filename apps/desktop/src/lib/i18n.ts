export type Language = 'en' | 'vi';

export interface Translations {
  // Brand
  brandName: string;

  // Sidebar Sections
  secGeneral: string;
  secAi: string;
  secUser: string;

  // Sidebar Navigation
  navDashboard: string;
  navBudgeting: string;
  navSavings: string;
  navCashAdvances: string;
  navTransactions: string;
  navBills: string;
  navAiAssistant: string;
  navFinancialHealth: string;
  navReports: string;
  navReferral: string;
  navSettings: string;
  navHelp: string;
  navLogout: string;

  // Topbar
  apiOnline: string;
  apiConnecting: string;
  searchPlaceholder: string;

  // Spending By Category
  spendingByCategory: string;
  tabSpending: string;
  tabBudget: string;
  tabBills: string;
  totalBudget: string;
  savingConsistent: string;
  savingAdvice: string;

  // AI Insights
  aiInsights: string;
  aiSpentSummary: (spent: number, days: number) => string;
  aiSpendingOnTrack: string;
  optimiseBudget: string;

  // Spending Trend
  spendingTrend: string;

  // Monthly Budget Overview
  monthlyBudgetOverview: string;
  spent: string;
  remaining: string;
  addTransaction: string;
  necessaryDebts: string;

  // Recent Transactions
  recentTransactions: string;
  thDate: string;
  thMerchant: string;
  thCategory: string;
  thAmount: string;
  filterTransactions: string;
  loadingTransactions: string;

  // Settings
  settingsTitle: string;
  settingsSubtitle: string;
  settingsLanguage: string;
  settingsCurrency: string;
  settingsAccount: string;
  settingsBackendStatus: string;
  settingsSaveSuccess: string;
  settingsLogout: string;

  // Auth
  authLoginTitle: string;
  authRegisterTitle: string;
  authLoginSubtitle: string;
  authRegisterSubtitle: string;
  authEmail: string;
  authPassword: string;
  authFullName: string;
  authConfirmPassword: string;
  authLoginBtn: string;
  authRegisterBtn: string;
  authSwitchToRegister: string;
  authSwitchToLogin: string;
  authQuickDemo: string;
  authSuccessLogin: string;
  authSuccessRegister: string;
  // Modal Add Transaction
  modalAddTitle: string;
  modalTypeExpense: string;
  modalTypeIncome: string;
  modalTypeTransfer: string;
  modalAccount: string;
  modalSourceAccount: string;
  modalDestinationAccount: string;
  modalAmount: string;
  modalCategory: string;
  modalMerchant: string;
  modalMerchantPlaceholder: string;
  modalDescription: string;
  modalDescriptionPlaceholder: string;
  modalCancel: string;
  modalSubmit: string;
  modalSubmitting: string;
  modalErrorAmount: string;
  modalErrorAccount: string;
  modalNoAccounts: string;
  modalSelectAccount: string;
  modalSelectCategory: string;
  modalCreateDefaultAccount: string;

  // Empty states
  emptyNoTransactions: string;
  emptyNoTransactionsSub: string;
  emptyNoCategories: string;
  emptyNoCategoriesSub: string;
}

export const translations: Record<Language, Translations> = {
  vi: {
    brandName: 'Finwise',
    secGeneral: 'Chung',
    secAi: 'AI & Phân tích',
    secUser: 'Tài khoản',

    navDashboard: 'Tổng quan',
    navBudgeting: 'Ngân sách & Chi tiêu',
    navSavings: 'Mục tiêu tiết kiệm',
    navCashAdvances: 'Tạm ứng tiền mặt',
    navTransactions: 'Lịch sử giao dịch',
    navBills: 'Hóa đơn & Thanh toán',
    navAiAssistant: 'Trợ lý tài chính AI',
    navFinancialHealth: 'Sức khỏe tài chính',
    navReports: 'Báo cáo & Thống kê',
    navReferral: 'Giới thiệu bạn bè',
    navSettings: 'Cài đặt hệ thống',
    navHelp: 'Trợ giúp & Hỗ trợ',
    navLogout: 'Đăng xuất',

    apiOnline: 'Kết nối API',
    apiConnecting: 'Đang kết nối...',
    searchPlaceholder: 'Tìm kiếm giao dịch, phân loại...',

    spendingByCategory: 'Chi tiêu theo danh mục',
    tabSpending: 'Chi tiêu',
    tabBudget: 'Ngân sách',
    tabBills: 'Hóa đơn',
    totalBudget: 'Tổng ngân sách',
    savingConsistent: 'Bạn đang tiết kiệm rất ổn định!',
    savingAdvice: 'Cân nhắc tăng tiết kiệm thêm 500.000₫/tuần để đạt mục tiêu nhanh hơn.',

    aiInsights: 'Đánh giá từ AI',
    aiSpentSummary: (spent, days) =>
      `Bạn đã chi tiêu ${spent}% ngân sách và còn ${days} ngày nữa trong tháng.`,
    aiSpendingOnTrack: 'Chi tiêu của bạn đang đúng tiến độ!',
    optimiseBudget: 'Tối ưu ngân sách',

    spendingTrend: 'Xu hướng chi tiêu',

    monthlyBudgetOverview: 'Tổng quan ngân sách tháng',
    spent: 'Đã chi',
    remaining: 'Còn lại',
    addTransaction: 'Thêm giao dịch',
    necessaryDebts: 'Khoản nợ cần trả',

    recentTransactions: 'Giao dịch gần đây',
    thDate: 'Ngày',
    thMerchant: 'Nơi chi tiêu / Người nhận',
    thCategory: 'Danh mục',
    thAmount: 'Số tiền',
    filterTransactions: 'Bộ lọc giao dịch',
    loadingTransactions: 'Đang tải dữ liệu từ Spring Boot backend...',

    settingsTitle: 'Cài đặt hệ thống',
    settingsSubtitle: 'Tùy chỉnh ngôn ngữ, tiền tệ và tài khoản người dùng',
    settingsLanguage: 'Ngôn ngữ hiển thị',
    settingsCurrency: 'Đơn vị tiền tệ chính',
    settingsAccount: 'Thông tin tài khoản',
    settingsBackendStatus: 'Trạng thái máy chủ Spring Boot',
    settingsSaveSuccess: 'Đã lưu cài đặt thành công!',
    settingsLogout: 'Đăng xuất khỏi thiết bị',

    authLoginTitle: 'Đăng nhập tài khoản',
    authRegisterTitle: 'Đăng ký tài khoản mới',
    authLoginSubtitle: 'Quản lý tài chính cá nhân thông minh cùng FinTrack',
    authRegisterSubtitle: 'Tạo tài khoản mới để bắt đầu theo dõi ngân sách',
    authEmail: 'Địa chỉ Email',
    authPassword: 'Mật khẩu',
    authFullName: 'Họ và tên',
    authConfirmPassword: 'Xác nhận mật khẩu',
    authLoginBtn: 'Đăng nhập ngay',
    authRegisterBtn: 'Tạo tài khoản',
    authSwitchToRegister: 'Chưa có tài khoản? Đăng ký ngay',
    authSwitchToLogin: 'Đã có tài khoản? Đăng nhập tại đây',
    authQuickDemo: 'Điền tài khoản mẫu (Demo Login)',
    authSuccessLogin: 'Đăng nhập thành công!',
    authSuccessRegister: 'Tạo tài khoản thành công! Đang đăng nhập...',

    // Modal Add Transaction
    modalAddTitle: 'Thêm giao dịch mới',
    modalTypeExpense: 'Khoản chi',
    modalTypeIncome: 'Thu nhập',
    modalTypeTransfer: 'Chuyển khoản',
    modalAccount: 'Tài khoản thanh toán',
    modalSourceAccount: 'Tài khoản nguồn (Trích tiền)',
    modalDestinationAccount: 'Tài khoản đích (Nhận tiền)',
    modalAmount: 'Số tiền',
    modalCategory: 'Danh mục',
    modalMerchant: 'Nơi chi tiêu / Người nhận',
    modalMerchantPlaceholder: 'ví dụ: Siêu thị, Highlands Coffee, Grab...',
    modalDescription: 'Ghi chú (Tùy chọn)',
    modalDescriptionPlaceholder: 'Chi tiết giao dịch...',
    modalCancel: 'Hủy bỏ',
    modalSubmit: 'Lưu giao dịch',
    modalSubmitting: 'Đang lưu vào hệ thống...',
    modalErrorAmount: 'Vui lòng nhập số tiền hợp lệ lớn hơn 0.',
    modalErrorAccount: 'Vui lòng chọn tài khoản hợp lệ.',
    modalNoAccounts: 'Chưa có tài khoản nào. Hãy tạo tài khoản đầu tiên!',
    modalSelectAccount: '-- Chọn tài khoản --',
    modalSelectCategory: '-- Chọn danh mục --',
    modalCreateDefaultAccount: 'Tạo ví tiền mặt mặc định',

    // Empty states
    emptyNoTransactions: 'Chưa có giao dịch nào',
    emptyNoTransactionsSub: 'Nhấn "+ Thêm giao dịch" để bắt đầu ghi chép thu chi của bạn.',
    emptyNoCategories: 'Chưa có dữ liệu danh mục',
    emptyNoCategoriesSub: 'Dữ liệu phân loại chi tiêu sẽ hiển thị khi bạn có giao dịch thực tế.',
  },
  en: {
    brandName: 'Finwise',
    secGeneral: 'General',
    secAi: 'AI & Insights',
    secUser: 'User',

    navDashboard: 'Dashboard',
    navBudgeting: 'Budgeting & Expenses',
    navSavings: 'Savings & Goals',
    navCashAdvances: 'Cash Advances',
    navTransactions: 'Transactions',
    navBills: 'Bills & Payments',
    navAiAssistant: 'AI Assistant',
    navFinancialHealth: 'Financial Health',
    navReports: 'Reports & Analytics',
    navReferral: 'Referral Program',
    navSettings: 'Settings',
    navHelp: 'Help & Supports',
    navLogout: 'Logout',

    apiOnline: 'API Online',
    apiConnecting: 'Connecting...',
    searchPlaceholder: 'Search transactions, categories...',

    spendingByCategory: 'Spending By Category',
    tabSpending: 'Spending',
    tabBudget: 'Budget',
    tabBills: 'Bills',
    totalBudget: 'Total Budget',
    savingConsistent: "You're saving consistently!",
    savingAdvice: 'Consider increasing your weekly savings by $20 for faster progress.',

    aiInsights: 'AI Insights',
    aiSpentSummary: (spent, days) =>
      `You've spent ${spent}% of your budget with ${days} days left in the month.`,
    aiSpendingOnTrack: 'Your spending is on track!',
    optimiseBudget: 'Optimise Budget',

    spendingTrend: 'Spending Trend',

    monthlyBudgetOverview: 'Monthly Budget Overview',
    spent: 'Spent',
    remaining: 'Remaining',
    addTransaction: 'Add Transaction',
    necessaryDebts: 'Necessary Debts',

    recentTransactions: 'Recent Transactions',
    thDate: 'Date',
    thMerchant: 'Merchant / Payee',
    thCategory: 'Category',
    thAmount: 'Amount',
    filterTransactions: 'Filter transactions',
    loadingTransactions: 'Loading transactions from Spring Boot backend...',

    settingsTitle: 'System Settings',
    settingsSubtitle: 'Configure your language, currency and account preferences',
    settingsLanguage: 'Display Language',
    settingsCurrency: 'Primary Currency',
    settingsAccount: 'Account Profile',
    settingsBackendStatus: 'Spring Boot Backend Status',
    settingsSaveSuccess: 'Settings saved successfully!',
    settingsLogout: 'Log out from this device',

    authLoginTitle: 'Account Login',
    authRegisterTitle: 'Create New Account',
    authLoginSubtitle: 'Smart personal finance manager powered by FinTrack',
    authRegisterSubtitle: 'Join FinTrack to take full control of your finances',
    authEmail: 'Email Address',
    authPassword: 'Password',
    authFullName: 'Full Name',
    authConfirmPassword: 'Confirm Password',
    authLoginBtn: 'Log In Now',
    authRegisterBtn: 'Create Account',
    authSwitchToRegister: "Don't have an account? Sign up",
    authSwitchToLogin: 'Already have an account? Log in',
    authQuickDemo: 'Fill Demo Account (One-click)',
    authSuccessLogin: 'Login successful!',
    authSuccessRegister: 'Registration successful! Signing in...',

    // Modal Add Transaction
    modalAddTitle: 'Add New Transaction',
    modalTypeExpense: 'Expense',
    modalTypeIncome: 'Income',
    modalTypeTransfer: 'Transfer',
    modalAccount: 'Account',
    modalSourceAccount: 'Source Account',
    modalDestinationAccount: 'Destination Account',
    modalAmount: 'Amount',
    modalCategory: 'Category',
    modalMerchant: 'Merchant / Payee',
    modalMerchantPlaceholder: 'e.g. Uber, Starbucks, Apple Store',
    modalDescription: 'Description (Optional)',
    modalDescriptionPlaceholder: 'Add details about this transaction...',
    modalCancel: 'Cancel',
    modalSubmit: 'Save Transaction',
    modalSubmitting: 'Saving transaction...',
    modalErrorAmount: 'Please enter a valid amount greater than 0.',
    modalErrorAccount: 'Please select a valid account.',
    modalNoAccounts: 'No accounts found. Create your first wallet!',
    modalSelectAccount: '-- Select Account --',
    modalSelectCategory: '-- Select Category --',
    modalCreateDefaultAccount: 'Create Default Cash Wallet',

    // Empty states
    emptyNoTransactions: 'No transactions recorded yet',
    emptyNoTransactionsSub: 'Click "+ Add Transaction" to start tracking your finances.',
    emptyNoCategories: 'No categorized spending yet',
    emptyNoCategoriesSub: 'Category breakdown will appear once transactions are added.',
  },
};

export function getInitialLanguage(): Language {
  const saved = localStorage.getItem('fintrack_lang');
  if (saved === 'vi' || saved === 'en') return saved;
  return 'vi'; // Default to Vietnamese for the user
}

export function saveLanguage(lang: Language): void {
  localStorage.setItem('fintrack_lang', lang);
}
