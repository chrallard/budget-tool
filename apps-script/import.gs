function handleImportBatchAction_(e, requestId) {
  ensureSheetSchemaAndEntryMethodRules_();

  var body = parseJsonBody_(e);
  var categories = readCategorySetup_();
  var approvedTransactions = validateImportBatchRequest_(body, categories);
  var skippedFingerprints = validateSkippedFingerprints_(body);

  var expensesSheet = getSheetOrThrow_(APP_CONFIG.SHEETS.EXPENSES);
  var incomeSheet = getSheetOrThrow_(APP_CONFIG.SHEETS.INCOME);

  var expensesHeaders = ensureMetadataHeadersAndHide_(expensesSheet, APP_CONFIG.HEADERS.EXPENSES_VISIBLE);
  var incomeHeaders = ensureMetadataHeadersAndHide_(incomeSheet, APP_CONFIG.HEADERS.INCOME_VISIBLE);

  var nowIso = new Date().toISOString();
  var writtenFingerprints = [];
  var result = {
    written: {
      expenses: 0,
      income: 0
    },
    skipped: 0,
    ignored: 0,
    failures: []
  };

  for (var i = 0; i < approvedTransactions.length; i += 1) {
    var tx = approvedTransactions[i];

    try {
      writeApprovedTransaction_(tx, expensesSheet, incomeSheet, expensesHeaders, incomeHeaders, nowIso);
      writtenFingerprints.push(String(tx.importFingerprint).trim());

      if (tx.direction === "expense") {
        result.written.expenses += 1;
      } else {
        result.written.income += 1;
      }
    } catch (error) {
      result.failures.push({
        id: tx.id,
        reason: String(error && error.message ? error.message : error)
      });
    }
  }

  var totalWritten = result.written.expenses + result.written.income;
  if (result.failures.length > 0 && totalWritten === 0) {
    return jsonError_("SHEET_WRITE_ERROR", "All writes failed.", { failures: result.failures }, requestId);
  }

  if (result.written.expenses > 0) {
    sortSheetRowsByDateDesc_(expensesSheet, expensesHeaders);
  }

  if (result.written.income > 0) {
    sortSheetRowsByDateDesc_(incomeSheet, incomeHeaders);
  }

  forgetSkippedFingerprints_(writtenFingerprints);
  rememberSkippedFingerprints_(skippedFingerprints, writtenFingerprints);

  return jsonSuccess_(result, requestId);
}

function validateSkippedFingerprints_(body) {
  if (body.skippedFingerprints === undefined || body.skippedFingerprints === null) {
    return [];
  }

  if (!Array.isArray(body.skippedFingerprints)) {
    throw apiError_("VALIDATION_ERROR", "skippedFingerprints must be an array.");
  }

  var fingerprints = [];
  var seen = {};

  for (var i = 0; i < body.skippedFingerprints.length; i += 1) {
    var fingerprint = String(body.skippedFingerprints[i] || "").trim();
    if (!fingerprint) {
      throw apiError_("VALIDATION_ERROR", "skippedFingerprints entries must be non-empty strings.");
    }
    if (fingerprint.length > 500) {
      throw apiError_("VALIDATION_ERROR", "skippedFingerprints entries are too long.");
    }
    if (!seen[fingerprint]) {
      seen[fingerprint] = true;
      fingerprints.push(fingerprint);
    }
  }

  return fingerprints;
}

function readSkippedFingerprints_() {
  var sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEETS.SKIPPED);
  if (!sheet) {
    return [];
  }

  var values = sheet.getDataRange().getValues();
  var fingerprints = [];

  for (var i = 1; i < values.length; i += 1) {
    var fingerprint = String(values[i][0] || "").trim();
    if (fingerprint) {
      fingerprints.push(fingerprint);
    }
  }

  return fingerprints;
}

function getOrCreateSkippedSheet_() {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(APP_CONFIG.SHEETS.SKIPPED);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(APP_CONFIG.SHEETS.SKIPPED);
    sheet.getRange(1, 1).setValue("Import Fingerprint");
    sheet.hideSheet();
  }

  return sheet;
}

function rememberSkippedFingerprints_(fingerprints, excludedFingerprints) {
  var excluded = {};
  var i;

  for (i = 0; i < excludedFingerprints.length; i += 1) {
    if (excludedFingerprints[i]) {
      excluded[excludedFingerprints[i]] = true;
    }
  }

  var toStore = [];
  for (i = 0; i < fingerprints.length; i += 1) {
    if (!excluded[fingerprints[i]]) {
      toStore.push(fingerprints[i]);
    }
  }

  if (toStore.length === 0) {
    return;
  }

  var sheet = getOrCreateSkippedSheet_();
  var existing = {};
  var values = sheet.getDataRange().getValues();

  for (i = 1; i < values.length; i += 1) {
    var current = String(values[i][0] || "").trim();
    if (current) {
      existing[current] = true;
    }
  }

  var rows = [];
  for (i = 0; i < toStore.length; i += 1) {
    if (!existing[toStore[i]]) {
      existing[toStore[i]] = true;
      rows.push([toStore[i]]);
    }
  }

  if (rows.length === 0) {
    return;
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 1).setValues(rows);
}

function forgetSkippedFingerprints_(fingerprints) {
  if (!fingerprints || fingerprints.length === 0) {
    return;
  }

  var sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEETS.SKIPPED);
  if (!sheet) {
    return;
  }

  var drop = {};
  for (var i = 0; i < fingerprints.length; i += 1) {
    if (fingerprints[i]) {
      drop[fingerprints[i]] = true;
    }
  }

  var values = sheet.getDataRange().getValues();
  for (var row = values.length; row >= 2; row -= 1) {
    var fingerprint = String(values[row - 1][0] || "").trim();
    if (drop[fingerprint]) {
      sheet.deleteRow(row);
    }
  }
}

function writeApprovedTransaction_(tx, expensesSheet, incomeSheet, expensesHeaders, incomeHeaders, nowIso) {
  var displayText = String(
    tx.displayNameOverride || tx.normalizedDescription || tx.originalDescription || ""
  ).trim();
  var common = {
    Date: normalizeToMmDdYyyy_(tx.displayDate),
    "$ Amount": Number(tx.editableAmount),
    Notes: String(tx.notes || "").trim(),
    "Entry Method": APP_CONFIG.ENTRY_METHOD.IMPORTER,
    "Source Account": tx.sourceAccount,
    "Original Date": String(tx.originalDate).trim(),
    "Original Amount": Number(tx.originalAmount),
    "Original Description": String(tx.originalDescription).trim(),
    "Import Fingerprint": String(tx.importFingerprint).trim(),
    "Imported At": nowIso
  };

  if (tx.direction === "expense") {
    var rowId = Utilities.getUuid();
    var allotmentId = String(tx.allotmentId || "").trim();
    appendRowByHeaders_(expensesSheet, expensesHeaders, mergeObjects_(common, {
      "Store / Vendor": displayText,
      "Expense Category": String(tx.selectedCategory).trim(),
      "Row Id": rowId
    }));
    if (allotmentId) {
      try {
        linkImportedExpense_(
          allotmentId,
          rowId,
          String(tx.selectedCategory).trim(),
          monthFromMmDdYyyy_(common.Date)
        );
      } catch (linkError) {
        deleteExpenseRowById_(expensesSheet, expensesHeaders, rowId);
        throw linkError;
      }
    }
  } else {
    appendRowByHeaders_(incomeSheet, incomeHeaders, mergeObjects_(common, {
      Source: displayText,
      "Income Category": String(tx.selectedCategory).trim()
    }));
  }
}

function deleteExpenseRowById_(sheet, headerMap, rowId) {
  var idCol = headerMap["Row Id"];
  if (!idCol || !rowId) {
    throw apiError_("SHEET_WRITE_ERROR", "Imported expense could not be linked, and the new row could not be removed.");
  }

  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(1, idCol, lastRow, 1).getValues();
  for (var i = values.length - 1; i >= 0; i -= 1) {
    if (String(values[i][0] || "").trim() === rowId) {
      sheet.deleteRow(i + 1);
      return;
    }
  }

  throw apiError_("SHEET_WRITE_ERROR", "Imported expense could not be linked, and the new row could not be removed.");
}

function mergeObjects_(a, b) {
  var out = {};
  var k;

  for (k in a) {
    if (Object.prototype.hasOwnProperty.call(a, k)) {
      out[k] = a[k];
    }
  }

  for (k in b) {
    if (Object.prototype.hasOwnProperty.call(b, k)) {
      out[k] = b[k];
    }
  }

  return out;
}
