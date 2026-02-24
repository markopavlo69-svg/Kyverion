import { XPProvider } from './XPContext'
import { TaskProvider } from './TaskContext'
import { HabitProvider } from './HabitContext'
import { AppointmentProvider } from './AppointmentContext'
import { NoSmokeProvider } from './NoSmokeContext'
import { FinanceProvider } from './FinanceContext'
import { LearningProvider } from './LearningContext'

export function AppProvider({ children }) {
  return (
    <XPProvider>
      <TaskProvider>
        <HabitProvider>
          <AppointmentProvider>
            <NoSmokeProvider>
              <FinanceProvider>
                <LearningProvider>
                  {children}
                </LearningProvider>
              </FinanceProvider>
            </NoSmokeProvider>
          </AppointmentProvider>
        </HabitProvider>
      </TaskProvider>
    </XPProvider>
  )
}
