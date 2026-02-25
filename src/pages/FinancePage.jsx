import { useState, useMemo } from 'react'
import { useFinance } from '@context/FinanceContext'
import TransactionForm from '@components/finance/TransactionForm'
import BudgetBars from '@components/finance/BudgetBars'
import TransactionList from '@components/finance/TransactionList'
import { BUDGET_METHOD_LIST } from '@utils/financeConfig'
import '@styles/pages/finance.css'

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function FinancePage() {
  const {
    settings,
    addTransaction, deleteTransaction, updateSettings,
    addRecurringTemplate,
    getMonthTransactions, getMonthData, awardMonthXP,
  } = useFinance()

  const [activeMonth, setActiveMonth] = useState(getCurrentMonthKey)
  const [showForm, setShowForm] = useState(false)

  const monthData = useMemo(() => getMonthData(activeMonth), [getMonthData, activeMonth])
  const monthTxs  = useMemo(() => getMonthTransactions(activeMonth), [getMonthTransactions, activeMonth])

  const { totalIncome, totalExpenses, net, bucketData, isGoalMet, xpAwarded } = monthData
  const { currency, budgetMethod, customSplit } = settings

  const customTotal = customSplit.needs + customSplit.wants + customSplit.savings

  function handleCustomSplit(field, value) {
    const num = Math.max(0, Math.min(100, parseInt(value) || 0))
    updateSettings({ customSplit: { ...customSplit, [field]: num } })
  }

  const savingsRate = totalIncome > 0 ? Math.max(0, (net / totalIncome) * 100) : null

  return (
    <div className="finance-page">

      {/* ── Header ──────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Finance</h1>
        <button className="btn btn--primary btn--md" onClick={() => setShowForm(true)}>
          Add Transaction
        </button>
      </div>

      {/* ── Month Navigator ─────────────────────────── */}
      <div className="month-nav">
        <button
          className="month-nav__btn"
          onClick={() => setActiveMonth(m => shiftMonth(m, -1))}
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="month-nav__label">{getMonthLabel(activeMonth)}</span>
        <button
          className="month-nav__btn"
          onClick={() => setActiveMonth(m => shiftMonth(m, 1))}
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Overview Cards ───────────────────────────── */}
      <div className="finance-overview">
        <div className="finance-stat-card">
          <span className="finance-stat-card__label">Income</span>
          <span className="finance-stat-card__value finance-stat-card__value--income">
            {currency}{totalIncome.toFixed(2)}
          </span>
        </div>
        <div className="finance-stat-card">
          <span className="finance-stat-card__label">Expenses</span>
          <span className="finance-stat-card__value finance-stat-card__value--expense">
            {currency}{totalExpenses.toFixed(2)}
          </span>
        </div>
        <div className="finance-stat-card">
          <span className="finance-stat-card__label">Net</span>
          <span className={`finance-stat-card__value finance-stat-card__value--${net >= 0 ? 'positive' : 'negative'}`}>
            {net >= 0 ? '+' : ''}{currency}{net.toFixed(2)}
          </span>
        </div>
        <div className="finance-stat-card">
          <span className="finance-stat-card__label">Savings Rate</span>
          <span className="finance-stat-card__value finance-stat-card__value--accent">
            {savingsRate !== null ? `${savingsRate.toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>

      {/* ── Budget Section ───────────────────────────── */}
      <div className="finance-budget-section">
        <div className="finance-budget-header">
          <h2>Budget Method</h2>
          <div className="finance-budget-header__right">
            {isGoalMet && !xpAwarded && (
              <button className="claim-xp-btn" onClick={() => awardMonthXP(activeMonth)}>
                ⚡ Claim +100 XP
              </button>
            )}
            {xpAwarded && (
              <span className="finance-goal-badge finance-goal-badge--claimed">
                ✓ XP Claimed
              </span>
            )}
            <span className={`finance-goal-badge finance-goal-badge--${isGoalMet ? 'met' : 'pending'}`}>
              {isGoalMet ? '✓ Goal Met' : '◌ In Progress'}
            </span>
          </div>
        </div>

        {/* Method Pills */}
        <div className="budget-method-selector">
          {BUDGET_METHOD_LIST.map(method => (
            <button
              key={method.id}
              className={`budget-method-btn${budgetMethod === method.id ? ' budget-method-btn--active' : ''}`}
              onClick={() => updateSettings({ budgetMethod: method.id })}
            >
              <span className="budget-method-btn__name">{method.name}</span>
              <span className="budget-method-btn__desc">{method.description}</span>
            </button>
          ))}
        </div>

        {/* Custom Split Inputs */}
        {budgetMethod === 'custom' && (
          <div className="custom-split">
            {[['needs', 'Needs'], ['wants', 'Wants'], ['savings', 'Savings']].map(([field, label]) => (
              <div key={field} className="custom-split__field">
                <span className="custom-split__label">{label} %</span>
                <input
                  className="custom-split__input"
                  type="number"
                  min="0"
                  max="100"
                  value={customSplit[field]}
                  onChange={e => handleCustomSplit(field, e.target.value)}
                />
              </div>
            ))}
            <span className={`custom-split__total custom-split__total--${customTotal === 100 ? 'valid' : 'invalid'}`}>
              Total: {customTotal}%{customTotal !== 100 ? ' ≠ 100' : ' ✓'}
            </span>
          </div>
        )}

        {/* Budget Bars */}
        <BudgetBars
          bucketData={bucketData}
          currency={currency}
          totalIncome={totalIncome}
        />
      </div>

      {/* ── Transaction List ─────────────────────────── */}
      <TransactionList
        transactions={monthTxs}
        currency={currency}
        onDelete={deleteTransaction}
      />

      {/* ── Add Transaction Modal ────────────────────── */}
      {showForm && (
        <TransactionForm
          onSubmit={addTransaction}
          onRecurringSubmit={addRecurringTemplate}
          onClose={() => setShowForm(false)}
        />
      )}

    </div>
  )
}
