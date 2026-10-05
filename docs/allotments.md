# Allotments

Two dashboards show the same month. The actual dashboard is the cash record. The allotments dashboard is the same layout with last month's profit applied on purpose.

## Why

Last month's profit is money already earned. Spending it this month, for example on a bed, is a real expense in this month. It counts in its category and it lowers this month's actual profit. That is the honest cash record.

The same purchase should not be read as this month failing its own limit. Meaningful profit adds that funded purchase back, so this month's result is visible beside the cash record.

## The two dashboards

**Actual dashboard.** Income, every expense in the month, category totals, and actual profit. A funded purchase stays in its category and in actual profit. Category cards open the transactions for that category.

**Allotments dashboard.** The same month selector, the same three summary cards, and the same category grid.

- Income stays the cash income.
- Spending drops by the linked expenses.
- Profit is meaningful profit.
- Above the grid: to work with, and still free.
- Each category card lists that category's allotments. The card's used amount drops by linked expenses only. A plan that is not linked yet shows on the allotment, and it does not change the card's used amount. Clicking the card does not open transactions.

## Definitions

**Actual profit** for a month is that month's income minus every expense recorded in that month, including purchases funded by an earlier month's profit.

**Meaningful profit** for a month is that month's actual profit plus the expenses linked to allotments funded by the previous month. It is a one-month result. The added amount is the full amount of each linked expense. Links may add up to more than the plan, and the full linked sum is still added back.

**To work with** for a month is the previous month's meaningful profit. This is the reset rule. Older unspent profit drops off. It does not accumulate into a running balance.

**Still free** is to work with minus the sum of that pool's planned amounts, linked or not. Plans may add up to more than to work with. Still free goes negative.

**Cash retained** is the running bank balance. It can be larger than a month's meaningful profit because it still holds unspent profit from earlier months. Meaningful profit is not the cash in the bank.

## What stays on the original expense

A funded purchase stays dated in the month it happened. Linking it does not move the expense into the profit month, and it does not remove the expense from its category or from actual profit.

## Allotment record

Each allotment has:

- `id`
- `profitMonth`, the month whose profit funds it (`YYYY-MM`)
- `name`
- `amount`, the planned amount
- `category`, one expense category
- `expenseIds`, the expenses linked to it

An allotment funds the month after its profit month. That month is the spending month.

Linking an expense is what spends the allotment. There is no bought flag. An allotment with no links is only a plan: it counts against still free, and it does not change meaningful profit or category used.

An allotment can link any number of expenses. Each expense belongs to one allotment, and the link uses the whole expense amount. The expense has to be in the allotment's category and in the spending month. The category stays locked while any link exists. Unlink the expenses before the category can change.

Import can link the new expense while it is approved. The choice is an existing allotment in that category whose spending month is the expense month. Each split can link its own allotment. Income cannot be linked.

The unlinked part of a plan stays reserved against still free until the plan amount changes or more expenses are linked.

If a linked expense is edited out of that category or month, or the expense is deleted, the link drops. The expense returns to ordinary spending. The plan stays reserved.

A row saved with the old `Spent` column is treated as a plan. That flag is ignored. A row with no category is skipped.

## Reset examples

Each month earns $1,000 and has no expenses other than purchases funded by the prior pool. January has nothing to work with. Every scenario starts at actual profit $1,000, meaningful profit $1,000, and cash retained $1,000.

Spend the whole pool. February's $1,000 expense is linked to January's $1,000 plan. March's $1,000 expense is linked to February's $1,000 plan.

- February works with $1,000, spends $1,000, actual profit $0, meaningful profit $1,000, cash retained $1,000.
- March works with $1,000, spends $1,000, actual profit $0, meaningful profit $1,000, cash retained $1,000.

Spend $500. The linked expense is $500 and the plan is $500.

- February works with $1,000, spends $500, actual profit $500, meaningful profit $1,000, cash retained $1,500.
- March works with $1,000. January's unspent $500 is gone. Spends $500, actual profit $500, meaningful profit $1,000, cash retained $2,000.

Spend nothing. The plan can still reserve the pool. Nothing is linked, so meaningful profit stays equal to actual profit.

- February works with $1,000, spends $0, actual profit $1,000, meaningful profit $1,000, cash retained $2,000.
- March works with $1,000. Spends $0, actual profit $1,000, meaningful profit $1,000, cash retained $3,000.

March's pool is $1,000 in every scenario. The bank is $1,000, $2,000, or $3,000. Those are different numbers.

A $1,000 plan with only $600 linked adds $600 back. The remaining $400 stays reserved against still free. A $500 plan with a $1,000 expense linked adds the full $1,000 back.

## Storage

Every expense row has a hidden `Row Id`. The script assigns one to imported rows on write and backfills blank ids on existing expense rows. Manual expenses get an id the same way. Allotments store that id. Income rows do not.

Allotments are stored in a hidden `Allotments` sheet, created on first use. Columns:

1. `Id`
2. `Profit Month`
3. `Name`
4. `Amount`
5. `Category`
6. `Expense Ids`, comma-separated row ids

Reading a profit month drops links that no longer match an expense in that category during the spending month, and writes the shortened list back.

Actions:

- `GET ?action=allotments&profitMonth=YYYY-MM`
- `POST { "action": "saveAllotment", "profitMonth": "YYYY-MM", "name": "...", "amount": 1000, "category": "Home", "expenseIds": [] }`
- `POST { "action": "deleteAllotment", "id": "..." }`

`saveAllotment` rejects a category change while links exist, an expense that is not in that category during the spending month, and an expense already linked to another allotment.
