import { XPProvider }          from './XPContext'
import { TaskProvider }        from './TaskContext'
import { HabitProvider }       from './HabitContext'
import { AppointmentProvider } from './AppointmentContext'
import { NoSmokeProvider }     from './NoSmokeContext'
import { FinanceProvider }     from './FinanceContext'
import { LearningProvider }    from './LearningContext'
import { AIProvider }          from './AIContext'

export function AppProvider({ children }) {
  return (
    <XPProvider>
      <TaskProvider>
        <HabitProvider>
          <AppointmentProvider>
            <NoSmokeProvider>
              <FinanceProvider>
                <LearningProvider>
                  <AIProvider>
                    {children}
                  </AIProvider>
                </LearningProvider>
              </FinanceProvider>
            </NoSmokeProvider>
          </AppointmentProvider>
        </HabitProvider>
      </TaskProvider>
    </XPProvider>
  )
}
