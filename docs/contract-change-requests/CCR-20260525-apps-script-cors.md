# Contract Change Request v2: Apps Script CORS and Auth Redirect Limitation

Date: 2026-05-25
Requester: budget-integration
Status: Approved

## Current Contract Excerpt

From the architecture contract:

- `React SPA -> Google Apps Script API -> Google Sheets`
- `Frontend must not write directly to Google Sheets.`

From the integration/deployment flow:

- Frontend calls Apps Script action endpoints directly from browser runtime.

Clarification for v2:

- The required architecture remains logically unchanged: `React SPA -> Google Apps Script API -> Google Sheets`.
- The requested change is to transport rules only, not to the system-of-record or API action contract.

## Problem and Impact

Observed in live verification from `http://localhost:5173` against deployed Apps Script web app URL:

- Browser request to `.../exec?action=config` fails with CORS.
- Console shows `302 (Found)` followed by `No 'Access-Control-Allow-Origin' header`.
- Browser cannot read API responses, so direct frontend-to-Apps Script flow is blocked in this environment.

Impact:

- End-to-end release gate cannot be completed from localhost direct browser calls.
- Current contract does not define an approved integration pattern for cross-origin environments where Apps Script redirects or omits CORS headers.

## Proposed Change (v2)

Keep architecture diagram unchanged and add one approved transport adapter path for MVP verification:

1. Approved MVP path: same-origin transport adapter endpoint `/api/apps-script`.
2. SPA calls `/api/apps-script?action=<action>` on the same origin as the frontend.
3. Adapter forwards request to Apps Script `exec` URL and returns response body/status to SPA.
4. Adapter does not modify action names, payload shapes, or envelope schema.
5. Existing direct browser-to-Apps-Script calls remain optional only when CORS/auth behavior allows them.

This is an allowed transport adapter under the existing architecture contract, not an architecture replacement.

## Acceptance Criteria

1. No browser CORS/auth-redirect failure for all actions:
	- `config`
	- `dashboard`
	- `importFingerprints`
	- `importBatch`
2. Owner-only auth model remains preserved for Apps Script deployment.
3. No request/response payload or schema change versus `docs/api-contract.md`.
4. Action names remain unchanged: `config`, `dashboard`, `importFingerprints`, `importBatch`.
5. End-to-end MVP smoke flow passes through adapter path.

## Affected Modules/Agents

- budget-integration
- budget-dashboard-ui
- budget-import-review-ui
- budget-sheets-api (deployment guidance)
- budget-qa-test (live verification procedures)

## Migration and Backward Compatibility Notes

- No data model or API payload change required.
- Existing action names remain unchanged: `config`, `dashboard`, `importFingerprints`, `importBatch`.
- Existing Apps Script backend implementation can remain as-is.
- Frontend API client can be retargeted from Apps Script URL to same-origin adapter URL without changing request/response shapes.

## Recommended Contract Doc Update Order (post-approval)

1. `docs/architecture.md` (add allowed transport-adapter note; keep diagram unchanged)
2. `docs/api-contract.md` (transport note only, no schema changes)
3. `docs/implementation-assumptions.md`
4. `docs/open-decisions.md`

## Approval Evidence

- Contract updates completed in the approved order.
- Adapter-path smoke reference: `npm test -- src/integration/__tests__/integration-smoke.test.ts`
