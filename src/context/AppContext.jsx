import { XPProvider }          from './XPContext'
import { TaskProvider }        from './TaskContext'
import { HabitProvider }       from './HabitContext'
import { AppointmentProvider } from './AppointmentContext'
import { NoSmokeProvider }     from './NoSmokeContext'
import { FinanceProvider }     from './FinanceContext'
import { LearningProvider }    from './LearningContext'
import { WorkoutProvider }     from './WorkoutContext'
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
                  <WorkoutProvider>
                    <AIProvider>
                      {children}
                    </AIProvider>
                  </WorkoutProvider>
                </LearningProvider>
              </FinanceProvider>
            </NoSmokeProvider>
          </AppointmentProvider>
        </HabitProvider>
      </TaskProvider>
    </XPProvider>
  )
}
