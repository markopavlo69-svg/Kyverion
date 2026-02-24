# Kyverion — Life Command Center

A gamified personal productivity app inspired by the dark, atmospheric aesthetic of Wuthering Waves. Level up real-life skills by completing tasks, building habits, and tracking your growth across multiple life categories.

## Features

- **Tasks** — Create tasks with priority levels (low / medium / high) and assign them to skill categories. Earn XP on completion.
- **Habits** — Track daily habits with streak counters. Bonus XP for 7-day, 30-day, and 100-day streaks.
- **Calendar** — Appointment scheduling with a monthly calendar view.
- **Learning Hub** — Organize learning areas with notes, resource links, and a built-in session timer. XP is awarded per minute studied.
- **Finance** — Track income and expenses with category budgets and visual budget bars.
- **No Smoke** — Quit-smoking tracker with days clean, money saved, and milestone tracking.
- **Profile** — Global level + per-category XP levels with animated progress bars and XP toast notifications.

## XP System

| Action | XP |
|---|---|
| Task (low) | 10 XP per category |
| Task (medium) | 25 XP per category |
| Task (high) | 50 XP per category |
| Daily habit | 15 XP |
| Streak bonus (7d / 30d / 100d) | +25 / +100 / +500 XP |
| Learning session | 2 XP / minute |

Multi-category tasks award full XP to each assigned category. Level formula: `100 × (N−1)^1.5`

## Tech Stack

- **React 18** + **Vite 5**
- Plain CSS with custom properties (no Tailwind, no CSS-in-JS)
- `localStorage` for persistence (no backend — yet)
- No React Router (page navigation via `activePage` state)

## Getting Started

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

```bash
npm run build   # production build → dist/
npm run preview # preview production build locally
```

## Project Structure

```
src/
├── components/
│   ├── calendar/     # CalendarView, CalendarDay, AppointmentForm
│   ├── finance/      # TransactionForm, TransactionList, BudgetBars
│   ├── habits/       # HabitCard, HabitList, HabitForm, StreakBadge
│   ├── layout/       # AppShell, Sidebar, TopBar
│   ├── learning/     # LearningDashboard, AreaCard, AreaDetail, LearningTimer, NoteCard, GlobalSearch
│   ├── profile/      # ProfileView, GlobalLevel, CategoryCard, XPFeedToast
│   ├── tasks/        # TaskCard, TaskList, TaskForm, TaskFilters, TaskStats
│   └── ui/           # Button, Modal, GlowCard, Badge, ProgressBar, IconButton, EmptyState
├── context/          # XP, Task, Habit, Appointment, NoSmoke, Finance, Learning providers
├── hooks/            # useLocalStorage
├── pages/            # One page component per section
├── styles/           # theme.css, global.css, per-page & per-component CSS
└── utils/            # categoryConfig.js, xpCalculator.js, financeConfig.js, dateUtils.js
```

## Roadmap

- [ ] Work Hub
- [ ] Supabase backend (auth + cloud sync)
- [ ] Vercel deployment
- [ ] React Router for deep linking
