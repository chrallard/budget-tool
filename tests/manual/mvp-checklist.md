# MVP Manual QA Checklist

Date: 2026-05-24
Owner: budget-qa-test

## First app load

- App loads without console errors.
- Current month is selected by default on dashboard.
- No write calls are triggered on initial dashboard load.

## Config load failure

- Simulate config API failure.
- Confirm the UI shows a clear error state.
- Confirm no stale category data remains visible.

## Dashboard load success

- Load dashboard data for a month with expense, income, and refund rows.
- Confirm summary totals match sheet-backed rows.
- Confirm one card appears per expense category from config.

## Dashboard load failure

- Simulate dashboard API failure.
- Confirm the UI shows an error state and no misleading totals.

## Month selection

- Switch between at least two months.
- Confirm total spending, total income, and card values update.
- Confirm malformed dates are ignored rather than crashing the page.

## Chequing CSV import

- Upload a valid RBC chequing CSV.
- Confirm expense and income rows parse.
- Confirm original metadata is preserved for each reviewed transaction.

## Credit card CSV import

- Upload a valid RBC Visa CSV.
- Confirm source account is `credit_card`.
- Confirm card-payment rows are suggested as ignored.

## Duplicate handling

- Load duplicate metadata from backend.
- Confirm exact duplicates show confirmed warnings.
- Confirm possible duplicates show duplicate details and available actions.
- Confirm changing editable amount does not suppress an existing possible duplicate warning.

## Refund handling

- Review a refund transaction.
- Confirm it remains an expense with negative amount semantics.
- After import, confirm dashboard spending is reduced by the refund amount.

## Amount override

- Override a transaction amount during review.
- Confirm original amount remains available in metadata.
- Confirm edited value is the only value prepared for the final payload amount field.

## Submit success

- Approve a mixed batch of expense and income rows.
- Submit the batch.
- Confirm only approved rows are written.
- Confirm written rows have `Entry Method = Importer` and metadata columns populated.

## Submit failure

- Simulate backend validation or write failure.
- Confirm the UI does not claim success.
- Confirm failed rows are identified clearly.

## iPhone-sized screen layout

- Test at approximately 390px width.
- Confirm no horizontal scrolling on dashboard or review flow.
- Confirm primary actions remain reachable without overlap.

## PWA install and launch

- Verify manifest is discoverable.
- Verify add-to-home-screen/install prompt behavior is sane where supported.
- Launch from home screen and confirm the app still loads the dashboard.