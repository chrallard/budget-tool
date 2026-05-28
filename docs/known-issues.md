# Known Issues

Date: 2026-05-25
Owner: budget-integration

## Open integration risks

1. Browser CORS/auth redirect block when calling Apps Script from localhost.
- Impact: direct frontend `fetch` to Apps Script `exec` URL fails with CORS and `302 (Found)` redirect path, blocking live verification.
- Mitigation: CCR filed at `docs/contract-change-requests/CCR-20260525-apps-script-cors.md`; Architecture Lead decision required.

2. Live Apps Script runtime not validated in this workspace.
- Impact: End-to-end success depends on bound deployment permissions and actual sheet headers.
- Mitigation: Execute manual deployment smoke sequence in `docs/deployment-notes.md`.

3. Apps Script header drift risk in user spreadsheet.
- Impact: Renamed visible columns can break reads/writes and duplicate metadata extraction.
- Mitigation: Keep required headers unchanged per `docs/sheet-contract.md`.

4. Vendor similarity heuristic may require tuning with real-world transaction text.
- Impact: Duplicate warnings can over- or under-report possible duplicates.
- Mitigation: Monitor first imports and tune only via approved contract/process if behavior is unacceptable.

## Deferred (non-blocking for MVP)

1. PWA capability remains baseline-only.
- Manifest and install metadata exist, but no offline caching strategy is implemented.

2. No persisted audit trail for ignored transactions.
- This is expected for MVP and consistent with current constraints.
