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

const storageKey = "finance-budget-planner-v1";

const loadStoredState = () => {
  if (typeof window === "undefined") {
    return {
      monthlyIncome: 0,
      selectedCurrency: "USD",
      budgets: initialBudgets,
      transactions: initialTransactions,
    };
  }

  try {
    const savedData = window.localStorage.getItem(storageKey);
    if (!savedData) {
      return {
        monthlyIncome: 0,
        selectedCurrency: "USD",
        budgets: initialBudgets,
        transactions: initialTransactions,
      };
    }

    const parsed = JSON.parse(savedData) as {
      monthlyIncome?: number;
      selectedCurrency?: string;
      budgets?: BudgetCategory[];
      transactions?: Transaction[];
    };

    return {
      monthlyIncome: typeof parsed.monthlyIncome === "number" ? parsed.monthlyIncome : 0,
      selectedCurrency: parsed.selectedCurrency || "USD",
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : initialBudgets,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : initialTransactions,
    };
  } catch {
    return {
      monthlyIncome: 0,
      selectedCurrency: "USD",
      budgets: initialBudgets,
      transactions: initialTransactions,
    };
  }
};

export default function HomePage() {
  const persistedState = loadStoredState();
  const [monthlyIncome, setMonthlyIncome] = useState(persistedState.monthlyIncome);
  const [selectedCurrency, setSelectedCurrency] = useState(persistedState.selectedCurrency);
  const [budgets, setBudgets] = useState<BudgetCategory[]>(persistedState.budgets);
  const [transactions, setTransactions] = useState<Transaction[]>(persistedState.transactions);
  const [newCategory, setNewCategory] = useState({ name: "", amount: "" });
  const [newTransaction, setNewTransaction] = useState({
    title: "",
    category: "General",
    amount: "",
    type: "expense" as "expense" | "income",
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          monthlyIncome,
          selectedCurrency,
          budgets,
          transactions,
        }),
      );
    } catch {
      // Ignore storage failures if the browser blocks it.
    }
  }, [monthlyIncome, selectedCurrency, budgets, transactions]);

  const budgetSummary = useMemo(
    () =>
      budgets.map((budget) => {
        const spent = transactions
          .filter((transaction) => transaction.category === budget.name && transaction.type === "expense")
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        return {
          ...budget,
          spent,
          remaining: budget.allocated - spent,
        };
      }),
    [budgets, transactions],
  );

  const totalAllocated = budgetSummary.reduce((sum, item) => sum + item.allocated, 0);
  const totalSpent = budgetSummary.reduce((sum, item) => sum + item.spent, 0);
  const remainingToBudget = totalAllocated - totalSpent;
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenses = transactions
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
    if (!trimmedName) {
      return;
    }

    const amount = Number(newCategory.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

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
      return;
    }

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
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions((current) => current.filter((transaction) => transaction.id !== id));
  };

  const recentTransactions = transactions.slice(0, 5);

  const generateInsights = useMemo(() => {
    const insights: { message: string; type: "positive" | "warning" | "neutral" }[] = [];

    if (transactions.length === 0) {
      return [{
        message: "Start tracking your spending to get personalized insights.",
        type: "neutral" as const,
      }];
    }

    // Get current month's transactions
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const currentMonthExpenses = currentMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Get last month's transactions
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastYear = lastMonthDate.getFullYear();

    const lastMonthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastYear;
    });

    const lastMonthExpenses = lastMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Compare spending by category
    if (lastMonthExpenses > 0 && currentMonthExpenses > 0) {
      const categoryComparison: Record<string, { current: number; last: number }> = {};

      currentMonthTransactions
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

    // Check if on track with budget
    if (monthlyIncome > 0 && totalAllocated > 0) {
      const budgetUtilization = totalSpent / totalAllocated;
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
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

    // Recommend saving
    if (monthlyIncome > totalExpenses && monthlyIncome > 0) {
      const savingsRate = ((monthlyIncome - totalExpenses) / monthlyIncome) * 100;
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
  }, [transactions, monthlyIncome, totalSpent, totalAllocated]);

  const topInsight = generateInsights[0];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#172554_0%,#0f172a_28%,#020617_100%)] px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/25 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Budget planner</p>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Know your money. Build your future.</h1>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-right">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Monthly income</p>
              <select
                aria-label="Select currency"
                value={selectedCurrency}
                onChange={(event) => setSelectedCurrency(event.target.value)}
                className="rounded-lg border border-cyan-400/40 bg-slate-950/60 px-2 py-1 text-xs text-cyan-100 outline-none"
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
              value={monthlyIncome}
              onChange={(event) => setMonthlyIncome(Number(event.target.value) || 0)}
              className="mt-1 w-36 bg-transparent text-right text-2xl font-semibold text-white outline-none"
            />
          </div>
        </header>

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

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Net cash flow", value: formatCurrency(totalIncome - totalExpenses, selectedCurrency), tone: "text-emerald-300" },
            { label: "Budget left", value: formatCurrency(remainingToBudget, selectedCurrency), tone: "text-cyan-300" },
            { label: "Spent this month", value: formatCurrency(totalSpent, selectedCurrency), tone: "text-amber-300" },
            { label: "Available now", value: formatCurrency(availableCash, selectedCurrency), tone: "text-violet-300" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/20">
              <p className="text-sm text-slate-300">{card.label}</p>
              <p className={`mt-3 text-3xl font-bold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Budget categories</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Monthly plan</h2>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
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
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: budget.color }} />
                          <span className="text-lg font-medium text-white">{budget.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
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

                      <div className="flex items-center justify-between gap-4">
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
              <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCategory.name}
                  onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))}
                  className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Amount"
                  value={newCategory.amount}
                  onChange={(event) => setNewCategory((current) => ({ ...current, amount: event.target.value }))}
                  className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
                />
                <button
                  onClick={addBudgetCategory}
                  className="rounded-xl bg-cyan-500 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-cyan-400"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Quick entry</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Add transaction</h2>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Title"
                value={newTransaction.title}
                onChange={(event) => setNewTransaction((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={newTransaction.category}
                  onChange={(event) => setNewTransaction((current) => ({ ...current, category: event.target.value }))}
                  disabled={budgets.length === 0}
                  className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {budgets.length === 0 ? (
                    <option value="General">General</option>
                  ) : (
                    budgets.map((budget) => (
                      <option key={budget.id} value={budget.name}>
                        {budget.name}
                      </option>
                    ))
                  )}
                </select>
                <input
                  type="number"
                  placeholder="0"
                  value={newTransaction.amount}
                  onChange={(event) => setNewTransaction((current) => ({ ...current, amount: event.target.value }))}
                  className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
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

              <button
                onClick={addTransaction}
                className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                Save entry
              </button>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="mb-3 text-sm uppercase tracking-[0.22em] text-slate-400">Recent activity</p>
              <div className="space-y-3">
                {recentTransactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-3 py-5 text-center text-sm text-slate-400">
                    No transactions yet. Add your first income or expense to get started.
                  </div>
                ) : (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                      <div>
                        <p className="font-medium text-white">{transaction.title}</p>
                        <p className="text-xs text-slate-400">
                          {transaction.category} • {transaction.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={transaction.type === "income" ? "text-emerald-300" : "text-rose-300"}>
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.amount, selectedCurrency)}
                        </span>
                        <button
                          onClick={() => deleteTransaction(transaction.id)}
                          className="text-xs text-slate-400 transition hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
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
