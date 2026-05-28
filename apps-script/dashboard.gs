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
  var debugMode = !!(e && e.parameter && String(e.parameter.debug || "").trim() === "1");
  validateMonth_(month);

  var categories = readCategorySetup_();
  var budgetTargets = readBudgetTargets_();

  var expenses = readDashboardRows_(APP_CONFIG.SHEETS.EXPENSES, APP_CONFIG.HEADERS.EXPENSES_VISIBLE, "expense", month);
  var income = readDashboardRows_(APP_CONFIG.SHEETS.INCOME, APP_CONFIG.HEADERS.INCOME_VISIBLE, "income", month);

  var response = {
    month: month,
    expenseRows: expenses,
    incomeRows: income,
    budgetTargets: budgetTargets,
    expenseCategories: categories.expenseCategories
  };

  if (debugMode) {
    response.debug = buildDashboardDebugPayload_(month);
  }

  return response;
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

function buildDashboardDebugPayload_(month) {
  var ss = getSpreadsheet_();

  return {
    build: "2026-05-28-header-row-lock",
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    month: month,
    expenses: buildSingleSheetDebug_(APP_CONFIG.SHEETS.EXPENSES, APP_CONFIG.HEADERS.EXPENSES_VISIBLE, month),
    income: buildSingleSheetDebug_(APP_CONFIG.SHEETS.INCOME, APP_CONFIG.HEADERS.INCOME_VISIBLE, month)
  };
}

function buildSingleSheetDebug_(sheetName, requiredHeaders, month) {
  var sheet = getSheetOrThrow_(sheetName);
  var headerMap = getOrCreateHeaderMap_(sheet, requiredHeaders);
  var rows = getSheetDataRows_(sheet, headerMap);
  var dateCol = headerMap["Date"] - 1;
  var amountCol = headerMap["$ Amount"] - 1;
  var dataStartRow = Number(headerMap.__headerRow || 1) + 1;
  var sample = [];
  var skippedMissingDate = 0;
  var skippedMonthMismatch = 0;
  var skippedInvalidAmount = 0;
  var passed = 0;

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var rawDate = row[dateCol];
    var dateText = normalizeToMmDdYyyy_(rawDate);
    var rowMonth = monthFromMmDdYyyy_(dateText);
    var rawAmount = row[amountCol];
    var amount = toNullableNumber_(rawAmount);
    var skipReason = "";

    if (!dateText) {
      skippedMissingDate += 1;
      skipReason = "missing_or_unparseable_date";
    } else if (month && rowMonth !== month) {
      skippedMonthMismatch += 1;
      skipReason = "month_mismatch";
    } else if (amount === null) {
      skippedInvalidAmount += 1;
      skipReason = "invalid_amount";
    } else {
      passed += 1;
      skipReason = "included";
    }

    if (sample.length < 5) {
      sample.push({
        sheetRowNumber: dataStartRow + i,
        rawDate: String(rawDate === null || rawDate === undefined ? "" : rawDate),
        normalizedDate: dateText,
        rowMonth: rowMonth,
        rawAmount: String(rawAmount === null || rawAmount === undefined ? "" : rawAmount),
        parsedAmount: amount,
        skipReason: skipReason
      });
    }
  }

  return {
    sheetName: sheetName,
    headerRow: Number(headerMap.__headerRow || 1),
    dataStartRow: dataStartRow,
    lastRow: sheet.getLastRow(),
    lastColumn: sheet.getLastColumn(),
    headerColumns: {
      date: headerMap["Date"],
      amount: headerMap["$ Amount"],
      notes: headerMap["Notes"],
      entryMethod: headerMap["Entry Method"]
    },
    totalRowsRead: rows.length,
    includedRows: passed,
    skipped: {
      missingOrUnparseableDate: skippedMissingDate,
      monthMismatch: skippedMonthMismatch,
      invalidAmount: skippedInvalidAmount
    },
    sampleRows: sample
  };
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
  var dataStartRow = Number(headerMap.__headerRow || 1) + 1;
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
      rowNumber: dataStartRow + i,
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
