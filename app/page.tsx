"use client";

import { useEffect, useMemo, useState } from "react";

type BudgetCategory = {
  id: string;
  name: string;
  allocated: number;
  color: string;
};

type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: "expense" | "income";
  date: string;
};

type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  saved: number;
};

const initialBudgets: BudgetCategory[] = [];

const initialTransactions: Transaction[] = [];

const supportedCurrencies = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "INR", label: "Indian Rupee" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NGN", label: "Nigerian Naira" },
  { code: "ZAR", label: "South African Rand" },
  { code: "MXN", label: "Mexican Peso" },
];

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);

const getLocalDateString = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getMonthKey = (date = new Date()) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const isBudgetCategory = (value: unknown): value is BudgetCategory =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string" &&
  "allocated" in value &&
  typeof value.allocated === "number" &&
  Number.isFinite(value.allocated) &&
  value.allocated >= 0 &&
  "color" in value &&
  typeof value.color === "string";

const isTransaction = (value: unknown): value is Transaction =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "title" in value &&
  typeof value.title === "string" &&
  "category" in value &&
  typeof value.category === "string" &&
  "amount" in value &&
  typeof value.amount === "number" &&
  Number.isFinite(value.amount) &&
  value.amount > 0 &&
  "type" in value &&
  (value.type === "income" || value.type === "expense") &&
  "date" in value &&
  typeof value.date === "string";

const isSavingsGoal = (value: unknown): value is SavingsGoal =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string" &&
  "target" in value &&
  typeof value.target === "number" &&
  Number.isFinite(value.target) &&
  value.target > 0 &&
  "saved" in value &&
  typeof value.saved === "number" &&
  Number.isFinite(value.saved) &&
  value.saved >= 0;

const storageKey = "finance-budget-planner-v1";

export default function HomePage() {
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [budgets, setBudgets] = useState<BudgetCategory[]>(initialBudgets);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<"all" | Transaction["type"]>("all");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState({
    title: "",
    category: "",
    amount: "",
    type: "expense" as Transaction["type"],
    date: getLocalDateString(),
  });
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [transactionError, setTransactionError] = useState("");
  const [editingError, setEditingError] = useState("");
  const [goalError, setGoalError] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", amount: "" });
  const [newGoal, setNewGoal] = useState({ name: "", target: "" });
  const [newTransaction, setNewTransaction] = useState({
    title: "",
    category: "General",
    amount: "",
    type: "expense" as "expense" | "income",
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    try {
      const savedData = window.localStorage.getItem(storageKey);
      if (savedData) {
        const parsed: unknown = JSON.parse(savedData);
        if (typeof parsed !== "object" || parsed === null) {
          throw new Error("Saved finance data has an invalid format.");
        }

        const data = parsed as Record<string, unknown>;
        // Load browser-only data after hydration so server and client markup match.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMonthlyIncome(
          typeof data.monthlyIncome === "number" && Number.isFinite(data.monthlyIncome)
            ? Math.max(0, data.monthlyIncome)
            : 0,
        );
        setSelectedCurrency(
          typeof data.selectedCurrency === "string" &&
            supportedCurrencies.some((currency) => currency.code === data.selectedCurrency)
            ? data.selectedCurrency
            : "USD",
        );
        setBudgets(Array.isArray(data.budgets) ? data.budgets.filter(isBudgetCategory) : []);
        setTransactions(Array.isArray(data.transactions) ? data.transactions.filter(isTransaction) : []);
        setSavingsGoals(Array.isArray(data.savingsGoals) ? data.savingsGoals.filter(isSavingsGoal) : []);
      }
      setStorageReady(true);
    } catch (error) {
      console.error("Unable to load saved finance data.", error);
      setStorageError("Your saved data could not be loaded. Changes will not be saved until storage is available.");
    }
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          monthlyIncome,
          selectedCurrency,
          budgets,
          transactions,
          savingsGoals,
        }),
      );
    } catch (error) {
      console.error("Unable to save finance data.", error);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageError("Your changes could not be saved. Check your browser storage settings and available space.");
    }
  }, [monthlyIncome, selectedCurrency, budgets, transactions, savingsGoals, storageReady]);

  const selectedMonthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(selectedMonth)),
    [transactions, selectedMonth],
  );

  const budgetSummary = useMemo(
    () =>
      budgets.map((budget) => {
        const spent = selectedMonthTransactions
          .filter((transaction) => transaction.category === budget.name && transaction.type === "expense")
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        return {
          ...budget,
          spent,
          remaining: budget.allocated - spent,
        };
      }),
    [budgets, selectedMonthTransactions],
  );

  const totalAllocated = budgetSummary.reduce((sum, item) => sum + item.allocated, 0);
  const totalSpent = budgetSummary.reduce((sum, item) => sum + item.spent, 0);
  const remainingToBudget = totalAllocated - totalSpent;
  const totalIncome = selectedMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenses = selectedMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const availableCash = monthlyIncome - totalExpenses;

  const updateBudgetAmount = (id: string, value: number) => {
    setBudgets((current) =>
      current.map((budget) =>
        budget.id === id
          ? { ...budget, allocated: Number.isFinite(value) ? Math.max(0, value) : 0 }
          : budget,
      ),
    );
  };

  const addBudgetCategory = () => {
    const trimmedName = newCategory.name.trim();
    const amount = Number(newCategory.amount);
    if (!trimmedName || !Number.isFinite(amount) || amount <= 0) {
      setCategoryError("Enter a category name and an amount greater than zero.");
      return;
    }
    if (budgets.some((budget) => budget.name.toLowerCase() === trimmedName.toLowerCase())) {
      setCategoryError("A budget category with that name already exists.");
      return;
    }

    setCategoryError("");
    const nextCategory: BudgetCategory = {
      id: `${trimmedName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: trimmedName,
      allocated: amount,
      color: ["#5b7cff", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"][budgets.length % 5],
    };

    setBudgets((current) => [...current, nextCategory]);
    setNewCategory({ name: "", amount: "" });
    setNewTransaction((current) => ({ ...current, category: nextCategory.name }));
  };

  const addTransaction = () => {
    const title = newTransaction.title.trim();
    const amount = Number(newTransaction.amount);

    if (!title || !Number.isFinite(amount) || amount <= 0) {
      setTransactionError("Enter a description and an amount greater than zero.");
      return;
    }

    setTransactionError("");
    const category = newTransaction.category || (budgets[0]?.name ?? "General");

    const nextEntry: Transaction = {
      id: `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      title,
      category,
      amount,
      type: newTransaction.type,
      date: newTransaction.date,
    };

    setTransactions((current) => [nextEntry, ...current]);
    setNewTransaction({
      title: "",
      category: budgets[0]?.name ?? "General",
      amount: "",
      type: "expense",
      date: getLocalDateString(),
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions((current) => current.filter((transaction) => transaction.id !== id));
    if (editingTransactionId === id) {
      setEditingTransactionId(null);
      setEditingError("");
    }
  };

  const addSavingsGoal = () => {
    const name = newGoal.name.trim();
    const target = Number(newGoal.target);
    if (!name || !Number.isFinite(target) || target <= 0) {
      setGoalError("Enter a goal name and a target greater than zero.");
      return;
    }

    setSavingsGoals((current) => [
      ...current,
      { id: `goal-${Date.now()}`, name, target, saved: 0 },
    ]);
    setNewGoal({ name: "", target: "" });
    setGoalError("");
  };

  const updateGoalSavedAmount = (id: string, value: number) => {
    if (!Number.isFinite(value) || value < 0) {
      return;
    }
    setSavingsGoals((current) =>
      current.map((goal) => (goal.id === id ? { ...goal, saved: value } : goal)),
    );
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals((current) => current.filter((goal) => goal.id !== id));
  };

  const startEditingTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setEditingTransaction({
      title: transaction.title,
      category: transaction.category,
      amount: String(transaction.amount),
      type: transaction.type,
      date: transaction.date,
    });
    setEditingError("");
  };

  const saveEditedTransaction = () => {
    const title = editingTransaction.title.trim();
    const category = editingTransaction.category.trim();
    const amount = Number(editingTransaction.amount);
    if (!editingTransactionId || !title || !category || !Number.isFinite(amount) || amount <= 0 || !editingTransaction.date) {
      setEditingError("Enter a description, category, valid date, and amount greater than zero.");
      return;
    }

    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === editingTransactionId
          ? { ...transaction, ...editingTransaction, title, category, amount }
          : transaction,
      ),
    );
    setEditingTransactionId(null);
    setEditingError("");
  };

  const filteredTransactions = useMemo(() => {
    const query = transactionSearch.trim().toLowerCase();
    return [...transactions]
      .filter((transaction) => transactionTypeFilter === "all" || transaction.type === transactionTypeFilter)
      .filter(
        (transaction) =>
          !query ||
          transaction.title.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query),
      )
      .sort((first, second) => second.date.localeCompare(first.date));
  }, [transactions, transactionSearch, transactionTypeFilter]);

  const exportTransactions = () => {
    const rows = [
      ["Date", "Description", "Category", "Type", "Amount", "Currency"],
      ...[...transactions]
        .sort((first, second) => second.date.localeCompare(first.date))
        .map((transaction) => [
          transaction.date,
          transaction.title,
          transaction.category,
          transaction.type,
          transaction.amount.toFixed(2),
          selectedCurrency,
        ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
            return `"${safeValue.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-transactions-${getLocalDateString()}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const generateInsights = useMemo(() => {
    const insights: { message: string; type: "positive" | "warning" | "neutral" }[] = [];

    if (selectedMonthTransactions.length === 0) {
      return [{
        message: "Add an income or expense this month to get personalized insights.",
        type: "neutral" as const,
      }];
    }

    const [year, month] = selectedMonth.split("-").map(Number);
    const previousMonth = getMonthKey(new Date(Date.UTC(year, month - 2, 1)));
    const lastMonthTransactions = transactions.filter((transaction) => transaction.date.startsWith(previousMonth));
    const currentMonthExpenses = selectedMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpenses = lastMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    if (lastMonthExpenses > 0 && currentMonthExpenses > 0) {
      const categoryComparison: Record<string, { current: number; last: number }> = {};

      selectedMonthTransactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          categoryComparison[t.category] = {
            ...categoryComparison[t.category],
            current: (categoryComparison[t.category]?.current || 0) + t.amount,
          };
        });

      lastMonthTransactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          categoryComparison[t.category] = {
            ...categoryComparison[t.category],
            last: (categoryComparison[t.category]?.last || 0) + t.amount,
          };
        });

      for (const [category, { current, last }] of Object.entries(categoryComparison)) {
        if (last > 0 && current > last) {
          const percentChange = Math.round(((current - last) / last) * 100);
          if (percentChange >= 10) {
            insights.push({
              message: `You spent ${percentChange}% more on ${category} this month than last month.`,
              type: "warning",
            });
          }
        } else if (last > 0 && current < last) {
          const percentSaved = Math.round(((last - current) / last) * 100);
          if (percentSaved >= 10) {
            insights.push({
              message: `Great job! You spent ${percentSaved}% less on ${category} compared to last month.`,
              type: "positive",
            });
          }
        }
      }
    }

    if (selectedMonth === currentMonth && monthlyIncome > 0 && totalAllocated > 0) {
      const budgetUtilization = totalSpent / totalAllocated;
      const now = new Date();
      const daysInMonth = new Date(year, month, 0).getDate();
      const daysPassed = now.getDate();
      const expectedUtilization = daysPassed / daysInMonth;

      if (budgetUtilization < expectedUtilization * 0.8) {
        insights.push({
          message: "You're on track to stay well under your monthly spending limit!",
          type: "positive",
        });
      } else if (budgetUtilization > expectedUtilization * 1.2) {
        insights.push({
          message: "You're spending faster than expected this month. Consider adjusting your habits.",
          type: "warning",
        });
      } else if (budgetUtilization <= expectedUtilization) {
        insights.push({
          message: "You're on track with your budget so far this month.",
          type: "positive",
        });
      }
    }

    const incomeForSavingsRate = monthlyIncome || totalIncome;
    if (incomeForSavingsRate > totalExpenses && incomeForSavingsRate > 0) {
      const savingsRate = ((incomeForSavingsRate - totalExpenses) / incomeForSavingsRate) * 100;
      if (savingsRate >= 20) {
        insights.push({
          message: `You're saving ${Math.round(savingsRate)}% of your income. Keep it up!`,
          type: "positive",
        });
      }
    }

    return insights.length > 0 ? insights : [{
      message: "Keep tracking your spending to unlock more insights.",
      type: "neutral",
    }];
  }, [
    transactions,
    selectedMonthTransactions,
    selectedMonth,
    currentMonth,
    monthlyIncome,
    totalIncome,
    totalExpenses,
    totalSpent,
    totalAllocated,
  ]);

  const topInsight = generateInsights[0];
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(`${selectedMonth}-01T00:00:00`),
  );
  const shiftMonth = (amount: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    setSelectedMonth(getMonthKey(new Date(Date.UTC(year, month - 1 + amount, 1))));
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,#172554_0%,#0f172a_28%,#020617_100%)] px-3 py-5 text-slate-100 sm:px-4 sm:py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <header className="flex min-w-0 flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/25 backdrop-blur-xl sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Budget planner</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">Know your money. Build your future.</h1>
            <button
              onClick={exportTransactions}
              className="mt-4 min-h-11 w-full rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200 sm:w-auto"
            >
              Export transactions
            </button>
          </div>
          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-right md:shrink-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Monthly income</p>
              <select
                aria-label="Select currency"
                value={selectedCurrency}
                onChange={(event) => setSelectedCurrency(event.target.value)}
                className="w-28 max-w-[45%] rounded-lg border border-cyan-400/40 bg-slate-950/60 px-2 py-1 text-xs text-cyan-100 outline-none sm:w-auto sm:max-w-none"
              >
                {supportedCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} • {currency.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              aria-label="Monthly income"
              type="number"
              min="0"
              value={monthlyIncome}
              onChange={(event) => {
                const value = Number(event.target.value);
                setMonthlyIncome(Number.isFinite(value) ? Math.max(0, value) : 0);
              }}
              className="mt-1 w-36 bg-transparent text-right text-2xl font-semibold text-white outline-none"
            />
          </div>
        </header>

        {storageError && (
          <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {storageError}
          </p>
        )}

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Monthly overview</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{monthLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="min-h-11 min-w-11 rounded-lg border border-slate-600 px-3 py-2 text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
            >
              ←
            </button>
            {selectedMonth !== currentMonth && (
              <button
                onClick={() => setSelectedMonth(currentMonth)}
                className="min-h-11 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
              >
                This month
              </button>
            )}
            <button
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              disabled={selectedMonth >= currentMonth}
              className="min-h-11 min-w-11 rounded-lg border border-slate-600 px-3 py-2 text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              →
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/70 to-slate-800/70 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex items-start gap-3">
            <div className={`mt-1 h-2 w-2 rounded-full ${topInsight.type === "positive" ? "bg-emerald-400" : topInsight.type === "warning" ? "bg-amber-400" : "bg-cyan-400"}`} />
            <div>
              <p className="text-lg font-semibold text-white">{topInsight.message}</p>
              <p className="mt-2 text-sm text-slate-400">
                {generateInsights.length > 1 && `+${generateInsights.length - 1} more insight${generateInsights.length - 1 > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {[
            { label: "Net cash flow", value: formatCurrency(totalIncome - totalExpenses, selectedCurrency), tone: "text-emerald-300" },
            { label: "Budget left", value: formatCurrency(remainingToBudget, selectedCurrency), tone: "text-cyan-300" },
            { label: "Spent this month", value: formatCurrency(totalExpenses, selectedCurrency), tone: "text-amber-300" },
            { label: "Available this month", value: formatCurrency(availableCash, selectedCurrency), tone: "text-violet-300" },
          ].map((card) => (
            <div key={card.label} className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-lg shadow-slate-950/20 sm:p-5">
              <p className="text-sm text-slate-300">{card.label}</p>
              <p className={`mt-2 break-all text-xl font-bold sm:mt-3 sm:text-3xl ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </section>

        <section className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Save with a purpose</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Savings goals</h2>
            </div>
            {savingsGoals.length > 0 && (
              <p className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
                {savingsGoals.length} {savingsGoals.length === 1 ? "goal" : "goals"}
              </p>
            )}
          </div>

          {savingsGoals.length > 0 && (
            <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2">
              {savingsGoals.map((goal) => {
                const progress = Math.min((goal.saved / goal.target) * 100, 100);
                const complete = goal.saved >= goal.target;

                return (
                  <article key={goal.id} className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-white">{goal.name}</h3>
                        <p className="mt-1 break-words text-sm text-slate-400">
                          {formatCurrency(goal.saved, selectedCurrency)} of {formatCurrency(goal.target, selectedCurrency)}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteSavingsGoal(goal.id)}
                        aria-label={`Remove ${goal.name} savings goal`}
                        className="min-h-11 shrink-0 whitespace-nowrap rounded-lg px-2 text-xs text-slate-400 transition hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div
                      className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-800"
                      role="progressbar"
                      aria-label={`${goal.name} savings progress`}
                      aria-valuemin={0}
                      aria-valuemax={goal.target}
                      aria-valuenow={Math.min(goal.saved, goal.target)}
                    >
                      <div
                        className={`h-full rounded-full transition-[width] ${complete ? "bg-emerald-400" : "bg-violet-400"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className={complete ? "text-emerald-300" : "text-slate-400"}>
                        {complete ? "Goal reached!" : `${Math.round(progress)}% saved`}
                      </span>
                      <label className="flex items-center gap-2 text-slate-400">
                        <span>Saved</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          aria-label={`${goal.name} amount saved`}
                          value={goal.saved}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (event.target.value === "" || value >= 0) {
                              updateGoalSavedAmount(goal.id, event.target.value === "" ? 0 : value);
                            }
                          }}
                          className="min-h-11 w-24 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-right text-sm text-white outline-none focus:border-violet-400"
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
            <p className="mb-3 text-sm text-slate-300">Create a savings goal</p>
            <div className="grid min-w-0 gap-3 sm:grid-cols-[1fr_160px_auto]">
              <input
                type="text"
                aria-label="Savings goal name"
                placeholder="e.g. Emergency fund"
                value={newGoal.name}
                onChange={(event) => setNewGoal((current) => ({ ...current, name: event.target.value }))}
                className="min-h-11 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none transition focus:border-violet-400"
              />
              <input
                type="number"
                aria-label="Savings goal target"
                min="0.01"
                step="0.01"
                placeholder="Target amount"
                value={newGoal.target}
                onChange={(event) => setNewGoal((current) => ({ ...current, target: event.target.value }))}
                className="min-h-11 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none transition focus:border-violet-400"
              />
              <button
                onClick={addSavingsGoal}
                className="min-h-11 rounded-xl bg-violet-400 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-violet-300"
              >
                Add goal
              </button>
            </div>
            {goalError && <p role="alert" className="mt-3 text-sm text-rose-300">{goalError}</p>}
          </div>
        </section>

        <section className="grid min-w-0 gap-4 lg:grid-cols-[1.4fr_0.9fr] lg:gap-6">
          <div className="min-w-0 space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Budget categories</p>
                <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Monthly plan</h2>
              </div>
              <span className="max-w-full rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                {formatCurrency(totalAllocated, selectedCurrency)} planned
              </span>
            </div>

            <div className="space-y-4">
              {budgetSummary.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/30 p-8 text-center">
                  <p className="text-lg font-medium text-white">No budget categories yet.</p>
                  <p className="mt-2 text-sm text-slate-400">Add your first category to start planning your expenses.</p>
                </div>
              ) : (
                budgetSummary.map((budget) => {
                  const width = Math.min((budget.spent / Math.max(budget.allocated, 1)) * 100, 100);

                  return (
                    <div key={budget.id} className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: budget.color }} />
                        <span className="break-words text-lg font-medium text-white">{budget.name}</span>
                        </div>
                      <div className="flex w-full items-center justify-between gap-2 text-sm text-slate-300 sm:w-auto sm:justify-start">
                          <span>{formatCurrency(budget.spent, selectedCurrency)}</span>
                          <span>/</span>
                          <span>{formatCurrency(budget.allocated, selectedCurrency)}</span>
                        </div>
                      </div>

                      <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${width}%`, backgroundColor: budget.color }}
                        />
                      </div>

                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="text-sm text-slate-300">
                          Remaining: <span className={budget.remaining >= 0 ? "text-emerald-300" : "text-rose-300"}>{formatCurrency(budget.remaining, selectedCurrency)}</span>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                          <span>Budget</span>
                          <input
                            type="number"
                            min="0"
                            value={budget.allocated}
                            onChange={(event) => updateBudgetAmount(budget.id, Number(event.target.value))}
                            className="w-24 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-right text-white outline-none ring-0 transition focus:border-cyan-400"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="mb-3 text-sm uppercase tracking-[0.22em] text-slate-400">Add category</p>
              <div className="grid min-w-0 gap-3 md:grid-cols-[1fr_140px_auto]">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCategory.name}
                  aria-label="Category name"
                  onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                  className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount"
                  aria-label="Category budget amount"
                  value={newCategory.amount}
                  onChange={(event) => setNewCategory((current) => ({ ...current, amount: event.target.value }))}
                  className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
                />
                <button
                  onClick={addBudgetCategory}
                  className="rounded-xl bg-cyan-500 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-cyan-400"
                >
                  Add
                </button>
              </div>
              {categoryError && <p role="alert" className="mt-3 text-sm text-rose-300">{categoryError}</p>}
            </div>
          </div>

          <aside className="min-w-0 space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Quick entry</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Add transaction</h2>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Title"
                aria-label="Transaction description"
                value={newTransaction.title}
                onChange={(event) => setNewTransaction((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
              />
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <select
                  value={newTransaction.category}
                  onChange={(event) => setNewTransaction((current) => ({ ...current, category: event.target.value }))}
                  disabled={budgets.length === 0}
                  className="w-full min-w-0 max-w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {budgets.length === 0 ? (
                    <option value="General">General</option>
                  ) : (
                    budgets.map((budget) => (
                      <option key={budget.id} value={budget.name}>
                        {budget.name.length > 24 ? `${budget.name.slice(0, 21)}…` : budget.name}
                      </option>
                    ))
                  )}
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount"
                  aria-label="Transaction amount"
                  value={newTransaction.amount}
                  onChange={(event) => setNewTransaction((current) => ({ ...current, amount: event.target.value }))}
                  className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
                />
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <select
                  value={newTransaction.type}
                  onChange={(event) =>
                    setNewTransaction((current) => ({
                      ...current,
                      type: event.target.value as "expense" | "income",
                    }))
                  }
                  className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(event) => setNewTransaction((current) => ({ ...current, date: event.target.value }))}
                  className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
                />
              </div>

              {transactionError && <p role="alert" className="text-sm text-rose-300">{transactionError}</p>}
              <button
                onClick={addTransaction}
                className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Save entry
              </button>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Transactions</p>
                <span className="text-xs text-slate-500">{filteredTransactions.length} shown</span>
              </div>
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="search"
                  value={transactionSearch}
                  onChange={(event) => setTransactionSearch(event.target.value)}
                  placeholder="Search description or category"
                  aria-label="Search transactions"
                  className="min-h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
                <select
                  value={transactionTypeFilter}
                  onChange={(event) => setTransactionTypeFilter(event.target.value as "all" | Transaction["type"])}
                  aria-label="Filter transaction type"
                  className="min-h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                >
                  <option value="all">All types</option>
                  <option value="expense">Expenses</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="max-h-96 space-y-3 overflow-y-auto">
                {filteredTransactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-3 py-5 text-center text-sm text-slate-400">
                    {transactions.length === 0
                      ? "No transactions yet. Add your first income or expense to get started."
                      : "No transactions match your search."}
                  </div>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                      {editingTransactionId === transaction.id ? (
                        <div className="space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              aria-label="Edit transaction description"
                              value={editingTransaction.title}
                              onChange={(event) =>
                                setEditingTransaction((current) => ({ ...current, title: event.target.value }))
                              }
                              className="min-h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-cyan-400"
                            />
                            <input
                              aria-label="Edit transaction category"
                              value={editingTransaction.category}
                              onChange={(event) =>
                                setEditingTransaction((current) => ({ ...current, category: event.target.value }))
                              }
                              className="min-h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-cyan-400"
                            />
                            <input
                              aria-label="Edit transaction amount"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editingTransaction.amount}
                              onChange={(event) =>
                                setEditingTransaction((current) => ({ ...current, amount: event.target.value }))
                              }
                              className="min-h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-cyan-400"
                            />
                            <input
                              aria-label="Edit transaction date"
                              type="date"
                              value={editingTransaction.date}
                              onChange={(event) =>
                                setEditingTransaction((current) => ({ ...current, date: event.target.value }))
                              }
                              className="min-h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-cyan-400"
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <select
                              aria-label="Edit transaction type"
                              value={editingTransaction.type}
                              onChange={(event) =>
                                setEditingTransaction((current) => ({
                                  ...current,
                                  type: event.target.value as Transaction["type"],
                                }))
                              }
                              className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-cyan-400"
                            >
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditedTransaction}
                                className="min-h-11 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-slate-950 transition hover:bg-emerald-400"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTransactionId(null);
                                  setEditingError("");
                                }}
                                className="min-h-11 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          {editingError && <p role="alert" className="text-sm text-rose-300">{editingError}</p>}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-white">{transaction.title}</p>
                            <p className="text-xs text-slate-400">
                              {transaction.category} • {transaction.date}
                            </p>
                          </div>
                          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                            <span className={`break-all ${transaction.type === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                              {transaction.type === "income" ? "+" : "-"}
                              {formatCurrency(transaction.amount, selectedCurrency)}
                            </span>
                            <button
                              onClick={() => startEditingTransaction(transaction)}
                              aria-label={`Edit ${transaction.title}`}
                              className="min-h-11 rounded-lg px-2 text-xs text-slate-400 transition hover:text-cyan-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTransaction(transaction.id)}
                              aria-label={`Remove ${transaction.title}`}
                              className="min-h-11 rounded-lg px-2 text-xs text-slate-400 transition hover:text-rose-300"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
