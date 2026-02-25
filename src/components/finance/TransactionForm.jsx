import { useState } from 'react'
import Modal from '@components/ui/Modal'
import { EXPENSE_CATEGORY_LIST, INCOME_CATEGORY_LIST } from '@utils/financeConfig'

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
]

export default function TransactionForm({ onSubmit, onRecurringSubmit, onClose }) {
  const [type,      setType]      = useState('expense')
  const [recurring, setRecurring] = useState(false)
  const [period,    setPeriod]    = useState('monthly')
  const [form,      setForm]      = useState({
    amount:      '',
    description: '',
    date:        getTodayString(),
    category:    'other',
  })

  const categories = type === 'income' ? INCOME_CATEGORY_LIST : EXPENSE_CATEGORY_LIST

  function handleSet(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleTypeChange(newType) {
    setType(newType)
    setForm(prev => ({ ...prev, category: 'other' }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.description || !form.date || isNaN(amount) || amount <= 0) return

    if (recurring && onRecurringSubmit) {
      const day = parseInt(form.date.slice(8), 10)
      onRecurringSubmit({
        type, amount, category: form.category,
        description: form.description,
        period, day,
        startMonth: form.date.slice(0, 7),
      })
    } else {
      onSubmit({ ...form, type, amount })
    }
    onClose()
  }

  return (
    <Modal isOpen={true} title="Add Transaction" onClose={onClose}>
      <form className="transaction-form" onSubmit={handleSubmit}>

        <div className="transaction-form__type-toggle">
          <button
            type="button"
            className={`tx-type-btn tx-type-btn--income${type === 'income' ? ' tx-type-btn--active' : ''}`}
            onClick={() => handleTypeChange('income')}
          >
            + Income
          </button>
          <button
            type="button"
            className={`tx-type-btn tx-type-btn--expense${type === 'expense' ? ' tx-type-btn--active' : ''}`}
            onClick={() => handleTypeChange('expense')}
          >
            − Expense
          </button>
        </div>

        <div className="form-field">
          <label>Description</label>
          <input
            type="text"
            placeholder="e.g. Monthly rent"
            value={form.description}
            onChange={e => handleSet('description', e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="transaction-form__row">
          <div className="form-field">
            <label>Amount (€)</label>
            <input
              type="number"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => handleSet('amount', e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label>{recurring ? 'Start date' : 'Date'}</label>
            <input
              type="date"
              value={form.date}
              onChange={e => handleSet('date', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label>Category</label>
          <select
            value={form.category}
            onChange={e => handleSet('category', e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Recurring toggle */}
        <div className="form-field">
          <label className="tx-recurring-label">
            <input
              type="checkbox"
              checked={recurring}
              onChange={e => setRecurring(e.target.checked)}
            />
            <span>Recurring transaction</span>
          </label>
          {recurring && (
            <div className="tx-period-row">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`freq-btn${period === opt.value ? ' freq-btn--active' : ''}`}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
              <span className="form-hint">Auto-added each {period === 'monthly' ? 'month' : 'year'} on the same day.</span>
            </div>
          )}
        </div>

        <div className="transaction-form__actions">
          <button type="button" className="btn btn--ghost btn--md" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary btn--md">
            {recurring ? 'Add Recurring' : 'Add Transaction'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
