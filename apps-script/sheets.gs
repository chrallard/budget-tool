function getSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw apiError_("SHEET_READ_ERROR", "No active spreadsheet found.");
  }
  return ss;
}

function getSheetOrThrow_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw apiError_("SHEET_READ_ERROR", "Missing required sheet: " + sheetName + ".");
  }
  return sheet;
}

function getOrCreateHeaderMap_(sheet, requiredVisibleHeaders) {
  var headerRow = findHeaderRow_(sheet, requiredVisibleHeaders);
  var lastCol = Math.max(1, sheet.getLastColumn());
  var headerValues = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var headerMap = {};

  for (var i = 0; i < headerValues.length; i += 1) {
    var header = String(headerValues[i] || "").trim();
    if (header) {
      headerMap[header] = i + 1;
    }
  }

  var requiredAllHeaders = requiredVisibleHeaders.concat(APP_CONFIG.HEADERS.METADATA);
  for (var j = 0; j < requiredAllHeaders.length; j += 1) {
    var required = requiredAllHeaders[j];
    if (!headerMap[required]) {
      var appendCol = sheet.getLastColumn() + 1;
      sheet.getRange(headerRow, appendCol).setValue(required);
      headerMap[required] = appendCol;
    }
  }

  headerMap.__headerRow = headerRow;

  return headerMap;
}

function findHeaderRow_(sheet, requiredVisibleHeaders) {
  var lastRow = Math.max(1, sheet.getLastRow());
  var lastCol = Math.max(1, sheet.getLastColumn());
  var maxScanRows = Math.min(lastRow, 30);

  var bestRow = 1;
  var bestScore = -1;

  for (var rowIndex = 1; rowIndex <= maxScanRows; rowIndex += 1) {
    var rowValues = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    var present = {};

    for (var c = 0; c < rowValues.length; c += 1) {
      var header = String(rowValues[c] || "").trim();
      if (header) {
        present[header] = true;
      }
    }

    var score = 0;
    for (var i = 0; i < requiredVisibleHeaders.length; i += 1) {
      if (present[requiredVisibleHeaders[i]]) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRow = rowIndex;

      if (score === requiredVisibleHeaders.length) {
        break;
      }
    }
  }

  return bestRow;
}

function ensureMetadataHeadersAndHide_(sheet, requiredVisibleHeaders) {
  var headerMap = getOrCreateHeaderMap_(sheet, requiredVisibleHeaders);

  for (var i = 0; i < APP_CONFIG.HEADERS.METADATA.length; i += 1) {
    var metadataHeader = APP_CONFIG.HEADERS.METADATA[i];
    var col = headerMap[metadataHeader];
    if (col) {
      sheet.hideColumns(col);
    }
  }

  return headerMap;
}

function backfillBlankEntryMethodToManual_(sheet, requiredVisibleHeaders) {
  var headerMap = getOrCreateHeaderMap_(sheet, requiredVisibleHeaders);
  var entryCol = headerMap["Entry Method"];
  if (!entryCol) {
    return;
  }

  var lastRow = sheet.getLastRow();
  var dataStartRow = Number(headerMap.__headerRow || 1) + 1;
  var lastCol = Math.max(sheet.getLastColumn(), entryCol);
  if (lastRow < dataStartRow) {
    return;
  }

  var dataRange = sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, lastCol);
  var values = dataRange.getValues();
  var updated = false;

  for (var i = 0; i < values.length; i += 1) {
    var row = values[i];
    var hasAnyData = false;

    for (var c = 0; c < row.length; c += 1) {
      if (String(row[c] || "").trim() !== "") {
        hasAnyData = true;
        break;
      }
    }

    if (!hasAnyData) {
      continue;
    }

    var entryValue = String(row[entryCol - 1] || "").trim();
    if (!entryValue) {
      row[entryCol - 1] = APP_CONFIG.ENTRY_METHOD.MANUAL;
      updated = true;
    }
  }

  if (updated) {
    dataRange.setValues(values);
  }
}

function ensureSheetSchemaAndEntryMethodRules_() {
  var expenses = getSheetOrThrow_(APP_CONFIG.SHEETS.EXPENSES);
  var income = getSheetOrThrow_(APP_CONFIG.SHEETS.INCOME);

  ensureMetadataHeadersAndHide_(expenses, APP_CONFIG.HEADERS.EXPENSES_VISIBLE);
  ensureMetadataHeadersAndHide_(income, APP_CONFIG.HEADERS.INCOME_VISIBLE);

  backfillBlankEntryMethodToManual_(expenses, APP_CONFIG.HEADERS.EXPENSES_VISIBLE);
  backfillBlankEntryMethodToManual_(income, APP_CONFIG.HEADERS.INCOME_VISIBLE);
}

function readCategorySetup_() {
  var sheet = getSheetOrThrow_(APP_CONFIG.SHEETS.CATEGORY_SETUP);

  var expenseValues = sheet.getRange(APP_CONFIG.RANGES.EXPENSE_CATEGORIES).getValues();
  var incomeValues = sheet.getRange(APP_CONFIG.RANGES.INCOME_CATEGORIES).getValues();

  return {
    expenseCategories: flattenUniqueNonEmpty_(expenseValues),
    incomeCategories: flattenUniqueNonEmpty_(incomeValues)
  };
}

function readBudgetTargetsSection_(sheet, startRow) {
  var results = [];
  var row = startRow;
  var maxRows = Math.max(0, sheet.getMaxRows() - startRow + 1);

  if (maxRows === 0) {
    return results;
  }

  var values = sheet
    .getRange(
      startRow,
      APP_CONFIG.BUDGET_TARGETS.CATEGORY_COL,
      maxRows,
      APP_CONFIG.BUDGET_TARGETS.MONTHLY_TARGET_COL - APP_CONFIG.BUDGET_TARGETS.CATEGORY_COL + 1
    )
    .getValues();

  for (var i = 0; i < values.length; i += 1) {
    var rowValues = values[i];
    var category = String(rowValues[0] || "").trim();

    if (!category) {
      break;
    }

    var amountValue = rowValues[APP_CONFIG.BUDGET_TARGETS.MONTHLY_TARGET_COL - APP_CONFIG.BUDGET_TARGETS.CATEGORY_COL];
    var parsed = toNullableNumber_(amountValue);

    if (parsed !== null) {
      results.push({
        category: category,
        amount: parsed
      });
    }

    row += 1;
  }

  return results;
}

function readBudgetTargets_() {
  var sheet = getSheetOrThrow_(APP_CONFIG.SHEETS.BUDGET_TARGETS);

  var expenseTargets = readBudgetTargetsSection_(sheet, APP_CONFIG.BUDGET_TARGETS.EXPENSE_START_ROW);
  var incomeTargets = readBudgetTargetsSection_(sheet, APP_CONFIG.BUDGET_TARGETS.INCOME_START_ROW);

  return expenseTargets.concat(incomeTargets);
}

function getSheetDataRows_(sheet, headerMap) {
  var lastRow = sheet.getLastRow();
  var dataStartRow = Number((headerMap && headerMap.__headerRow) || 1) + 1;
  if (lastRow < dataStartRow) {
    return [];
  }

  var lastCol = sheet.getLastColumn();
  var data = sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, lastCol).getValues();
  return data;
}

function appendRowByHeaders_(sheet, headerMap, fieldValuesByHeader) {
  var lastCol = sheet.getLastColumn();
  var row = [];
  for (var i = 1; i <= lastCol; i += 1) {
    row.push("");
  }

  var keys = Object.keys(fieldValuesByHeader);
  for (var k = 0; k < keys.length; k += 1) {
    var header = keys[k];
    var col = headerMap[header];
    if (col) {
      row[col - 1] = fieldValuesByHeader[header];
    }
  }

  sheet.appendRow(row);
}

function flattenUniqueNonEmpty_(values) {
  var output = [];
  var seen = {};

  for (var i = 0; i < values.length; i += 1) {
    var value = String(values[i][0] || "").trim();
    if (!value || seen[value]) {
      continue;
    }
    seen[value] = true;
    output.push(value);
  }

  return output;
}

function toNullableNumber_(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  var numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!isFinite(numeric)) {
    return null;
  }

  return numeric;
}

function normalizeToMmDdYyyy_(input) {
  if (input === null || input === undefined || String(input).trim() === "") {
    return "";
  }

  var tz = Session.getScriptTimeZone() || "Etc/UTC";

  if (Object.prototype.toString.call(input) === "[object Date]" && !isNaN(input.getTime())) {
    return Utilities.formatDate(input, tz, APP_CONFIG.SHEET_DATE_FORMAT);
  }

  var raw = String(input).trim();

  var isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return isoMatch[2] + "-" + isoMatch[3] + "-" + isoMatch[1];
  }

  var mdYDashMatch = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdYDashMatch) {
    return pad2_(mdYDashMatch[1]) + "-" + pad2_(mdYDashMatch[2]) + "-" + mdYDashMatch[3];
  }

  var mdYSlashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdYSlashMatch) {
    return pad2_(mdYSlashMatch[1]) + "-" + pad2_(mdYSlashMatch[2]) + "-" + mdYSlashMatch[3];
  }

  var parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, tz, APP_CONFIG.SHEET_DATE_FORMAT);
  }

  return "";
}

function monthFromMmDdYyyy_(dateString) {
  if (!dateString) {
    return "";
  }

  var match = String(dateString).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    return "";
  }

  return match[3] + "-" + match[1];
}

function currentMonthYyyyMm_() {
  var tz = Session.getScriptTimeZone() || "Etc/UTC";
  return Utilities.formatDate(new Date(), tz, APP_CONFIG.API_DATE_MONTH_FORMAT);
}

function pad2_(value) {
  return ("0" + value).slice(-2);
}
