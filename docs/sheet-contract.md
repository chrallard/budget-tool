# Google Sheet Contract (MVP)

## Tabs

The MVP must use and preserve only these tabs:

- `Category Setup`
- `Expenses`
- `Income`
- `Budget Targets`

No additional tab is required for MVP.

## Expenses Tab Contract

Required visible columns:

1. `Date`
2. `Store / Vendor`
3. `$ Amount`
4. `Expense Category`
5. `Notes`
6. `Entry Method`

Allowed `Entry Method` values:

- `Manual`
- `Importer`

Imported rows written by app must set `Entry Method` to `Importer`.

## Income Tab Contract

Required visible columns:

1. `Date`
2. `Source`
3. `$ Amount`
4. `Income Category`
5. `Notes`
6. `Entry Method`

Allowed `Entry Method` values:

- `Manual`
- `Importer`

Imported rows written by app must set `Entry Method` to `Importer`.

## Metadata Columns (Expenses and Income)

The importer may add these metadata columns to both tabs:

1. `Source Account`
2. `Original Date`
3. `Original Amount`
4. `Original Description`
5. `Import Fingerprint`
6. `Imported At`

Rules:

- Metadata fields are auto-populated on import writes.
- Metadata values are not user-entered.
- Metadata is required for duplicate detection and auditability.

## Row Write Mapping

### Expense write mapping

- `Date` <- `displayDate`
- `Store / Vendor` <- display vendor from transaction description normalization result
- `$ Amount` <- `editableAmount` (refunds allowed as negative)
- `Expense Category` <- `selectedCategory`
- `Notes` <- `notes` (or empty string)
- `Entry Method` <- `Importer`
- `Source Account` <- `sourceAccount`
- `Original Date` <- `originalDate`
- `Original Amount` <- `originalAmount`
- `Original Description` <- `originalDescription`
- `Import Fingerprint` <- `importFingerprint`
- `Imported At` <- backend write timestamp (ISO)

### Income write mapping

- `Date` <- `displayDate`
- `Source` <- display source from transaction description normalization result
- `$ Amount` <- `editableAmount`
- `Income Category` <- `selectedCategory`
- `Notes` <- `notes` (or empty string)
- `Entry Method` <- `Importer`
- `Source Account` <- `sourceAccount`
- `Original Date` <- `originalDate`
- `Original Amount` <- `originalAmount`
- `Original Description` <- `originalDescription`
- `Import Fingerprint` <- `importFingerprint`
- `Imported At` <- backend write timestamp (ISO)

## Read Mapping

### Category Setup

- Read expense categories from `Category Setup!B3:B82`.
- Read income categories from `Category Setup!B85:B164`.
- Frontend selectors must use these loaded values only.

### Budget Targets

- Read category targets from section-based mappings in `Budget Targets`:
	- Expense targets: `B` category + `G` monthly target, starting row `7`, read until blank category.
	- Income targets: `B` category + `G` monthly target, starting row `91`, read until blank category.
- Ignore computed summary blocks and implied annual columns.
- Categories with no target must remain in dashboard with target = missing.

## Data Behavior Rules

- Ignored and skipped transactions are not written to `Expenses` or `Income`.
- Internal transfers and credit card payments should be marked ignored and not written.
- Refunds are represented as negative expenses and reduce spending.
- Duplicate detection relies on metadata, especially `Import Fingerprint`.
- Dates written to `Expenses` and `Income` use strict `MM-DD-YYYY` format.
- Apps Script auto-hides metadata columns after ensuring they exist.
- Existing rows with blank `Entry Method` should be backfilled to `Manual`.

## Open Sheet Decisions

No open sheet mapping decisions remain for MVP kickoff.
