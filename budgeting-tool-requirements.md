# Budgeting Tool Requirements

## Purpose

Build a personal budgeting tool that makes it easy to understand how much spending room remains in each monthly budget category.

The system has two primary flows:

1. **RBC CSV to Google Sheets importer**
2. **Google Sheets to mobile-friendly dashboard**

Google Sheets is the source of truth. The app should write approved imported transactions directly to Google Sheets through a safe backend layer.

---

## Current Google Sheet Structure

The existing Google Sheet tabs should be preserved for MVP:

- `Category Setup`
- `Expenses`
- `Income`
- `Budget Targets`

No new tabs are required for MVP.

---

## Current Visible Sheet Columns

### Expenses

Required visible columns:

- `Date`
- `Store / Vendor`
- `$ Amount`
- `Expense Category`
- `Notes`
- `Entry Method`

### Income

Required visible columns:

- `Date`
- `Source`
- `$ Amount`
- `Income Category`
- `Notes`
- `Entry Method`

### Entry Method Values

Allowed values:

- `Manual`
- `Importer`

Rows created by the tool should use `Importer`.

Rows entered manually should use `Manual` or be blank until manually updated.

---

## Hidden Metadata Columns

The app may add hidden metadata columns to both the `Expenses` and `Income` tabs.

These columns should be populated automatically by the importer and should not require manual user input.

Recommended hidden columns:

- `Source Account`
- `Original Date`
- `Original Amount`
- `Original Description`
- `Import Fingerprint`
- `Imported At`

Metadata columns are used for duplicate detection and auditability.

---

## Existing Category List

Expense categories are defined in the spreadsheet and include:

- Donations
- Mortgage
- Enbridge
- Hydro
- Internet
- Water
- Hot water
- Property tax
- Food
- Food out
- Insurance
- Gas
- Car maintenance
- Home
- Phone
- Fitness
- Rent
- Medical
- Entertainment
- Public transportation
- Travel
- Gifts
- Coffee out
- _Other tax
- Clothing
- Other
- Pets
- Coffee in

The app should read categories from the `Category Setup` tab rather than hardcoding the definitive list.

Hardcoded category suggestion rules are allowed for MVP, but the final category selector must only allow categories sourced from the spreadsheet.

---

## Architecture

Recommended MVP architecture:

```text
React SPA
  -> Google Apps Script API
    -> Google Sheets
```

### React SPA Responsibilities

- Upload RBC CSV files
- Parse CSV rows in the browser
- Normalize transactions into an internal schema
- Suggest transaction categories
- Present one transaction at a time for review
- Allow edits before approval
- Submit approved transactions to Google Apps Script
- Read dashboard data from Google Apps Script
- Render mobile-friendly dashboard cards

### Google Apps Script Responsibilities

- Read data from Google Sheets
- Write approved income and expense rows to Google Sheets
- Populate hidden metadata columns automatically
- Return categories and budget targets
- Return existing imported fingerprints for duplicate detection
- Protect write access from direct public browser access where possible

### Google Sheets Responsibilities

- Store categories
- Store budget targets
- Store expense rows
- Store income rows
- Store importer metadata
- Remain the source of truth

---

## Internal Transaction Schema

The app should normalize RBC CSV rows into an internal transaction object before review.

```ts
type NormalizedTransaction = {
  id: string;
  sourceAccount: "chequing" | "credit_card";
  originalDate: string;
  displayDate: string;
  originalDescription: string;
  normalizedDescription: string;
  originalAmount: number;
  editableAmount: number;
  direction: "income" | "expense";
  suggestedCategory?: string;
  selectedCategory?: string;
  notes?: string;
  status: "pending" | "approved" | "skipped" | "ignored";
  ignoreReason?: "internal_transfer" | "credit_card_payment" | "duplicate" | "other";
  duplicateStatus: "not_duplicate" | "possible_duplicate" | "confirmed_duplicate";
  duplicateMatches?: DuplicateMatch[];
  importFingerprint: string;
};
```

```ts
type DuplicateMatch = {
  sheetName: "Expenses" | "Income";
  rowNumber?: number;
  date: string;
  vendorOrSource: string;
  amount: number;
  category: string;
  importFingerprint?: string;
  matchReason: string;
};
```

---

## Important Budgeting Rules

### Internal Transfers

Internal transfers should not affect budget totals.

Examples:

- moving money between user-owned accounts
- account transfers
- Visa payment from chequing

These should be marked as ignored.

### Credit Card Payments

Credit card payments should be ignored and should not be recorded as expenses or income.

### E-Transfers

E-transfers should be treated according to their sign unless manually ignored or edited:

- positive amount = income
- negative amount = expense

### Refunds

Refunds should be treated as negative expenses in the relevant expense category when they offset a prior purchase.

Example:

```text
Original grocery purchase: Food expense $100
Refund: Food expense -$20
Net Food spending: $80
```

### Amount Overrides

The user may override the transaction amount during review.

Example:

```text
Original restaurant charge: $50
Friend reimbursed user with $25 cash
User overrides imported amount to $25
Category: Food out
Notes: Friend reimbursed $25 cash
```

The original RBC amount should still be stored in metadata for duplicate detection.

---

## Duplicate Detection Strategy

The importer should detect likely duplicates before the user approves a transaction.

### Import Fingerprint

Each imported transaction should receive an import fingerprint based on original RBC data, not edited budget data.

Recommended format:

```text
sourceAccount|originalDate|originalAmount|normalizedDescription
```

Example:

```text
chequing|2026-04-29|-50.00|ETRANSFER
credit_card|2026-04-24|-151.11|LOBLAWS
```

### Exact Duplicate

A transaction is an exact duplicate when its import fingerprint matches an existing imported row.

### Possible Duplicate

A transaction is a possible duplicate when one of the following is true:

- same date, same amount, and similar vendor/source
- same amount and similar vendor/source within plus or minus 2 days
- same date and same amount, even if vendor/source differs slightly

### Duplicate UX

When a possible duplicate is detected, the user should see the incoming transaction and matching existing row.

User actions:

- skip as duplicate
- import anyway
- edit transaction
- mark ignored

---

# Gherkin Requirements

## Feature: Load App Configuration

```gherkin
Feature: Load app configuration
  As a user
  I want the app to read categories and budget targets from Google Sheets
  So that the spreadsheet remains the source of truth

  Scenario: Load expense categories from the spreadsheet
    Given the Google Sheet has a Category Setup tab
    When the app loads configuration
    Then the app should read expense categories from the Category Setup tab
    And the app should use those categories in expense category selectors

  Scenario: Load income categories from the spreadsheet
    Given the Google Sheet has a Category Setup tab
    When the app loads configuration
    Then the app should read income categories from the Category Setup tab
    And the app should use those categories in income category selectors

  Scenario: Load budget targets from the spreadsheet
    Given the Google Sheet has a Budget Targets tab
    When the app loads dashboard data
    Then the app should read category budget targets from the Budget Targets tab

  Scenario: Preserve current tab structure
    Given the Google Sheet contains Category Setup, Expenses, Income, and Budget Targets tabs
    When the app reads or writes spreadsheet data
    Then the app should use the existing tabs
    And the app should not require new tabs for MVP
```

---

## Feature: Upload RBC CSV

```gherkin
Feature: Upload RBC CSV
  As a user
  I want to upload an RBC CSV file
  So that transactions can be imported without manual spreadsheet entry

  Scenario: Upload a valid RBC chequing CSV
    Given I am on the import page
    When I upload a valid RBC chequing CSV
    Then the app should parse the CSV
    And identify the source account as chequing
    And display the first parsed transaction for review

  Scenario: Upload a valid RBC credit card CSV
    Given I am on the import page
    When I upload a valid RBC credit card CSV
    Then the app should parse the CSV
    And identify the source account as credit_card
    And display the first parsed transaction for review

  Scenario: Upload an invalid CSV
    Given I am on the import page
    When I upload a CSV that does not match the expected RBC structure
    Then the app should show an error message
    And no transactions should be queued for review

  Scenario: Upload an empty CSV
    Given I am on the import page
    When I upload an RBC CSV with no valid transaction rows
    Then the app should show a message that no transactions were found
```

---

## Feature: Parse RBC Transactions

```gherkin
Feature: Parse RBC transactions
  As a user
  I want RBC CSV rows normalized into transaction records
  So that they can be reviewed and imported consistently

  Scenario: Parse an expense transaction
    Given an RBC CSV row has a negative CAD amount
    When the app parses the row
    Then the app should create a normalized transaction
    And the transaction direction should be expense
    And the editable amount should be a positive expense amount unless the row represents a refund

  Scenario: Parse an income transaction
    Given an RBC CSV row has a positive CAD amount
    When the app parses the row
    Then the app should create a normalized transaction
    And the transaction direction should be income

  Scenario: Preserve original RBC fields
    Given an RBC CSV row is parsed
    When the app creates a normalized transaction
    Then the app should preserve the original transaction date
    And preserve the original amount
    And preserve the original description
    And preserve the source account

  Scenario: Normalize dates for spreadsheet output
    Given an RBC CSV row contains a transaction date
    When the app prepares the row for spreadsheet output
    Then the date should be formatted consistently for the Expenses or Income tab

  Scenario: Normalize transaction descriptions
    Given an RBC CSV row contains a description
    When the app parses the row
    Then the app should create a normalized description for matching and duplicate detection
    And the app should preserve the original description for metadata
```

---

## Feature: Suggest Categories

```gherkin
Feature: Suggest categories
  As a user
  I want the app to suggest categories during import
  So that transaction review is faster

  Scenario: Suggest category from built-in keyword rules
    Given a parsed transaction description matches a built-in keyword rule
    When the transaction is shown for review
    Then the app should preselect the suggested category

  Scenario: Leave category blank when no suggestion exists
    Given a parsed transaction description does not match a built-in keyword rule
    When the transaction is shown for review
    Then the app should leave the category unselected
    And require me to choose a category before approval

  Scenario: Restrict expense categories to spreadsheet categories
    Given I am reviewing an expense transaction
    When I open the category selector
    Then I should only see expense categories loaded from the Category Setup tab

  Scenario: Restrict income categories to spreadsheet categories
    Given I am reviewing an income transaction
    When I open the category selector
    Then I should only see income categories loaded from the Category Setup tab

  Scenario: Ignore invalid suggested category
    Given a built-in keyword rule suggests a category
    But that category does not exist in the Category Setup tab
    When the transaction is shown for review
    Then the app should not preselect the invalid category
    And the transaction should require manual category selection
```

---

## Feature: Review Transactions One At A Time

```gherkin
Feature: Review transactions one at a time
  As a user
  I want to review one transaction at a time
  So that import decisions require low cognitive load

  Scenario: Show one pending transaction
    Given parsed transactions are queued for review
    When the review screen loads
    Then the app should show one transaction card
    And the app should show the transaction date
    And the app should show the vendor or source
    And the app should show the amount
    And the app should show the selected or suggested category
    And the app should show notes

  Scenario: Approve a valid expense transaction
    Given I am reviewing an expense transaction
    And the transaction has a date, vendor, amount, and expense category
    When I approve the transaction
    Then the transaction should be marked approved
    And the next pending transaction should be shown

  Scenario: Approve a valid income transaction
    Given I am reviewing an income transaction
    And the transaction has a date, source, amount, and income category
    When I approve the transaction
    Then the transaction should be marked approved
    And the next pending transaction should be shown

  Scenario: Prevent approval without category
    Given I am reviewing a transaction with no selected category
    When I try to approve the transaction
    Then the app should show a validation message
    And the transaction should remain pending

  Scenario: Edit transaction amount before approval
    Given I am reviewing a transaction
    When I edit the amount
    Then the app should use the edited amount for the spreadsheet row
    And preserve the original amount in metadata

  Scenario: Edit transaction category before approval
    Given I am reviewing a transaction
    When I select a different category
    Then the app should use the selected category for the spreadsheet row

  Scenario: Edit transaction notes before approval
    Given I am reviewing a transaction
    When I edit the notes field
    Then the app should save those notes to the pending transaction

  Scenario: Skip a transaction
    Given I am reviewing a transaction
    When I skip the transaction
    Then the transaction should not be written to Expenses or Income
    And the next pending transaction should be shown

  Scenario: Mark a transaction ignored
    Given I am reviewing a transaction
    When I mark the transaction as ignored
    Then the transaction should not affect budget totals
    And the next pending transaction should be shown
```

---

## Feature: Ignore Internal Transfers And Credit Card Payments

```gherkin
Feature: Ignore internal transfers and credit card payments
  As a user
  I want internal transfers and credit card payments excluded from budgeting
  So that my spending and income totals are not distorted

  Scenario: Mark transaction as internal transfer
    Given I am reviewing a transaction
    When I mark it as an internal transfer
    Then the transaction should be ignored
    And it should not be written as an expense or income row
    And it should not affect dashboard totals

  Scenario: Mark transaction as credit card payment
    Given I am reviewing a transaction
    When I mark it as a credit card payment
    Then the transaction should be ignored
    And it should not be written as an expense or income row
    And it should not affect dashboard totals

  Scenario: Suggested ignored transaction still requires user confirmation
    Given a transaction description appears to be a credit card payment or internal transfer
    When the transaction is shown for review
    Then the app may suggest ignoring it
    But the app should not ignore it without user confirmation
```

---

## Feature: Handle Refunds

```gherkin
Feature: Handle refunds
  As a user
  I want refunds to reduce spending in the correct category
  So that category totals remain accurate

  Scenario: Import a refund as negative expense
    Given I am reviewing a refund transaction
    When I categorize it as an expense category
    And I approve it as a refund
    Then the app should write it to the Expenses tab
    And the amount should reduce spending for that category

  Scenario: Preserve original refund amount
    Given a refund transaction is imported
    When the app writes it to the spreadsheet
    Then the original refund amount should be stored in metadata

  Scenario: Dashboard includes refund adjustment
    Given the Expenses tab contains a Food expense of 100
    And the Expenses tab contains a Food refund of -20
    When the dashboard calculates Food spending
    Then used budget for Food should be 80
```

---

## Feature: Detect Duplicate Transactions

```gherkin
Feature: Detect duplicate transactions
  As a user
  I want the importer to detect transactions that may already be imported
  So that I can upload overlapping RBC CSV exports without carefully trimming them first

  Scenario: Generate import fingerprint
    Given an RBC transaction is parsed
    When the app normalizes the transaction
    Then the app should generate an import fingerprint from source account, original date, original amount, and normalized description

  Scenario: Detect exact duplicate by fingerprint
    Given an imported row already exists with an import fingerprint
    When a parsed transaction has the same import fingerprint
    Then the app should mark the parsed transaction as a confirmed duplicate

  Scenario: Detect possible duplicate by same date amount and vendor
    Given an existing imported row has the same date, same amount, and similar vendor or source
    When a parsed transaction is reviewed
    Then the app should mark the parsed transaction as a possible duplicate

  Scenario: Detect possible duplicate within nearby date range
    Given an existing imported row has the same amount and similar vendor or source within plus or minus 2 days
    When a parsed transaction is reviewed
    Then the app should mark the parsed transaction as a possible duplicate

  Scenario: Show duplicate warning during review
    Given a parsed transaction is marked as a possible duplicate
    When the transaction card is shown
    Then the app should display a duplicate warning
    And show the matching existing transaction details

  Scenario: Skip duplicate transaction
    Given a transaction is marked as a duplicate
    When I choose skip as duplicate
    Then the transaction should not be written to Expenses or Income
    And the next pending transaction should be shown

  Scenario: Import possible duplicate anyway
    Given a transaction is marked as a possible duplicate
    When I choose import anyway
    Then the app should allow me to approve the transaction
    And the app should write it to the appropriate sheet after submission

  Scenario: Dedupe uses original amount after override
    Given an RBC transaction has an original amount of 50
    And I override the editable amount to 25
    When the app writes the transaction metadata
    Then the import fingerprint should still use the original amount of 50
```

---

## Feature: Submit Approved Transactions To Google Sheets

```gherkin
Feature: Submit approved transactions to Google Sheets
  As a user
  I want approved transactions written directly to Google Sheets
  So that the spreadsheet stays current

  Scenario: Submit approved expenses
    Given I have approved one or more expense transactions
    When I submit the import batch
    Then the app should write each approved expense to the Expenses tab

  Scenario: Submit approved income
    Given I have approved one or more income transactions
    When I submit the import batch
    Then the app should write each approved income transaction to the Income tab

  Scenario: Do not submit skipped transactions
    Given a transaction was skipped during review
    When I submit the import batch
    Then the skipped transaction should not be written to Expenses or Income

  Scenario: Do not submit ignored transactions
    Given a transaction was marked ignored during review
    When I submit the import batch
    Then the ignored transaction should not be written to Expenses or Income
    And it should not affect budget totals

  Scenario: Populate visible expense columns
    Given an approved expense transaction is submitted
    When the app writes the row to the Expenses tab
    Then it should populate Date
    And Store / Vendor
    And $ Amount
    And Expense Category
    And Notes
    And Entry Method should be Importer

  Scenario: Populate visible income columns
    Given an approved income transaction is submitted
    When the app writes the row to the Income tab
    Then it should populate Date
    And Source
    And $ Amount
    And Income Category
    And Notes
    And Entry Method should be Importer

  Scenario: Populate hidden metadata columns
    Given an approved transaction is submitted
    When the app writes the row to Google Sheets
    Then it should populate Source Account
    And Original Date
    And Original Amount
    And Original Description
    And Import Fingerprint
    And Imported At

  Scenario: Confirm successful submission
    Given approved transactions are submitted successfully
    When the write operation completes
    Then the app should show a success message
    And the dashboard data should refresh

  Scenario: Handle spreadsheet write failure
    Given approved transactions are being submitted
    When the Google Sheets write operation fails
    Then the app should show an error message
    And the app should not claim the import completed successfully
```

---

## Feature: Dashboard Category Cards

```gherkin
Feature: Dashboard category cards
  As a user
  I want one card per expense category
  So that I can quickly see how much room remains in each category

  Scenario: Show one card per expense category
    Given expense categories exist in the Category Setup tab
    When the dashboard loads
    Then the dashboard should show one card for each expense category

  Scenario: Show category budget details
    Given an expense category has a monthly budget target
    And expenses exist for the selected month
    When the category card is shown
    Then the card should display the category name
    And the total budget
    And the used budget
    And the remaining budget
    And a progress indicator

  Scenario: Calculate remaining budget
    Given a category has a monthly budget target of 500
    And spending for the selected month is 325
    When the dashboard calculates remaining budget
    Then remaining budget should be 175

  Scenario: Calculate progress percentage
    Given a category has a monthly budget target of 500
    And spending for the selected month is 325
    When the dashboard calculates progress
    Then progress should be 65 percent

  Scenario: Show over-budget category
    Given a category has a monthly budget target of 500
    And spending for the selected month is 575
    When the category card is shown
    Then remaining budget should be -75
    And the card should be visually marked as over budget

  Scenario: Include negative expenses in spending calculation
    Given a category has expenses of 100 and -20 for the selected month
    When the dashboard calculates used budget
    Then used budget should be 80

  Scenario: Handle category with no budget target
    Given an expense category has no budget target
    When the dashboard shows the category card
    Then the card should indicate that no budget target is set
```

---

## Feature: Dashboard Month Selection

```gherkin
Feature: Dashboard month selection
  As a user
  I want the dashboard to show a selected month
  So that I can review current or past budget performance

  Scenario: Default to current month
    Given I open the dashboard
    When no month has been selected
    Then the dashboard should show the current month

  Scenario: Select a different month
    Given I am viewing the dashboard
    When I select a different month
    Then all category cards should update for the selected month

  Scenario: Filter expenses by selected month
    Given expenses exist across multiple months
    When I view a selected month
    Then the dashboard should only include expenses from that month in category card calculations

  Scenario: Filter income by selected month
    Given income rows exist across multiple months
    When I view a selected month
    Then the dashboard should only include income from that month in income calculations
```

---

## Feature: Dashboard Summary

```gherkin
Feature: Dashboard summary
  As a user
  I want high-level monthly budget totals
  So that I can understand my overall monthly position

  Scenario: Show total monthly spending
    Given expense rows exist for the selected month
    When the dashboard loads
    Then it should show total spending for the selected month

  Scenario: Show total monthly income
    Given income rows exist for the selected month
    When the dashboard loads
    Then it should show total income for the selected month

  Scenario: Show total remaining expense budget
    Given expense budget targets exist
    And expense rows exist for the selected month
    When the dashboard loads
    Then it should show total remaining expense budget for the selected month

  Scenario: Exclude ignored transactions from dashboard totals
    Given a transaction was marked ignored during import
    When the dashboard calculates totals
    Then the ignored transaction should not affect spending or income totals
```

---

## Feature: Mobile-Friendly SPA

```gherkin
Feature: Mobile-friendly SPA
  As a user
  I want the dashboard to work well on my iPhone
  So that I can quickly check budget room from my home screen

  Scenario: Render dashboard on mobile screen
    Given I open the app on an iPhone-sized screen
    When the dashboard loads
    Then category cards should be readable without horizontal scrolling

  Scenario: Save app to iPhone home screen
    Given the app includes a valid web app manifest
    When I save the app to my iPhone home screen
    Then the app should open as a standalone web app where supported

  Scenario: Dashboard is the default view
    Given I open the app from my home screen
    When the app loads successfully
    Then the monthly dashboard should be the default view
```

---

## Feature: Backend API

```gherkin
Feature: Backend API
  As the frontend app
  I want a backend API for Google Sheets access
  So that spreadsheet reads and writes are safe and consistent

  Scenario: Fetch app configuration
    Given the frontend requests app configuration
    When the backend receives the request
    Then it should return expense categories
    And income categories
    And budget targets

  Scenario: Fetch dashboard data
    Given the frontend requests dashboard data
    When the backend receives the request
    Then it should return expense rows
    And income rows
    And budget targets

  Scenario: Fetch import fingerprints
    Given the frontend prepares duplicate detection
    When the backend receives a fingerprint request
    Then it should return existing import fingerprints from imported rows

  Scenario: Submit import batch
    Given the frontend submits approved transactions
    When the backend receives the import batch
    Then it should validate the payload
    And write valid expenses to the Expenses tab
    And write valid income to the Income tab
    And populate metadata columns automatically

  Scenario: Reject invalid import payload
    Given the frontend submits malformed transaction data
    When the backend validates the payload
    Then the backend should reject the request
    And return an error message
```

---

## Feature: Security And Privacy

```gherkin
Feature: Security and privacy
  As a user
  I want my financial data protected
  So that only authorized app usage can read and write budget data

  Scenario: Do not expose private credentials in frontend
    Given the React app is hosted publicly
    When someone views the frontend source code
    Then private Google credentials should not be present

  Scenario: Use backend for spreadsheet writes
    Given the app needs to write to Google Sheets
    When the frontend submits approved transactions
    Then the write should go through the backend API
    And the frontend should not write directly using exposed private credentials

  Scenario: Do not use LocalStorage for MVP state
    Given the MVP app is running in the browser
    When the user imports or reviews transactions
    Then the app should not rely on LocalStorage for persistence
```

---

## Feature: Error Handling

```gherkin
Feature: Error handling
  As a user
  I want clear error messages
  So that I know what went wrong and how to recover

  Scenario: Category setup cannot be loaded
    Given the app cannot load categories from Google Sheets
    When the app starts
    Then the app should show an error message
    And importing should be disabled until categories are available

  Scenario: Budget targets cannot be loaded
    Given the app cannot load budget targets from Google Sheets
    When the dashboard loads
    Then the app should show an error message
    And avoid displaying misleading budget calculations

  Scenario: CSV parsing fails
    Given I upload a CSV file
    When parsing fails
    Then the app should show a parsing error
    And allow me to upload a different file

  Scenario: Import submission fails
    Given I submit approved transactions
    When the backend fails to write to Google Sheets
    Then the app should show a submission error
    And preserve the current review session in memory while the page remains open
```

---

# MVP Scope

## Include In MVP

- React SPA
- Google Apps Script backend
- Google Sheets as source of truth
- Preserve current sheet tabs
- Add `Entry Method` column to Expenses and Income
- Add automated hidden metadata columns to Expenses and Income
- RBC CSV upload
- Chequing CSV parsing
- Credit card CSV parsing
- Built-in category suggestions
- One-transaction-at-a-time review flow
- Amount override
- Notes editing
- Ignore internal transfers
- Ignore credit card payments
- Refund handling as negative expenses
- Duplicate detection
- Direct write to Google Sheets through backend
- Dashboard category cards
- Current-month default view
- Mobile-friendly layout
- PWA/home-screen support

## Exclude From MVP

- LocalStorage persistence
- User-editable category rules
- New Category Rules sheet tab
- Machine learning categorization
- Automatic bank sync
- Multi-user support
- Advanced forecasting
- Net worth tracking
- Complex split transactions
- Native mobile app

---

# Open Implementation Details For Coding Agent

The following details should be confirmed during implementation:

1. Exact cell ranges for expense categories in `Category Setup`
2. Exact cell ranges for income categories in `Category Setup`
3. Exact cell ranges for category budget targets in `Budget Targets`
4. Whether metadata columns should be hidden automatically by Apps Script
5. Whether existing manual rows should get `Entry Method = Manual` retroactively
6. Exact RBC CSV headers to support for chequing and credit card exports
7. Exact date format to write into Google Sheets
8. Whether ignored transactions should be stored anywhere in MVP or simply skipped

---

# Recommended Build Order

1. Create Google Apps Script read endpoints
2. Read categories and budget targets from existing tabs
3. Build React dashboard cards from sheet data
4. Build RBC CSV parser
5. Build one-at-a-time transaction review UI
6. Add category suggestion rules
7. Add duplicate detection using metadata fingerprints
8. Add Google Sheets write endpoint
9. Add metadata column writes
10. Add mobile/PWA polish
