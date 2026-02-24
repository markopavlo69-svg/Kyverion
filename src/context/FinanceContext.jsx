import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'
import { useXP } from './XPContext'
import { BUDGET_METHODS } from '@utils/financeConfig'

const FinanceContext = createContext(null)

const DEFAULT_SETTINGS = {
  budgetMethod: '50-30-20',
  customSplit:  { needs: 50, wants: 30, savings: 20 },
  currency:     '€',
}

function dbToTransaction(row) {
  return {
    id:          row.id,
    type:        row.type,
    amount:      Number(row.amount),
    category:    row.category,
    description: row.description ?? '',
    date:        row.date,
    month:       row.month,
    createdAt:   row.created_at,
  }
}

export function FinanceProvider({ children }) {
  const { user }    = useAuth()
  const { awardXP } = useXP()

  const [transactions, setTransactions] = useState([])
  const [settings,     setSettings]     = useState(DEFAULT_SETTINGS)
  const [xpAwarded,    setXpAwarded]    = useState({})

  useEffect(() => {
    async function load() {
      const [txRes, settRes] = await Promise.all([
        supabase.from('finance_transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('finance_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      if (txRes.error)   { console.error('Finance tx load error:', txRes.error); return }
      if (settRes.error) { console.error('Finance settings load error:', settRes.error); return }
      setTransactions((txRes.data ?? []).map(dbToTransaction))
      if (settRes.data) {
        setSettings({
          budgetMethod: settRes.data.budget_method ?? DEFAULT_SETTINGS.budgetMethod,
          customSplit:  settRes.data.custom_split  ?? DEFAULT_SETTINGS.customSplit,
          currency:     settRes.data.currency      ?? DEFAULT_SETTINGS.currency,
        })
        setXpAwarded(settRes.data.xp_awarded ?? {})
      }
    }
    load()
  }, [user.id])

  const persistSettings = useCallback((newSettings, newXpAwarded) => {
    supabase.from('finance_settings').upsert(
      {
        user_id:       user.id,
        budget_method: newSettings.budgetMethod,
        custom_split:  newSettings.customSplit,
        currency:      newSettings.currency,
        xp_awarded:    newXpAwarded,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    ).then(({ error }) => { if (error) console.error('Finance settings save error:', error) })
  }, [user.id])

  const addTransaction = useCallback((data) => {
    const id    = 'fin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
    const month = data.date.slice(0, 7)
    const tx    = { ...data, id, month, createdAt: new Date().toISOString() }
    setTransactions(prev => [tx, ...prev])
    supabase.from('finance_transactions').insert({
      id, user_id: user.id, type: data.type, amount: data.amount,
      category: data.category, description: data.description ?? '',
      date: data.date, month, created_at: tx.createdAt,
    }).then(({ error }) => { if (error) console.error('Finance tx insert error:', error) })
  }, [user.id])

  const deleteTransaction = useCallback((id) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    supabase.from('finance_transactions').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('Finance tx delete error:', error) })
  }, [])

  const updateSettings = useCallback((updates) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      persistSettings(next, xpAwarded)
      return next
    })
  }, [xpAwarded, persistSettings])

  const getMonthTransactions = useCallback((monthKey) => {
    return transactions.filter(t => t.month === monthKey)
  }, [transactions])

  const getMonthData = useCallback((monthKey) => {
    const txs           = transactions.filter(t => t.month === monthKey)
    const totalIncome   = txs.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0)
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const net           = totalIncome - totalExpenses
    const method  = BUDGET_METHODS[settings.budgetMethod] ?? BUDGET_METHODS['50-30-20']
    const buckets = method.id === 'custom'
      ? [
          { id: 'needs',   label: 'Needs',   percent: settings.customSplit.needs,   color: '#00d4ff' },
          { id: 'wants',   label: 'Wants',   percent: settings.customSplit.wants,   color: '#a855f7' },
          { id: 'savings', label: 'Savings', percent: settings.customSplit.savings, color: '#10b981' },
        ]
      : method.buckets
    const categoryMap = method.categoryMap
    const bucketSpent = {}
    txs.filter(t => t.type === 'expense').forEach(t => {
      const bucketId = categoryMap[t.category] ?? buckets[0]?.id
      if (bucketId) bucketSpent[bucketId] = (bucketSpent[bucketId] ?? 0) + t.amount
    })
    const bucketData = buckets.map(b => {
      const allocated  = totalIncome * (b.percent / 100)
      const spent      = bucketSpent[b.id] ?? 0
      const remaining  = allocated - spent
      const percentage = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0
      return { ...b, allocated, spent, remaining, percentage, overBudget: allocated > 0 && spent > allocated }
    })
    return {
      totalIncome, totalExpenses, net, bucketData,
      isGoalMet: totalIncome > 0 && totalExpenses > 0 && bucketData.every(b => !b.overBudget),
      xpAwarded: !!xpAwarded[monthKey],
    }
  }, [transactions, settings, xpAwarded])

  const awardMonthXP = useCallback((monthKey) => {
    if (xpAwarded[monthKey]) return
    awardXP('discipline', 100)
    setXpAwarded(prev => {
      const next = { ...prev, [monthKey]: true }
      persistSettings(settings, next)
      return next
    })
  }, [xpAwarded, awardXP, settings, persistSettings])

  const value = useMemo(() => ({
    transactions, settings,
    addTransaction, deleteTransaction, updateSettings,
    getMonthTransactions, getMonthData, awardMonthXP,
  }), [transactions, settings, addTransaction, deleteTransaction, updateSettings, getMonthTransactions, getMonthData, awardMonthXP])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider')
  return ctx
}
