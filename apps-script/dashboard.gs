function handleConfigAction_() {
  ensureSheetSchemaAndEntryMethodRules_();

  var categories = readCategorySetup_();
  var budgetTargets = readBudgetTargets_();

  return {
    expenseCategories: categories.expenseCategories,
    incomeCategories: categories.incomeCategories,
    budgetTargets: budgetTargets,
    constraints: {
      entryMethodValues: [APP_CONFIG.ENTRY_METHOD.MANUAL, APP_CONFIG.ENTRY_METHOD.IMPORTER],
      sourceOfTruth: "google_sheets",
      localStorageAllowed: false,
      newTabsAllowed: false
    }
  };
}

function handleDashboardAction_(e) {
  ensureSheetSchemaAndEntryMethodRules_();

  var month = (e && e.parameter && String(e.parameter.month || "").trim()) || currentMonthYyyyMm_();
  validateMonth_(month);

  var categories = readCategorySetup_();
  var budgetTargets = readBudgetTargets_();

  var expenses = readDashboardRows_(APP_CONFIG.SHEETS.EXPENSES, APP_CONFIG.HEADERS.EXPENSES_VISIBLE, "expense", month);
  var income = readDashboardRows_(APP_CONFIG.SHEETS.INCOME, APP_CONFIG.HEADERS.INCOME_VISIBLE, "income", month);

  return {
    month: month,
    expenseRows: expenses,
    incomeRows: income,
    budgetTargets: budgetTargets,
    expenseCategories: categories.expenseCategories
  };
}

function readDashboardRows_(sheetName, requiredHeaders, kind, month) {
  var sheet = getSheetOrThrow_(sheetName);
  var headerMap = getOrCreateHeaderMap_(sheet, requiredHeaders);
  var rows = getSheetDataRows_(sheet, headerMap);
  var results = [];

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var dateText = normalizeToMmDdYyyy_(row[headerMap["Date"] - 1]);
    if (!dateText) {
      continue;
    }

    var rowMonth = monthFromMmDdYyyy_(dateText);
    if (month && rowMonth !== month) {
      continue;
    }

    var amount = toNullableNumber_(row[headerMap["$ Amount"] - 1]);
    if (amount === null) {
      continue;
    }

    var notes = String(row[headerMap["Notes"] - 1] || "").trim();
    var entryMethod = String(row[headerMap["Entry Method"] - 1] || "").trim();

    if (kind === "expense") {
      results.push({
        date: dateText,
        vendor: String(row[headerMap["Store / Vendor"] - 1] || "").trim(),
        amount: amount,
        category: String(row[headerMap["Expense Category"] - 1] || "").trim(),
        notes: notes || undefined,
        entryMethod: entryMethod || undefined
      });
    } else {
      results.push({
        date: dateText,
        source: String(row[headerMap["Source"] - 1] || "").trim(),
        amount: amount,
        category: String(row[headerMap["Income Category"] - 1] || "").trim(),
        notes: notes || undefined,
        entryMethod: entryMethod || undefined
      });
    }
  }

  return results;
}

function handleImportFingerprintsAction_() {
  ensureSheetSchemaAndEntryMethodRules_();

  var records = readFingerprintRowsForSheet_(APP_CONFIG.SHEETS.EXPENSES, APP_CONFIG.HEADERS.EXPENSES_VISIBLE, "Expenses").concat(
    readFingerprintRowsForSheet_(APP_CONFIG.SHEETS.INCOME, APP_CONFIG.HEADERS.INCOME_VISIBLE, "Income")
  );

  return {
    records: records
  };
}

function readFingerprintRowsForSheet_(sheetName, requiredHeaders, outputName) {
  var sheet = getSheetOrThrow_(sheetName);
  var headerMap = getOrCreateHeaderMap_(sheet, requiredHeaders);
  var rows = getSheetDataRows_(sheet, headerMap);
  var results = [];

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var fingerprint = String(row[headerMap["Import Fingerprint"] - 1] || "").trim();
    if (!fingerprint) {
      continue;
    }

    var amount = toNullableNumber_(row[headerMap["$ Amount"] - 1]);
    if (amount === null) {
      continue;
    }

    var originalAmount = toNullableNumber_(row[headerMap["Original Amount"] - 1]);

    var vendorOrSourceHeader = outputName === "Expenses" ? "Store / Vendor" : "Source";
    results.push({
      sheetName: outputName,
      rowNumber: i + 2,
      date: normalizeToMmDdYyyy_(row[headerMap["Date"] - 1]),
      vendorOrSource: String(row[headerMap[vendorOrSourceHeader] - 1] || "").trim(),
      amount: amount,
      category:
        outputName === "Expenses"
          ? String(row[headerMap["Expense Category"] - 1] || "").trim()
          : String(row[headerMap["Income Category"] - 1] || "").trim(),
      importFingerprint: fingerprint,
      sourceAccount: String(row[headerMap["Source Account"] - 1] || "").trim() || undefined,
      originalDate: String(row[headerMap["Original Date"] - 1] || "").trim() || undefined,
      originalAmount: originalAmount === null ? undefined : originalAmount,
      originalDescription: String(row[headerMap["Original Description"] - 1] || "").trim() || undefined
    });
  }

  return results;
}
