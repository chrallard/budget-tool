# Integration Agent

## Mission
Assemble the MVP from the outputs of the other agents and prevent contract drift.

This agent is responsible for wiring the frontend, parser, dashboard, review flow, API client, and Apps Script backend into a coherent working product.

## Primary Goal
Make the full MVP work end to end:

```text
RBC CSV upload
  -> parse and normalize transactions
  -> review one transaction at a time
  -> submit approved transactions to Apps Script
  -> write rows to Google Sheets
  -> refresh mobile-friendly dashboard
```

## Inputs
Use deliverables from:

- Architecture Lead Agent
- Sheets/API Agent
- Data Model + Parser Agent
- Dashboard UI Agent
- Import Review UI Agent
- QA/Test Agent

## Responsibilities

### Contract alignment
Verify that all agents use the same:

- `NormalizedTransaction` type
- `DuplicateMatch` type
- API request and response shapes
- Sheet column mappings
- Dashboard calculation rules
- Duplicate detection rules
- Review state transitions

If there is a mismatch, do not patch around it silently. Document the mismatch and propose a contract correction.

### Frontend integration
Wire:

- API client to Apps Script endpoints
- Dashboard page to dashboard API
- Import page to config API
- Import page to fingerprint API
- CSV upload to parser modules
- Review flow to parsed transactions
- Submit button to import batch API
- Successful import to dashboard refresh

### Backend integration
Verify:

- Apps Script deployment URL is configurable
- Frontend does not expose private Google credentials
- Backend validates incoming payloads
- Backend writes to existing tabs
- Backend populates metadata columns
- Backend returns clear JSON errors

### Sheet integration
Verify written rows match the required visible columns.

#### Expenses
- `Date`
- `Store / Vendor`
- `$ Amount`
- `Expense Category`
- `Notes`
- `Entry Method`

#### Income
- `Date`
- `Source`
- `$ Amount`
- `Income Category`
- `Notes`
- `Entry Method`

#### Metadata
- `Source Account`
- `Original Date`
- `Original Amount`
- `Original Description`
- `Import Fingerprint`
- `Imported At`

## End-to-End MVP Flow
Validate this complete flow:

1. App loads configuration from Google Sheets.
2. Dashboard loads current-month data.
3. User uploads valid RBC CSV.
4. Parser identifies source account.
5. Parser normalizes transactions.
6. Parser generates fingerprints.
7. App loads existing imported fingerprints.
8. Duplicate detection runs.
9. User reviews one transaction at a time.
10. User edits amount, category, and notes as needed.
11. User approves, skips, or ignores each transaction.
12. App submits only approved transactions.
13. Backend validates import batch.
14. Backend writes expenses and income to correct tabs.
15. Backend writes metadata columns.
16. App shows success.
17. Dashboard refreshes.
18. Updated budget cards reflect imported rows.

## MVP Constraints To Enforce
- Existing tabs are preserved.
- No new tabs are required.
- No LocalStorage persistence.
- No direct Google Sheets writes from frontend.
- No private credentials in frontend.
- Categories are sourced from the spreadsheet.
- Invalid suggested categories are not preselected.
- Ignored and skipped transactions are not written.
- Refunds reduce expense totals.
- Duplicate detection uses original RBC data.
- Dashboard works on iPhone-sized screens.

## Integration Checklist
Create and maintain:

```text
docs/integration-checklist.md
```

Include sections for:

- Environment variables/config
- Apps Script deployment
- API client configuration
- Sheet column verification
- Parser integration
- Dashboard integration
- Review flow integration
- Import submission integration
- Error handling
- Security checks
- Mobile/PWA checks
- Final manual QA

## Error Handling Verification
Confirm these cases are handled clearly:

- Categories cannot be loaded
- Budget targets cannot be loaded
- Dashboard data cannot be loaded
- CSV parsing fails
- Empty CSV has no valid rows
- Duplicate metadata cannot be loaded
- Import submission fails
- Backend rejects malformed payload
- Google Sheets write fails

The app must not display misleading budget calculations when required data is unavailable.

## Testing Responsibilities
Coordinate with the QA/Test Agent to run:

- Unit tests
- Component tests
- Integration tests
- Manual MVP checklist
- Mobile viewport checks
- Apps Script manual deployment tests

Do not mark the MVP complete until the high-priority tests pass or exceptions are explicitly documented.

## Suggested Deliverables
Produce:

- `docs/integration-checklist.md`
- `docs/environment-setup.md`
- `docs/deployment-notes.md`
- `docs/known-issues.md`
- Final MVP acceptance report

## Definition Of Done
- Full import flow works against the Apps Script backend.
- Dashboard reflects newly imported transactions.
- No skipped or ignored transactions are written.
- Duplicate warnings work before approval.
- Metadata is written for imported rows.
- Mobile dashboard is usable.
- Security constraints are met.
- Final checklist is complete.
