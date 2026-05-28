var APP_CONFIG = {
  ACTIONS: {
    CONFIG: "config",
    DASHBOARD: "dashboard",
    IMPORT_FINGERPRINTS: "importFingerprints",
    IMPORT_BATCH: "importBatch"
  },
  SHEETS: {
    CATEGORY_SETUP: "Category Setup",
    EXPENSES: "Expenses",
    INCOME: "Income",
    BUDGET_TARGETS: "Budget Targets"
  },
  RANGES: {
    EXPENSE_CATEGORIES: "B3:B82",
    INCOME_CATEGORIES: "B85:B164"
  },
  BUDGET_TARGETS: {
    EXPENSE_START_ROW: 7,
    INCOME_START_ROW: 91,
    CATEGORY_COL: 2,
    MONTHLY_TARGET_COL: 7
  },
  ENTRY_METHOD: {
    MANUAL: "Manual",
    IMPORTER: "Importer"
  },
  SHEET_DATE_FORMAT: "MM-dd-yyyy",
  API_DATE_MONTH_FORMAT: "yyyy-MM",
  HEADERS: {
    EXPENSES_VISIBLE: [
      "Date",
      "Store / Vendor",
      "$ Amount",
      "Expense Category",
      "Notes",
      "Entry Method"
    ],
    INCOME_VISIBLE: [
      "Date",
      "Source",
      "$ Amount",
      "Income Category",
      "Notes",
      "Entry Method"
    ],
    METADATA: [
      "Source Account",
      "Original Date",
      "Original Amount",
      "Original Description",
      "Import Fingerprint",
      "Imported At"
    ]
  },
  SOURCE_ACCOUNTS: {
    CHEQUING: "chequing",
    CREDIT_CARD: "credit_card"
  }
};
