// Security note:
// This web app must be deployed as owner-only for MVP:
// - Execute as: Me
// - Who has access: Only myself
// Access control is enforced in deployment settings, not in code.
function doGet(e) {
  return routeRequest_("GET", e);
}

function doPost(e) {
  return routeRequest_("POST", e);
}

function routeRequest_(method, e) {
  var requestId = Utilities.getUuid();

  try {
    var action = getAction_(method, e);
    if (!action) {
      return jsonError_(
        "BAD_REQUEST",
        "Missing action. Allowed actions: config, dashboard, importFingerprints, importBatch.",
        null,
        requestId
      );
    }

    switch (action) {
      case APP_CONFIG.ACTIONS.CONFIG:
        if (method !== "GET") {
          return jsonError_("BAD_REQUEST", "Action config requires GET.", null, requestId);
        }
        return jsonSuccess_(handleConfigAction_(e), requestId);

      case APP_CONFIG.ACTIONS.DASHBOARD:
        if (method !== "GET") {
          return jsonError_("BAD_REQUEST", "Action dashboard requires GET.", null, requestId);
        }
        return jsonSuccess_(handleDashboardAction_(e), requestId);

      case APP_CONFIG.ACTIONS.IMPORT_FINGERPRINTS:
        if (method !== "GET") {
          return jsonError_("BAD_REQUEST", "Action importFingerprints requires GET.", null, requestId);
        }
        return jsonSuccess_(handleImportFingerprintsAction_(e), requestId);

      case APP_CONFIG.ACTIONS.IMPORT_BATCH:
        if (method !== "POST") {
          return jsonError_("BAD_REQUEST", "Action importBatch requires POST.", null, requestId);
        }
        return handleImportBatchAction_(e, requestId);

      default:
        return jsonError_(
          "NOT_FOUND",
          "Unknown action: " + action + ". Allowed actions: config, dashboard, importFingerprints, importBatch.",
          null,
          requestId
        );
    }
  } catch (error) {
    return toApiErrorResponse_(error, requestId);
  }
}

function getAction_(method, e) {
  if (method === "GET") {
    if (!e || !e.parameter) {
      return "";
    }
    return String(e.parameter.action || "").trim();
  }

  if (method === "POST") {
    var body = parseJsonBody_(e);
    return String((body && body.action) || "").trim();
  }

  return "";
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw apiError_("BAD_REQUEST", "Request body is required.");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw apiError_("BAD_REQUEST", "Invalid JSON body.", { reason: String(error) });
  }
}

function jsonSuccess_(data, requestId) {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      data: data,
      meta: {
        requestId: requestId,
        generatedAt: new Date().toISOString()
      }
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(code, message, details, requestId) {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: false,
      error: {
        code: code,
        message: message,
        details: details || undefined
      },
      meta: {
        requestId: requestId,
        generatedAt: new Date().toISOString()
      }
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function apiError_(code, message, details) {
  return {
    isApiError: true,
    code: code,
    message: message,
    details: details || null
  };
}

function toApiErrorResponse_(error, requestId) {
  if (error && error.isApiError) {
    return jsonError_(error.code, error.message, error.details, requestId);
  }

  return jsonError_(
    "INTERNAL_ERROR",
    "Unexpected server error.",
    {
      reason: String(error)
    },
    requestId
  );
}
