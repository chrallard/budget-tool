function validateMonth_(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw apiError_("VALIDATION_ERROR", "month must be in YYYY-MM format.", { month: month });
  }

  var parts = month.split("-");
  var mm = Number(parts[1]);
  if (mm < 1 || mm > 12) {
    throw apiError_("VALIDATION_ERROR", "month must have a valid month value (01-12).", { month: month });
  }
}

function validateImportBatchRequest_(body, categories) {
  if (!body || Object.prototype.toString.call(body) !== "[object Object]") {
    throw apiError_("VALIDATION_ERROR", "Body must be a JSON object.");
  }

  if (body.action && body.action !== APP_CONFIG.ACTIONS.IMPORT_BATCH) {
    throw apiError_("VALIDATION_ERROR", "action must be importBatch for this endpoint.", {
      action: body.action
    });
  }

  var approvedTransactions = body.approvedTransactions;
  if (!approvedTransactions || !Array.isArray(approvedTransactions)) {
    throw apiError_("VALIDATION_ERROR", "approvedTransactions must be an array.");
  }

  if (body.month !== undefined && body.month !== null && String(body.month).trim() !== "") {
    validateMonth_(String(body.month).trim());
  }

  var expenseSet = asSet_(categories.expenseCategories);
  var incomeSet = asSet_(categories.incomeCategories);
  var errors = [];

  for (var i = 0; i < approvedTransactions.length; i += 1) {
    var tx = approvedTransactions[i];
    var rowErrors = validateSingleImportTransaction_(tx, expenseSet, incomeSet);
    if (rowErrors.length > 0) {
      errors.push({
        index: i,
        id: tx && tx.id ? tx.id : undefined,
        errors: rowErrors
      });
    }
  }

  if (errors.length > 0) {
    throw apiError_("VALIDATION_ERROR", "One or more approvedTransactions failed validation.", {
      transactionErrors: errors
    });
  }

  return approvedTransactions;
}

function validateSingleImportTransaction_(tx, expenseSet, incomeSet) {
  var errors = [];

  if (!tx || Object.prototype.toString.call(tx) !== "[object Object]") {
    errors.push("transaction must be an object");
    return errors;
  }

  if (!tx.id || String(tx.id).trim() === "") {
    errors.push("id is required");
  }

  if (tx.status !== undefined && tx.status !== null && String(tx.status).trim() !== "") {
    if (String(tx.status).trim() !== "approved") {
      errors.push("status must be approved when provided");
    }
  }

  if (tx.direction !== "expense" && tx.direction !== "income") {
    errors.push("direction must be income or expense");
  }

  var normalizedDate = normalizeToMmDdYyyy_(tx.displayDate);
  if (!normalizedDate) {
    errors.push("displayDate is required and must be parseable to MM-DD-YYYY");
  }

  if (!isFiniteNumber_(tx.editableAmount)) {
    errors.push("editableAmount must be numeric and finite");
  }

  if (!tx.selectedCategory || String(tx.selectedCategory).trim() === "") {
    errors.push("selectedCategory is required");
  } else if (tx.direction === "expense" && !expenseSet[String(tx.selectedCategory).trim()]) {
    errors.push("selectedCategory must exist in expense categories");
  } else if (tx.direction === "income" && !incomeSet[String(tx.selectedCategory).trim()]) {
    errors.push("selectedCategory must exist in income categories");
  }

  if (!tx.importFingerprint || String(tx.importFingerprint).trim() === "") {
    errors.push("importFingerprint is required");
  }

  if (!tx.sourceAccount || (tx.sourceAccount !== APP_CONFIG.SOURCE_ACCOUNTS.CHEQUING && tx.sourceAccount !== APP_CONFIG.SOURCE_ACCOUNTS.CREDIT_CARD)) {
    errors.push("sourceAccount must be chequing or credit_card");
  }

  if (!tx.originalDate || String(tx.originalDate).trim() === "") {
    errors.push("originalDate is required");
  }

  if (!isFiniteNumber_(tx.originalAmount)) {
    errors.push("originalAmount must be numeric and finite");
  }

  if (!tx.originalDescription || String(tx.originalDescription).trim() === "") {
    errors.push("originalDescription is required");
  }

  if (!tx.normalizedDescription || String(tx.normalizedDescription).trim() === "") {
    errors.push("normalizedDescription is required");
  }

  if (tx.displayNameOverride !== undefined && tx.displayNameOverride !== null) {
    if (typeof tx.displayNameOverride !== "string") {
      errors.push("displayNameOverride must be a string when provided");
    } else if (String(tx.displayNameOverride).trim() === "") {
      errors.push("displayNameOverride must not be blank when provided");
    }
  }

  return errors;
}

function asSet_(values) {
  var out = {};
  for (var i = 0; i < values.length; i += 1) {
    out[String(values[i]).trim()] = true;
  }
  return out;
}

function isFiniteNumber_(value) {
  if (typeof value === "number") {
    return isFinite(value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    return isFinite(Number(value));
  }

  return false;
}
