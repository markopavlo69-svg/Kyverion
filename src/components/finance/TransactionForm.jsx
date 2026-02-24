import { useState } from 'react'
import Modal from '@components/ui/Modal'
import { EXPENSE_CATEGORY_LIST, INCOME_CATEGORY_LIST } from '@utils/financeConfig'

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

export default function TransactionForm({ onSubmit, onClose }) {
  const [type, setType] = useState('expense')
  const [form, setForm] = useState({
    amount: '',
    description: '',
    date: getTodayString(),
    category: 'other',
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
    onSubmit({ ...form, type, amount })
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
            <label>Date</label>
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

        <div className="transaction-form__actions">
          <button type="button" className="btn btn--ghost btn--md" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary btn--md">
            Add Transaction
          </button>
        </div>

      </form>
    </Modal>
  )
}
