# Deployment Notes

Date: 2026-05-25
Owner: budget-integration

## Apps Script deployment requirements

- Deploy as web app.
- Execute as: `Me`.
- Access: `Only myself`.
- Use action-based routing actions:
  - `config`
  - `dashboard`
  - `importFingerprints`
  - `importBatch`

## Frontend deployment/runtime requirements

- Frontend environment must include `VITE_APPS_SCRIPT_URL`.
- Production runtime must disable mocks:
  - `VITE_USE_MOCK_DASHBOARD=false`
  - `VITE_USE_MOCK_IMPORT=false`

## Known Browser Runtime Limitation

- During live verification from localhost, direct browser calls to Apps Script can fail with CORS and a `302` redirect response path.
- This prevents frontend JavaScript from reading API responses even when the endpoint exists.
- Track and resolve through CCR: `docs/contract-change-requests/CCR-20260525-apps-script-cors.md`.
- Until resolved, direct localhost browser verification is blocked.

## Post-deploy smoke sequence

1. Call `GET ?action=config` and verify categories/targets are returned.
2. Call `GET ?action=dashboard&month=YYYY-MM` and verify month-scoped rows.
3. Call `GET ?action=importFingerprints` and verify fingerprint metadata records.
4. Upload valid RBC CSV in app and complete review actions.
5. Submit approved rows and verify:
   - Expenses writes go to `Expenses`.
   - Income writes go to `Income`.
   - Entry method is `Importer`.
   - Metadata columns are populated.
6. Verify dashboard refresh reflects newly imported rows.

## Rollback/safety notes

- No shared contract docs were changed in this integration pass.
- If deployment smoke fails, keep mocks enabled temporarily and track the issue in `docs/known-issues.md`.
