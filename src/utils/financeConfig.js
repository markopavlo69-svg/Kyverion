export const BUDGET_METHODS = {
  '50-30-20': {
    id: '50-30-20',
    name: '50/30/20',
    description: 'Needs 50% · Wants 30% · Savings 20%',
    buckets: [
      { id: 'needs',   label: 'Needs',   percent: 50, color: '#00d4ff' },
      { id: 'wants',   label: 'Wants',   percent: 30, color: '#a855f7' },
      { id: 'savings', label: 'Savings', percent: 20, color: '#10b981' },
    ],
    categoryMap: {
      housing: 'needs', food: 'needs', transport: 'needs', health: 'needs', utilities: 'needs',
      entertainment: 'wants', dining: 'wants', shopping: 'wants', hobbies: 'wants',
      other: 'wants', giving: 'wants',
      savings: 'savings', investment: 'savings',
    },
  },
  '70-20-10': {
    id: '70-20-10',
    name: '70/20/10',
    description: 'Living 70% · Savings 20% · Giving 10%',
    buckets: [
      { id: 'living',  label: 'Living',  percent: 70, color: '#00d4ff' },
      { id: 'savings', label: 'Savings', percent: 20, color: '#10b981' },
      { id: 'giving',  label: 'Giving',  percent: 10, color: '#f59e0b' },
    ],
    categoryMap: {
      housing: 'living', food: 'living', transport: 'living', health: 'living', utilities: 'living',
      entertainment: 'living', dining: 'living', shopping: 'living', hobbies: 'living', other: 'living',
      savings: 'savings', investment: 'savings',
      giving: 'giving',
    },
  },
  '80-20': {
    id: '80-20',
    name: '80/20',
    description: 'Spending 80% · Savings 20%',
    buckets: [
      { id: 'spending', label: 'Spending', percent: 80, color: '#00d4ff' },
      { id: 'savings',  label: 'Savings',  percent: 20, color: '#10b981' },
    ],
    categoryMap: {
      housing: 'spending', food: 'spending', transport: 'spending', health: 'spending',
      utilities: 'spending', entertainment: 'spending', dining: 'spending', shopping: 'spending',
      hobbies: 'spending', other: 'spending', giving: 'spending',
      savings: 'savings', investment: 'savings',
    },
  },
  'custom': {
    id: 'custom',
    name: 'Custom',
    description: 'Set your own percentages',
    buckets: [
      { id: 'needs',   label: 'Needs',   percent: 50, color: '#00d4ff' },
      { id: 'wants',   label: 'Wants',   percent: 30, color: '#a855f7' },
      { id: 'savings', label: 'Savings', percent: 20, color: '#10b981' },
    ],
    categoryMap: {
      housing: 'needs', food: 'needs', transport: 'needs', health: 'needs', utilities: 'needs',
      entertainment: 'wants', dining: 'wants', shopping: 'wants', hobbies: 'wants',
      other: 'wants', giving: 'wants',
      savings: 'savings', investment: 'savings',
    },
  },
}

export const BUDGET_METHOD_LIST = Object.values(BUDGET_METHODS)

export const EXPENSE_CATEGORIES = {
  housing:       { id: 'housing',       label: 'Housing',        icon: '🏠' },
  food:          { id: 'food',          label: 'Food & Grocery',  icon: '🛒' },
  transport:     { id: 'transport',     label: 'Transport',       icon: '🚗' },
  health:        { id: 'health',        label: 'Health',          icon: '🏥' },
  utilities:     { id: 'utilities',     label: 'Utilities',       icon: '💡' },
  entertainment: { id: 'entertainment', label: 'Entertainment',   icon: '🎬' },
  dining:        { id: 'dining',        label: 'Dining Out',      icon: '🍕' },
  shopping:      { id: 'shopping',      label: 'Shopping',        icon: '🛍️' },
  hobbies:       { id: 'hobbies',       label: 'Hobbies',         icon: '🎮' },
  savings:       { id: 'savings',       label: 'Savings',         icon: '💰' },
  investment:    { id: 'investment',    label: 'Investment',      icon: '📈' },
  giving:        { id: 'giving',        label: 'Giving / Debt',   icon: '🤝' },
  other:         { id: 'other',         label: 'Other',           icon: '📦' },
}

export const INCOME_CATEGORIES = {
  salary:     { id: 'salary',     label: 'Salary',     icon: '💼' },
  freelance:  { id: 'freelance',  label: 'Freelance',  icon: '💻' },
  investment: { id: 'investment', label: 'Investment', icon: '📈' },
  gift:       { id: 'gift',       label: 'Gift',       icon: '🎁' },
  other:      { id: 'other',      label: 'Other',      icon: '💰' },
}

export const EXPENSE_CATEGORY_LIST = Object.values(EXPENSE_CATEGORIES)
export const INCOME_CATEGORY_LIST  = Object.values(INCOME_CATEGORIES)
