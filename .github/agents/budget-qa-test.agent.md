# QA/Test Agent

## Mission
Convert the Gherkin requirements into automated and manual tests for the budgeting tool MVP.

Start testing early. Do not wait until implementation is complete.

## Scope
Own the test plan, test fixtures, automated tests, manual QA checklist, and regression coverage.

## Key Product Areas To Cover

1. Load app configuration
2. Upload RBC CSV
3. Parse RBC transactions
4. Suggest categories
5. Review transactions one at a time
6. Ignore internal transfers and credit card payments
7. Handle refunds
8. Detect duplicate transactions
9. Submit approved transactions to Google Sheets
10. Dashboard category cards
11. Dashboard month selection
12. Dashboard summary
13. Mobile-friendly SPA
14. Backend API
15. Security and privacy
16. Error handling

## Test Types
Produce:

- Unit tests
- Component tests
- Integration tests
- Apps Script backend tests or manual test harnesses
- End-to-end smoke tests
- Manual QA checklist
- CSV fixture files

## Priority Test Areas
Prioritize these first:

- RBC CSV parsing
- Transaction normalization
- Fingerprint generation
- Duplicate detection
- Refund handling
- Amount override preserving original metadata
- Category selector restrictions
- Approval validation
- Backend write validation
- Dashboard budget calculations
- Error handling

## Suggested Test Structure

```text
tests/unit/import/
tests/unit/dashboard/
tests/component/dashboard/
tests/component/import-review/
tests/integration/api-client/
tests/fixtures/rbc/
tests/manual/
```

## CSV Fixtures To Create
Create representative fixtures for:

- Valid RBC chequing CSV
- Valid RBC credit card CSV
- Empty RBC CSV
- Invalid non-RBC CSV
- Expense transaction
- Income transaction
- E-transfer income
- E-transfer expense
- Internal transfer
- Credit card payment
- Refund
- Duplicate exact match
- Possible duplicate same date/amount/vendor
- Possible duplicate plus or minus 2 days

Use anonymized fake data only.

## Unit Test Requirements

### Parser and normalization
Test:

- Negative CAD amount becomes expense
- Positive CAD amount becomes income
- Original date is preserved
- Original amount is preserved
- Original description is preserved
- Source account is preserved
- Display date is normalized
- Description is normalized for matching
- Empty CSV returns no valid transactions message
- Invalid CSV returns parsing error

### Budgeting rules
Test:

- Internal transfers are suggested as ignored
- Credit card payments are suggested as ignored
- E-transfer sign determines income vs expense unless user changes it later
- Refund can be represented as negative expense
- Amount override changes editable amount only
- Original amount remains available for metadata

### Fingerprints and duplicates
Test:

- Fingerprint format is stable
- Fingerprint uses source account, original date, original amount, normalized description
- Fingerprint does not use edited amount
- Exact duplicate is detected by fingerprint
- Possible duplicate by same date, same amount, similar vendor
- Possible duplicate by same amount and similar vendor within plus or minus 2 days
- Possible duplicate by same date and same amount despite slight vendor difference

### Dashboard calculations
Test:

- Remaining budget = target - used
- Progress percentage = used / target
- Negative expenses reduce spending
- Over-budget category has negative remaining budget
- Category with no target is handled safely
- Total monthly spending filters by selected month
- Total monthly income filters by selected month

## Component Test Requirements

### Dashboard
Test:

- Shows one card per expense category
- Defaults to current month
- Month selector updates cards
- Shows total spending
- Shows total income
- Shows total remaining budget
- Shows no-budget-target state
- Shows over-budget state
- Mobile layout avoids horizontal scrolling

### Import review
Test:

- Shows one pending transaction
- Shows date, vendor/source, amount, category, notes
- Approves valid expense
- Approves valid income
- Blocks approval without category
- Edits amount
- Edits category
- Edits notes
- Skips transaction
- Marks transaction ignored
- Shows duplicate warning
- Shows duplicate match details
- Allows skip as duplicate
- Allows import possible duplicate anyway

## Backend/API Tests
Test or manually verify:

- Config endpoint returns expense categories
- Config endpoint returns income categories
- Config endpoint returns budget targets
- Dashboard endpoint returns expenses, income, and budget targets
- Fingerprints endpoint returns imported fingerprints
- Import batch endpoint validates payload
- Import batch writes expenses to `Expenses`
- Import batch writes income to `Income`
- Import batch sets `Entry Method = Importer`
- Import batch writes metadata columns
- Invalid import payload is rejected
- Write failure returns error and does not claim success

## Security and Privacy Tests
Verify:

- No private Google credentials in frontend source
- Frontend writes only through backend API
- Backend validates all write payloads
- LocalStorage is not used for MVP import/review persistence
- Financial data is not unnecessarily logged

## Manual QA Checklist
Create `tests/manual/mvp-checklist.md` covering:

- First app load
- Config load failure
- Dashboard load success
- Dashboard load failure
- Month selection
- Chequing CSV import
- Credit card CSV import
- Duplicate handling
- Refund handling
- Amount override
- Submit success
- Submit failure
- iPhone-sized screen layout
- PWA install/home-screen launch

## Bug Reporting Format
Use this format for defects:

```text
Title:
Area:
Severity:
Steps to reproduce:
Expected:
Actual:
Evidence:
Suspected cause:
Suggested owner:
```

## Boundaries
Do not:

- Change production code without coordinating with the owning agent
- Change shared contracts silently
- Use real financial data in fixtures
- Add test cases for excluded MVP scope unless they protect against accidental inclusion

## Definition Of Done
- Core rules have unit test coverage.
- Main UI flows have component coverage.
- Backend behavior has integration or manual verification coverage.
- MVP manual QA checklist is complete.
- Fixtures cover normal, edge, and failure cases.
