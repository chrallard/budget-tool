var ALLOTMENT_HEADERS_ = ["Id", "Profit Month", "Name", "Amount", "Category", "Expense Ids"];

function handleAllotmentsAction_(e) {
  var profitMonth = e && e.parameter ? String(e.parameter.profitMonth || "").trim() : "";
  validateMonth_(profitMonth);
  return {
    allotments: readAllotmentsForMonth_(profitMonth)
  };
}

function handleSaveAllotmentAction_(e) {
  return {
    allotment: upsertAllotment_(parseJsonBody_(e))
  };
}

function handleDeleteAllotmentAction_(e) {
  var body = parseJsonBody_(e);
  var id = body && body.id ? String(body.id).trim() : "";
  if (!id) {
    throw apiError_("VALIDATION_ERROR", "id is required.");
  }

  deleteAllotmentById_(id);
  return { id: id };
}

function readAllotmentsForMonth_(profitMonth) {
  var sheet = getOrCreateAllotmentsSheet_();
  var headerMap = allotmentHeaderMap_(sheet);
  var values = sheet.getDataRange().getValues();
  var allotments = [];

  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    if (profitMonthFromCell_(row[headerMap["Profit Month"]]) !== profitMonth) {
      continue;
    }

    var parsed = allotmentFromRow_(row, headerMap);
    if (parsed) {
      allotments.push(parsed);
    }
  }

  return reconcileAllotmentLinks_(sheet, headerMap, allotments, shiftMonth_(profitMonth, 1));
}

function upsertAllotment_(body) {
  if (!body || Object.prototype.toString.call(body) !== "[object Object]") {
    throw apiError_("VALIDATION_ERROR", "Body must be a JSON object.");
  }

  var profitMonth = String(body.profitMonth || "").trim();
  validateMonth_(profitMonth);

  var name = String(body.name || "").trim();
  if (!name) {
    throw apiError_("VALIDATION_ERROR", "name is required.");
  }
  if (name.length > 80) {
    throw apiError_("VALIDATION_ERROR", "name must be 80 characters or fewer.");
  }

  var amount = toNullableNumber_(body.amount);
  if (amount === null || amount <= 0) {
    throw apiError_("VALIDATION_ERROR", "amount must be greater than zero.");
  }
  amount = Math.round(amount * 100) / 100;

  var category = String(body.category || "").trim();
  if (!category || !expenseCategoryExists_(category)) {
    throw apiError_("VALIDATION_ERROR", "category must be an expense category.");
  }

  var expenseIds = [];
  if (body.expenseIds !== undefined && body.expenseIds !== null) {
    if (Object.prototype.toString.call(body.expenseIds) !== "[object Array]") {
      throw apiError_("VALIDATION_ERROR", "expenseIds must be an array.");
    }
    expenseIds = uniqueExpenseIds_(parseExpenseIds_(body.expenseIds));
  }

  var spendingMonth = shiftMonth_(profitMonth, 1);
  var expenses = readExpenseLinkIndex_();
  var sheet = getOrCreateAllotmentsSheet_();
  var headerMap = allotmentHeaderMap_(sheet);
  var values = sheet.getDataRange().getValues();
  var id = String(body.id || "").trim() || Utilities.getUuid();
  var targetRow = 0;

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][headerMap["Id"]] || "").trim() === id) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    var existing = allotmentFromRow_(values[targetRow - 1], headerMap);
    if (existing && existing.category !== category && existing.expenseIds.length > 0) {
      throw apiError_("VALIDATION_ERROR", "Unlink expenses before changing the category.");
    }
  }

  var claimed = expenseIdsClaimedByOthers_(values, headerMap, id);
  for (var e = 0; e < expenseIds.length; e += 1) {
    var expenseId = expenseIds[e];
    var expense = expenses[expenseId];
    if (!expense || expense.category !== category || expense.month !== spendingMonth) {
      throw apiError_("VALIDATION_ERROR", "Expense must be in this category during the spending month.", {
        expenseId: expenseId
      });
    }
    if (claimed[expenseId]) {
      throw apiError_("VALIDATION_ERROR", "Expense is already linked to another allotment.", {
        expenseId: expenseId
      });
    }
  }

  var rowWidth = Math.max(sheet.getLastColumn(), ALLOTMENT_HEADERS_.length);
  var rowValues = targetRow > 0 ? values[targetRow - 1].slice() : [];
  while (rowValues.length < rowWidth) {
    rowValues.push("");
  }

  rowValues[headerMap["Id"]] = id;
  rowValues[headerMap["Profit Month"]] = profitMonth;
  rowValues[headerMap["Name"]] = name;
  rowValues[headerMap["Amount"]] = amount;
  rowValues[headerMap["Category"]] = category;
  rowValues[headerMap["Expense Ids"]] = expenseIds.join(",");

  if (targetRow === 0) {
    targetRow = Math.max(sheet.getLastRow(), 1) + 1;
  }

  sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  return {
    id: id,
    profitMonth: profitMonth,
    name: name,
    amount: amount,
    category: category,
    expenseIds: expenseIds
  };
}

function allotmentLinkError_(allotmentId, category, spendingMonth) {
  var allotment = findAllotmentById_(allotmentId);
  if (!allotment) {
    return "Allotment was not found.";
  }

  if (allotment.category !== category || shiftMonth_(allotment.profitMonth, 1) !== spendingMonth) {
    return "Allotment must match this category and spending month.";
  }

  return "";
}

function findAllotmentById_(allotmentId) {
  var sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEETS.ALLOTMENTS);
  if (!sheet) {
    return null;
  }

  var headerMap = allotmentHeaderMap_(sheet);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][headerMap["Id"]] || "").trim() === allotmentId) {
      return allotmentFromRow_(values[i], headerMap);
    }
  }

  return null;
}

function linkImportedExpense_(allotmentId, expenseId, category, spendingMonth) {
  var message = allotmentLinkError_(allotmentId, category, spendingMonth);
  if (message) {
    throw apiError_("VALIDATION_ERROR", message, { allotmentId: allotmentId });
  }

  var sheet = getOrCreateAllotmentsSheet_();
  var headerMap = allotmentHeaderMap_(sheet);
  var rowNumber = allotmentRowNumber_(sheet, headerMap, allotmentId);
  if (rowNumber === 0) {
    throw apiError_("VALIDATION_ERROR", "Allotment was not found.", { allotmentId: allotmentId });
  }

  var current = String(sheet.getRange(rowNumber, headerMap["Expense Ids"] + 1).getValue() || "");
  var ids = parseExpenseIds_(current);
  if (ids.indexOf(expenseId) === -1) {
    ids.push(expenseId);
  }

  sheet.getRange(rowNumber, headerMap["Expense Ids"] + 1).setValue(ids.join(","));
}

function deleteAllotmentById_(id) {
  var sheet = getOrCreateAllotmentsSheet_();
  var headerMap = allotmentHeaderMap_(sheet);
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][headerMap["Id"]] || "").trim() === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }

  throw apiError_("NOT_FOUND", "Allotment was not found.", { id: id });
}

function allotmentFromRow_(row, headerMap) {
  var id = String(row[headerMap["Id"]] || "").trim();
  var profitMonth = profitMonthFromCell_(row[headerMap["Profit Month"]]);
  var name = String(row[headerMap["Name"]] || "").trim();
  var amount = toNullableNumber_(row[headerMap["Amount"]]);
  var category = String(row[headerMap["Category"]] || "").trim();
  if (!id || !profitMonth || !name || amount === null || !category) {
    return null;
  }

  return {
    id: id,
    profitMonth: profitMonth,
    name: name,
    amount: amount,
    category: category,
    expenseIds: parseExpenseIds_(row[headerMap["Expense Ids"]])
  };
}

function reconcileAllotmentLinks_(sheet, headerMap, allotments, spendingMonth) {
  var expenses = readExpenseLinkIndex_();

  for (var i = 0; i < allotments.length; i += 1) {
    var allotment = allotments[i];
    var kept = [];

    for (var e = 0; e < allotment.expenseIds.length; e += 1) {
      var expenseId = allotment.expenseIds[e];
      var expense = expenses[expenseId];
      if (expense && expense.category === allotment.category && expense.month === spendingMonth) {
        kept.push(expenseId);
      }
    }

    if (kept.length !== allotment.expenseIds.length) {
      allotment.expenseIds = kept;
      var rowNumber = allotmentRowNumber_(sheet, headerMap, allotment.id);
      if (rowNumber > 0) {
        sheet.getRange(rowNumber, headerMap["Expense Ids"] + 1).setValue(kept.join(","));
      }
    }
  }

  return allotments;
}

function allotmentRowNumber_(sheet, headerMap, allotmentId) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][headerMap["Id"]] || "").trim() === allotmentId) {
      return i + 1;
    }
  }

  return 0;
}

function expenseIdsClaimedByOthers_(values, headerMap, allotmentId) {
  var claimed = {};

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][headerMap["Id"]] || "").trim() === allotmentId) {
      continue;
    }

    var ids = parseExpenseIds_(values[i][headerMap["Expense Ids"]]);
    for (var e = 0; e < ids.length; e += 1) {
      claimed[ids[e]] = true;
    }
  }

  return claimed;
}

function readExpenseLinkIndex_() {
  var sheet = getSheetOrThrow_(APP_CONFIG.SHEETS.EXPENSES);
  var headerMap = ensureExpenseRowIds_(sheet);
  var rows = getSheetDataRows_(sheet, headerMap);
  var index = {};

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var id = String(row[headerMap["Row Id"] - 1] || "").trim();
    var dateText = normalizeToMmDdYyyy_(row[headerMap["Date"] - 1]);
    var amount = toNullableNumber_(row[headerMap["$ Amount"] - 1]);
    if (!id || !dateText || amount === null) {
      continue;
    }

    index[id] = {
      month: monthFromMmDdYyyy_(dateText),
      category: String(row[headerMap["Expense Category"] - 1] || "").trim()
    };
  }

  return index;
}

function expenseCategoryExists_(category) {
  var categories = readCategorySetup_().expenseCategories;
  for (var i = 0; i < categories.length; i += 1) {
    if (categories[i] === category) {
      return true;
    }
  }

  return false;
}

function parseExpenseIds_(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Object.prototype.toString.call(value) !== "[object Array]") {
    value = String(value).split(",");
  }

  var ids = [];
  for (var i = 0; i < value.length; i += 1) {
    var id = String(value[i] || "").trim();
    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

function uniqueExpenseIds_(ids) {
  var seen = {};
  var unique = [];

  for (var i = 0; i < ids.length; i += 1) {
    if (!seen[ids[i]]) {
      seen[ids[i]] = true;
      unique.push(ids[i]);
    }
  }

  return unique;
}

function profitMonthFromCell_(value) {
  var text = yyyyMmFromText_(String(value || "").trim());
  if (text) {
    return text;
  }

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    var tz = Session.getScriptTimeZone() || "Etc/UTC";
    return Utilities.formatDate(value, tz, "yyyy-MM");
  }

  return "";
}

function yyyyMmFromText_(text) {
  var exact = text.match(/^(\d{4})-(\d{2})$/);
  if (exact) {
    return exact[1] + "-" + exact[2];
  }

  var day = text.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (day) {
    return day[1] + "-" + day[2];
  }

  return "";
}

function plainTextAllotmentProfitMonths_(sheet, headerMap) {
  var index = headerMap["Profit Month"];
  if (index === undefined) {
    return;
  }

  var column = index + 1;
  var lastRow = sheet.getLastRow();
  var normalized = [];
  var updated = false;

  if (lastRow >= 2) {
    var range = sheet.getRange(2, column, lastRow - 1, 1);
    var values = range.getValues();
    var displays = range.getDisplayValues();

    for (var i = 0; i < values.length; i += 1) {
      var fromDisplay = yyyyMmFromText_(String(displays[i][0] || "").trim());
      var month = fromDisplay || profitMonthFromCell_(values[i][0]);
      normalized.push([month]);
      if (String(values[i][0]) !== month) {
        updated = true;
      }
    }

    sheet.getRange(1, column, sheet.getMaxRows(), 1).setNumberFormat("@");
    if (updated) {
      range.setValues(normalized);
    }
    return;
  }

  sheet.getRange(1, column, sheet.getMaxRows(), 1).setNumberFormat("@");
}

function shiftMonth_(month, delta) {
  var parts = String(month).split("-");
  var shifted = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
  var monthNumber = String(shifted.getMonth() + 1);
  if (monthNumber.length < 2) {
    monthNumber = "0" + monthNumber;
  }

  return shifted.getFullYear() + "-" + monthNumber;
}

function getOrCreateAllotmentsSheet_() {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(APP_CONFIG.SHEETS.ALLOTMENTS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(APP_CONFIG.SHEETS.ALLOTMENTS);
    sheet.getRange(1, 1, 1, ALLOTMENT_HEADERS_.length).setValues([ALLOTMENT_HEADERS_]);
    sheet.getRange(1, 1, sheet.getMaxRows(), 1).setNumberFormat("@");
    sheet.hideSheet();
    return sheet;
  }

  if (!String(sheet.getRange(1, 1).getValue() || "").trim()) {
    sheet.getRange(1, 1, 1, ALLOTMENT_HEADERS_.length).setValues([ALLOTMENT_HEADERS_]);
    sheet.getRange(1, 1, sheet.getMaxRows(), 1).setNumberFormat("@");
  }

  return sheet;
}

function allotmentHeaderMap_(sheet) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    collapseDuplicateAllotmentColumns_(sheet);
    var map = ensureAllotmentHeaders_(sheet);
    plainTextAllotmentProfitMonths_(sheet, map);
    return map;
  } finally {
    lock.releaseLock();
  }
}

function ensureAllotmentHeaders_(sheet) {
  var map = readFirstAllotmentHeaderMap_(sheet);
  var nextColumn = sheet.getLastColumn();

  for (var r = 0; r < ALLOTMENT_HEADERS_.length; r += 1) {
    if (map[ALLOTMENT_HEADERS_[r]] === undefined) {
      nextColumn += 1;
      sheet.getRange(1, nextColumn).setValue(ALLOTMENT_HEADERS_[r]);
      map[ALLOTMENT_HEADERS_[r]] = nextColumn - 1;
    }
  }

  return map;
}

function readFirstAllotmentHeaderMap_(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var map = {};

  for (var i = 0; i < headers.length; i += 1) {
    var header = String(headers[i] || "").trim();
    if (header && map[header] === undefined) {
      map[header] = i;
    }
  }

  return map;
}

function collapseDuplicateAllotmentColumns_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var indexesByName = {};

  for (var i = 0; i < headers.length; i += 1) {
    var header = String(headers[i] || "").trim();
    if (!header) {
      continue;
    }
    if (!indexesByName[header]) {
      indexesByName[header] = [];
    }
    indexesByName[header].push(i);
  }

  var names = Object.keys(indexesByName);
  var duplicateColumns = [];

  for (var n = 0; n < names.length; n += 1) {
    var indexes = indexesByName[names[n]];
    for (var d = 1; d < indexes.length; d += 1) {
      duplicateColumns.push(indexes[d]);
    }
  }

  if (duplicateColumns.length === 0) {
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastColumn);
    var values = dataRange.getValues();

    for (var r = 0; r < values.length; r += 1) {
      for (var h = 0; h < names.length; h += 1) {
        var cols = indexesByName[names[h]];
        if (cols.length < 2) {
          continue;
        }

        var chosen = values[r][cols[0]];
        for (var c = cols.length - 1; c >= 1; c -= 1) {
          if (String(values[r][cols[c]] || "").trim() !== "") {
            chosen = values[r][cols[c]];
            break;
          }
        }
        values[r][cols[0]] = chosen;
      }
    }

    dataRange.setValues(values);
  }

  duplicateColumns.sort(function (left, right) {
    return right - left;
  });

  for (var x = 0; x < duplicateColumns.length; x += 1) {
    sheet.deleteColumn(duplicateColumns[x] + 1);
  }
}
