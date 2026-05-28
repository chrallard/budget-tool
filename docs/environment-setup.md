# Environment Setup

## Frontend

Set these environment variables in your local shell or `.env.local` before running a live integration session:

- `VITE_APPS_SCRIPT_URL`
  - Value: Apps Script web app deployment URL.
- `VITE_USE_MOCK_DASHBOARD`
  - Set to `false` to call live backend.
- `VITE_USE_MOCK_IMPORT`
  - Set to `false` to call live backend.

Example:

```bash
export VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
export VITE_USE_MOCK_DASHBOARD="false"
export VITE_USE_MOCK_IMPORT="false"
npm install
npm run dev
```

## Test commands

- Full tests: `npm test`
- Build: `npm run build`
- Integration smoke slice: `npm test -- src/integration/__tests__/integration-smoke.test.ts`

## Expected runtime behavior

- Dashboard view loads config + selected-month dashboard rows from action endpoints.
- Import review loads config + duplicate metadata before CSV parsing/review.
- Successful approved-batch submission returns to dashboard and refreshes data.

## Troubleshooting

- If dashboard fails at load:
  - Verify `VITE_APPS_SCRIPT_URL`.
  - Verify Apps Script deployment is active and accessible to your account.
  - Check that `?action=config` and `?action=dashboard&month=YYYY-MM` return JSON envelope.
- If import context fails:
  - Verify `?action=config` and `?action=importFingerprints` responses.
  - Confirm `Category Setup` ranges contain categories in expected rows.
- If import submission fails:
  - Confirm request payload contains only approved rows.
  - Confirm selected categories exist in sheet ranges.
  - Confirm Apps Script write permissions to `Expenses` and `Income` tabs.
