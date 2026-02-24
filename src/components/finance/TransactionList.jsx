import { useState, useMemo } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@utils/financeConfig'

function getCategoryInfo(type, categoryId) {
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return cats[categoryId] ?? { label: categoryId, icon: '📦' }
}

const FILTERS = ['all', 'income', 'expense']

export default function TransactionList({ transactions, currency, onDelete }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    const base = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)
    return [...base].sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, filter])

  return (
    <div className="finance-tx-section">
      <div className="finance-tx-header">
        <h2>Transactions</h2>
        <div className="finance-tx-filters">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`finance-tx-filter-btn${filter === f ? ' finance-tx-filter-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="finance-empty-hint">No transactions yet for this period.</p>
      ) : (
        <div className="tx-list">
          {filtered.map(tx => {
            const cat = getCategoryInfo(tx.type, tx.category)
            return (
              <div key={tx.id} className="tx-item">
                <span className="tx-item__icon">{cat.icon}</span>
                <div className="tx-item__info">
                  <div className="tx-item__desc">{tx.description}</div>
                  <div className="tx-item__meta">{tx.date} · {cat.label}</div>
                </div>
                <span className={`tx-item__amount tx-item__amount--${tx.type}`}>
                  {tx.type === 'income' ? '+' : '−'}{currency}{tx.amount.toFixed(2)}
                </span>
                <button
                  className="tx-item__delete"
                  onClick={() => onDelete(tx.id)}
                  title="Delete transaction"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
