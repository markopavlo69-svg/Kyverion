import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '@hooks/useLocalStorage'
import { STORAGE_KEYS } from '@utils/storageKeys'
import { useXP } from './XPContext'
import { BUDGET_METHODS } from '@utils/financeConfig'

const FinanceContext = createContext(null)

const INITIAL_FINANCE = {
  transactions: [],
  settings: {
    budgetMethod: '50-30-20',
    customSplit: { needs: 50, wants: 30, savings: 20 },
    currency: '€',
  },
  xpAwarded: {},
}

export function FinanceProvider({ children }) {
  const [financeData, setFinanceData] = useLocalStorage(STORAGE_KEYS.FINANCE, INITIAL_FINANCE)
  const { awardXP } = useXP()

  const addTransaction = useCallback((data) => {
    const id = `fin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const month = data.date.slice(0, 7)
    setFinanceData(prev => ({
      ...prev,
      transactions: [
        ...prev.transactions,
        { ...data, id, month, createdAt: new Date().toISOString() },
      ],
    }))
  }, [setFinanceData])

  const deleteTransaction = useCallback((id) => {
    setFinanceData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
    }))
  }, [setFinanceData])

  const updateSettings = useCallback((updates) => {
    setFinanceData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }))
  }, [setFinanceData])

  const getMonthTransactions = useCallback((monthKey) => {
    return financeData.transactions.filter(t => t.month === monthKey)
  }, [financeData.transactions])

  const getMonthData = useCallback((monthKey) => {
    const txs = financeData.transactions.filter(t => t.month === monthKey)
    const { settings } = financeData

    const totalIncome = txs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = txs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const net = totalIncome - totalExpenses

    const method = BUDGET_METHODS[settings.budgetMethod] ?? BUDGET_METHODS['50-30-20']

    const buckets = method.id === 'custom'
      ? [
          { id: 'needs',   label: 'Needs',   percent: settings.customSplit.needs,   color: '#00d4ff' },
          { id: 'wants',   label: 'Wants',   percent: settings.customSplit.wants,   color: '#a855f7' },
          { id: 'savings', label: 'Savings', percent: settings.customSplit.savings, color: '#10b981' },
        ]
      : method.buckets

    const categoryMap = method.categoryMap

    const bucketSpent = {}
    txs
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const bucketId = categoryMap[t.category] ?? buckets[0]?.id
        if (bucketId) {
          bucketSpent[bucketId] = (bucketSpent[bucketId] ?? 0) + t.amount
        }
      })

    const bucketData = buckets.map(b => {
      const allocated = totalIncome * (b.percent / 100)
      const spent = bucketSpent[b.id] ?? 0
      const remaining = allocated - spent
      const percentage = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0
      return {
        ...b,
        allocated,
        spent,
        remaining,
        percentage,
        overBudget: allocated > 0 && spent > allocated,
      }
    })

    const isGoalMet =
      totalIncome > 0 &&
      totalExpenses > 0 &&
      bucketData.every(b => !b.overBudget)

    return {
      totalIncome,
      totalExpenses,
      net,
      bucketData,
      isGoalMet,
      xpAwarded: !!financeData.xpAwarded[monthKey],
    }
  }, [financeData])

  const awardMonthXP = useCallback((monthKey) => {
    if (financeData.xpAwarded[monthKey]) return
    awardXP('discipline', 100)
    setFinanceData(prev => ({
      ...prev,
      xpAwarded: { ...prev.xpAwarded, [monthKey]: true },
    }))
  }, [financeData.xpAwarded, awardXP, setFinanceData])

  const value = useMemo(() => ({
    transactions: financeData.transactions,
    settings: financeData.settings,
    addTransaction,
    deleteTransaction,
    updateSettings,
    getMonthTransactions,
    getMonthData,
    awardMonthXP,
  }), [financeData, addTransaction, deleteTransaction, updateSettings, getMonthTransactions, getMonthData, awardMonthXP])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider')
  return ctx
}
