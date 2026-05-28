import type {
  SourceAccount,
  TransactionDirection,
} from "../../shared/types/transactions";
import { normalizeVendorForSimilarity } from "./normalizeDescription";

type CategoryRule = {
  category: string;
  keywords: string[];
};

const EXPENSE_RULES: CategoryRule[] = [
  { category: "Food", keywords: ["LOBLAWS", "NO FRILLS", "METRO", "SOBEYS"] },
  { category: "Food out", keywords: ["MCDONALDS", "UBER EATS", "DOORDASH", "SKIPTHEDISHES"] },
  { category: "Coffee out", keywords: ["STARBUCKS", "TIM HORTONS"] },
  { category: "Gas", keywords: ["ESSO", "SHELL", "PETRO", "COSTCO GAS"] },
  { category: "Phone", keywords: ["ROGERS", "BELL", "TELUS", "FIDO"] },
  { category: "Internet", keywords: ["INTERNET", "ROGERS", "BELL"] },
  { category: "Hydro", keywords: ["HYDRO", "ELECTRIC"] },
  { category: "Enbridge", keywords: ["ENBRIDGE", "GAS BILL"] },
  { category: "Fitness", keywords: ["GOODLIFE", "FIT4LESS", "YMCA"] },
  { category: "Public transportation", keywords: ["TTC", "GO TRANSIT", "PRESTO"] },
  { category: "Travel", keywords: ["AIR CANADA", "WESTJET", "HOTEL", "AIRBNB"] },
  { category: "Insurance", keywords: ["INSURANCE", "INTACT", "DESJARDINS"] },
  { category: "Medical", keywords: ["PHARMACY", "SHOPPERS DRUG MART", "DENTAL"] },
  { category: "Pets", keywords: ["PETSMART", "VET"] },
  { category: "Mortgage", keywords: ["MORTGAGE"] },
  { category: "Rent", keywords: ["RENT"] },
];

const INCOME_RULES: CategoryRule[] = [
  { category: "Other", keywords: ["PAYROLL", "SALARY", "PAY", "DEPOSIT"] },
];

type SuggestCategoryInput = {
  sourceAccount: SourceAccount;
  direction: TransactionDirection;
  originalDescription: string;
  expenseCategories: string[];
  incomeCategories: string[];
};

function findRuleMatch(description: string, rules: CategoryRule[]): string | undefined {
  const normalized = normalizeVendorForSimilarity(description);

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }

  return undefined;
}

export function suggestCategory({
  sourceAccount: _sourceAccount,
  direction,
  originalDescription,
  expenseCategories,
  incomeCategories,
}: SuggestCategoryInput): string | undefined {
  const suggested =
    direction === "expense"
      ? findRuleMatch(originalDescription, EXPENSE_RULES)
      : findRuleMatch(originalDescription, INCOME_RULES);

  if (!suggested) {
    return undefined;
  }

  const allowedCategories = direction === "expense" ? expenseCategories : incomeCategories;
  return allowedCategories.includes(suggested) ? suggested : undefined;
}
