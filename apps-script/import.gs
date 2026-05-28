function handleImportBatchAction_(e, requestId) {
  ensureSheetSchemaAndEntryMethodRules_();

  var body = parseJsonBody_(e);
  var categories = readCategorySetup_();
  var approvedTransactions = validateImportBatchRequest_(body, categories);

  var expensesSheet = getSheetOrThrow_(APP_CONFIG.SHEETS.EXPENSES);
  var incomeSheet = getSheetOrThrow_(APP_CONFIG.SHEETS.INCOME);

  var expensesHeaders = ensureMetadataHeadersAndHide_(expensesSheet, APP_CONFIG.HEADERS.EXPENSES_VISIBLE);
  var incomeHeaders = ensureMetadataHeadersAndHide_(incomeSheet, APP_CONFIG.HEADERS.INCOME_VISIBLE);

  var nowIso = new Date().toISOString();
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

  return jsonSuccess_(result, requestId);
}

function writeApprovedTransaction_(tx, expensesSheet, incomeSheet, expensesHeaders, incomeHeaders, nowIso) {
  var displayText = String(tx.normalizedDescription || tx.originalDescription || "").trim();
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
    appendRowByHeaders_(expensesSheet, expensesHeaders, mergeObjects_(common, {
      "Store / Vendor": displayText,
      "Expense Category": String(tx.selectedCategory).trim()
    }));
  } else {
    appendRowByHeaders_(incomeSheet, incomeHeaders, mergeObjects_(common, {
      Source: displayText,
      "Income Category": String(tx.selectedCategory).trim()
    }));
  }
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
