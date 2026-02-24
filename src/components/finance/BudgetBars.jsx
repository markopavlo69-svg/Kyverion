export default function BudgetBars({ bucketData, currency, totalIncome }) {
  if (totalIncome === 0) {
    return (
      <p className="finance-empty-hint">
        Add income first to see your budget allocation.
      </p>
    )
  }

  return (
    <div className="budget-bars">
      {bucketData.map(b => (
        <div key={b.id} className="budget-bar">
          <div className="budget-bar__header">
            <div className="budget-bar__label">
              <span className="budget-bar__dot" style={{ background: b.color }} />
              {b.label}
              <span className="budget-bar__percent">({b.percent}%)</span>
            </div>
            <div className="budget-bar__amounts">
              {currency}{b.spent.toFixed(2)} / {currency}{b.allocated.toFixed(2)}
            </div>
          </div>

          <div className="budget-bar__track">
            <div
              className={`budget-bar__fill${b.overBudget ? ' budget-bar__fill--over' : ''}`}
              style={{
                width: `${b.percentage}%`,
                background: b.overBudget ? '#ef4444' : b.color,
              }}
            />
          </div>

          <div className="budget-bar__meta">
            <span className="budget-bar__used">{b.percentage.toFixed(0)}% used</span>
            <span className={`budget-bar__remaining budget-bar__remaining--${b.overBudget ? 'over' : 'ok'}`}>
              {b.overBudget
                ? `${currency}${Math.abs(b.remaining).toFixed(2)} over budget`
                : `${currency}${b.remaining.toFixed(2)} remaining`}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
