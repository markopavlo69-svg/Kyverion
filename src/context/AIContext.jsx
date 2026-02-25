import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase }           from '@lib/supabase'
import { useAuth }            from './AuthContext'
import { useTasks }           from './TaskContext'
import { useHabits }          from './HabitContext'
import { useAppointments }    from './AppointmentContext'
import { useXP }              from './XPContext'
import { CHARACTERS, CHARACTER_LIST, DEFAULT_CHARACTER } from '@data/characters'
import { streamChat }         from '@services/groqService'
import { buildAppState }      from '@utils/appStateBuilder'
import { parseActions, executeActions } from '@utils/aiActionParser'

const AIContext = createContext(null)

// Max messages kept in Supabase per character
const MAX_STORED_MESSAGES = 100
// Max messages sent to the model as conversation history
const MAX_CONTEXT_MESSAGES = 40

// ── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(character, memoryText, appState) {
  const identity = character.personality
    ? `You are ${character.name} from ${character.game}.\n${character.personality}`
    : `You are ${character.name} from ${character.game}, acting as a helpful life companion. Be encouraging, in character, and concise.`

  const memory = memoryText
    ? `\nWHAT YOU REMEMBER ABOUT THIS USER:\n${memoryText}\n`
    : ''

  const capabilities = `
You can take actions for the user by embedding special tags anywhere in your response (the app strips them before display):
  [ACTION:complete_habit:HABIT_ID]               — mark a daily habit done today
  [ACTION:complete_task:TASK_ID]                 — mark a task as completed
  [ACTION:add_task:TITLE|PRIORITY|CATEGORY]      — add task (priority: low/medium/high; category: strength/intelligence/creativity/discipline/social/vitality)
  [ACTION:add_appointment:TITLE|DATE|TIME|DESC]  — add appointment (DATE: YYYY-MM-DD, TIME: HH:MM or blank)
  [ACTION:navigate:PAGE]                         — navigate (pages: dashboard/tasks/habits/calendar/finance/learning/nosmoke/profile)
  [ACTION:remember:FACT]                         — persist an important fact about the user to your memory (use sparingly)

Rules:
- Only use action tags when clearly warranted by what the user said
- Only use IDs that appear in the app state — never invent them
- Confirm every action you take in your response, in character
- Keep responses brief and natural; this is a chat, not an essay`.trim()

  return `${identity}\n${memory}\nCURRENT APP STATE:\n${appState}\n\nCAPABILITIES:\n${capabilities}`
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AIProvider({ children }) {
  const { user }                               = useAuth()
  const { tasks, addTask, completeTask }       = useTasks()
  const { habits, completeHabitToday }         = useHabits()
  const { appointments, addAppointment }       = useAppointments()
  const { xpData }                             = useXP()

  const [activeCharacterId, setActiveCharacterId] = useState(DEFAULT_CHARACTER)
  const [chatHistories, setChatHistories] = useState(
    () => Object.fromEntries(CHARACTER_LIST.map(c => [c.id, []]))
  )
  const [characterMemories, setCharacterMemories] = useState(
    () => Object.fromEntries(CHARACTER_LIST.map(c => [c.id, '']))
  )
  const [isOpen,      setIsOpen]      = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Refs so callbacks always read the latest values without stale closures
  const tasksRef          = useRef(tasks)
  const habitsRef         = useRef(habits)
  const appointmentsRef   = useRef(appointments)
  const xpDataRef         = useRef(xpData)
  const historiesRef      = useRef(chatHistories)
  const memoriesRef       = useRef(characterMemories)
  const activeCharRef     = useRef(activeCharacterId)
  const isStreamingRef    = useRef(isStreaming)
  const isOpenRef         = useRef(isOpen)
  const navigateFnRef     = useRef(null)
  const activePageRef     = useRef('dashboard')

  useEffect(() => { tasksRef.current        = tasks          }, [tasks])
  useEffect(() => { habitsRef.current       = habits         }, [habits])
  useEffect(() => { appointmentsRef.current = appointments   }, [appointments])
  useEffect(() => { xpDataRef.current       = xpData         }, [xpData])
  useEffect(() => { historiesRef.current    = chatHistories  }, [chatHistories])
  useEffect(() => { memoriesRef.current     = characterMemories }, [characterMemories])
  useEffect(() => { activeCharRef.current   = activeCharacterId }, [activeCharacterId])
  useEffect(() => { isStreamingRef.current  = isStreaming    }, [isStreaming])
  useEffect(() => { isOpenRef.current       = isOpen         }, [isOpen])

  // ── Load from Supabase on mount ──────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      const [histRes, memRes] = await Promise.all([
        supabase.from('ai_chat_history')
          .select('character_id, messages')
          .eq('user_id', user.id),
        supabase.from('ai_character_memory')
          .select('character_id, memory_text')
          .eq('user_id', user.id),
      ])

      if (histRes.data) {
        setChatHistories(prev => {
          const next = { ...prev }
          for (const row of histRes.data) {
            if (next[row.character_id] !== undefined) {
              next[row.character_id] = row.messages ?? []
            }
          }
          return next
        })
      }

      if (memRes.data) {
        setCharacterMemories(prev => {
          const next = { ...prev }
          for (const row of memRes.data) {
            if (next[row.character_id] !== undefined) {
              next[row.character_id] = row.memory_text ?? ''
            }
          }
          return next
        })
      }
    }
    loadAll()
  }, [user.id])

  // ── Persistence helpers ──────────────────────────────────────────────────
  const saveHistory = useCallback(async (characterId, messages) => {
    const toSave = messages.slice(-MAX_STORED_MESSAGES).map(m => ({
      id:          m.id,
      role:        m.role,
      content:     m.content,
      timestamp:   m.timestamp,
      isProactive: m.isProactive  ?? false,
      hadImage:    m.hadImage     ?? false,
      actions:     m.actions      ?? [],
    }))
    await supabase.from('ai_chat_history').upsert(
      { user_id: user.id, character_id: characterId, messages: toSave, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,character_id' }
    )
  }, [user.id])

  const saveMemory = useCallback(async (characterId, memoryText) => {
    await supabase.from('ai_character_memory').upsert(
      { user_id: user.id, character_id: characterId, memory_text: memoryText, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,character_id' }
    )
  }, [user.id])

  // ── Register navigation + active page (called from AIChat component) ─────
  const registerNavigate    = useCallback((fn)   => { navigateFnRef.current  = fn    }, [])
  const registerActivePage  = useCallback((page) => { activePageRef.current  = page  }, [])

  // ── Remember a fact for the active character ─────────────────────────────
  const rememberFact = useCallback(async (fact) => {
    const charId = activeCharRef.current
    setCharacterMemories(prev => {
      const existing = prev[charId] || ''
      const updated  = existing ? `${existing}\n${fact}` : fact
      saveMemory(charId, updated)
      return { ...prev, [charId]: updated }
    })
  }, [saveMemory])

  // ── Send a message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(async (userText, imageDataUrl = null) => {
    if (isStreamingRef.current) return
    if (!userText?.trim() && !imageDataUrl) return

    const charId    = activeCharRef.current
    const character = CHARACTERS[charId]
    const mkId      = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    const userMsgId = mkId()
    const aiMsgId   = mkId()

    const userMsg = {
      id:           userMsgId,
      role:         'user',
      content:      userText?.trim() ?? '',
      timestamp:    new Date().toISOString(),
      hadImage:     !!imageDataUrl,
      imageDataUrl: imageDataUrl || null,
      actions:      [],
    }

    // Snapshot current history before async work (avoids stale closure issues)
    const currentHistory = historiesRef.current[charId] ?? []

    setChatHistories(prev => ({
      ...prev,
      [charId]: [
        ...prev[charId],
        userMsg,
        { id: aiMsgId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date().toISOString(), actions: [] },
      ],
    }))

    setIsStreaming(true)

    try {
      const appState = buildAppState({
        tasks:        tasksRef.current,
        habits:       habitsRef.current,
        appointments: appointmentsRef.current,
        xpData:       xpDataRef.current,
        activePage:   activePageRef.current,
      })
      const memory       = memoriesRef.current[charId] || ''
      const systemPrompt = buildSystemPrompt(character, memory, appState)

      // Build Groq message array (history as plain text, current msg with optional image)
      const historyMsgs = currentHistory
        .slice(-MAX_CONTEXT_MESSAGES)
        .map(m => ({ role: m.role, content: m.content }))

      const currentUserContent = imageDataUrl
        ? [
            { type: 'image_url', image_url: { url: imageDataUrl } },
            { type: 'text', text: userText?.trim() || 'What do you see in this image?' },
          ]
        : (userText?.trim() ?? '')

      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...historyMsgs,
        { role: 'user', content: currentUserContent },
      ]

      // Stream response
      let fullResponse = ''
      for await (const chunk of streamChat(groqMessages, { hasImage: !!imageDataUrl })) {
        fullResponse += chunk
        setChatHistories(prev => ({
          ...prev,
          [charId]: prev[charId].map(m =>
            m.id === aiMsgId ? { ...m, content: fullResponse } : m
          ),
        }))
      }

      // Parse + execute actions
      const { cleanText, actions: parsedActions } = parseActions(fullResponse)
      const actionResults = await executeActions(parsedActions, {
        tasks:             tasksRef.current,
        habits:            habitsRef.current,
        completeHabitToday,
        completeTask,
        addTask,
        addAppointment,
        navigate:          navigateFnRef.current,
        remember:          rememberFact,
      })

      const finalAiMsg = {
        id:          aiMsgId,
        role:        'assistant',
        content:     cleanText,
        timestamp:   new Date().toISOString(),
        isStreaming: false,
        actions:     actionResults,
      }

      // Commit final message and save
      setChatHistories(prev => {
        const updated = prev[charId].map(m => m.id === aiMsgId ? finalAiMsg : m)
        saveHistory(charId, updated)
        return { ...prev, [charId]: updated }
      })

    } catch (err) {
      console.error('AI chat error:', err)
      const errMsg = {
        id:          aiMsgId,
        role:        'assistant',
        content:     `Something went wrong: ${err.message}`,
        timestamp:   new Date().toISOString(),
        isStreaming: false,
        actions:     [],
      }
      setChatHistories(prev => ({
        ...prev,
        [charId]: prev[charId].map(m => m.id === aiMsgId ? errMsg : m),
      }))
    } finally {
      setIsStreaming(false)
    }
  }, [
    completeHabitToday, completeTask, addTask, addAppointment,
    rememberFact, saveHistory,
  ])

  // ── Switch character ─────────────────────────────────────────────────────
  const switchCharacter = useCallback((charId) => {
    if (CHARACTERS[charId]) setActiveCharacterId(charId)
  }, [])

  // ── Toggle chat open / close ─────────────────────────────────────────────
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) setUnreadCount(0)
      return !prev
    })
  }, [])

  // ── Proactive notification check (every 30 minutes) ──────────────────────
  useEffect(() => {
    const checkProactive = async () => {
      if (isStreamingRef.current) return

      const today = new Date().toISOString().slice(0, 10)
      const now   = new Date()
      const hour  = now.getHours()

      const triggers = []

      // Habits not done after 8 PM
      if (hour >= 20) {
        const undone = (habitsRef.current ?? []).filter(
          h => h.frequency === 'daily' && !h.completions?.some(c => c.date === today)
        )
        if (undone.length > 0) {
          triggers.push(`Habits not done today: ${undone.map(h => h.name).join(', ')}`)
        }
      }

      // Overdue tasks
      const overdue = (tasksRef.current ?? []).filter(
        t => !t.completed && t.dueDate && t.dueDate < today
      )
      if (overdue.length > 0) {
        triggers.push(`Overdue tasks: ${overdue.map(t => t.title).join(', ')}`)
      }

      // Appointments in next 90 minutes
      const nowMs   = now.getTime()
      const in90Min = nowMs + 90 * 60 * 1000
      const soon    = (appointmentsRef.current ?? []).filter(a => {
        if (a.date !== today || !a.time) return false
        const [h, m] = a.time.split(':').map(Number)
        const apptMs = new Date(today + 'T00:00:00').setHours(h, m, 0, 0)
        return apptMs > nowMs && apptMs <= in90Min
      })
      if (soon.length > 0) {
        triggers.push(`Appointment soon: ${soon.map(a => `${a.title} at ${a.time}`).join(', ')}`)
      }

      if (triggers.length === 0) return

      const charId    = activeCharRef.current
      const character = CHARACTERS[charId]
      const memory    = memoriesRef.current[charId] || ''

      const sysPrompt = `You are ${character.name} from ${character.game}. ${character.personality || ''}${memory ? `\nUser memory:\n${memory}` : ''}
Generate ONE short, friendly reminder message in character (1-2 sentences max). No action tags.`

      try {
        let content = ''
        for await (const chunk of streamChat([
          { role: 'system', content: sysPrompt },
          { role: 'user',   content: `Reminder triggers: ${triggers.join('; ')}` },
        ])) {
          content += chunk
        }

        if (!content.trim()) return

        const proactiveMsg = {
          id:          `msg_${Date.now()}_proactive`,
          role:        'assistant',
          content:     content.trim(),
          timestamp:   new Date().toISOString(),
          isProactive: true,
          actions:     [],
        }

        setChatHistories(prev => {
          const updated = [...prev[charId], proactiveMsg]
          saveHistory(charId, updated)
          return { ...prev, [charId]: updated }
        })

        if (!isOpenRef.current) {
          setUnreadCount(prev => prev + 1)
        }
      } catch (e) {
        console.warn('Proactive check failed:', e.message)
      }
    }

    const interval = setInterval(checkProactive, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [saveHistory]) // stable deps only; live values read via refs

  // ── Context value ────────────────────────────────────────────────────────
  return (
    <AIContext.Provider value={{
      characters:      CHARACTERS,
      characterList:   CHARACTER_LIST,
      activeCharacterId,
      activeCharacter: CHARACTERS[activeCharacterId],
      chatHistories,
      currentHistory:  chatHistories[activeCharacterId] ?? [],
      characterMemories,
      isOpen,
      isStreaming,
      unreadCount,
      sendMessage,
      switchCharacter,
      toggleChat,
      registerNavigate,
      registerActivePage,
    }}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const ctx = useContext(AIContext)
  if (!ctx) throw new Error('useAI must be used within AIProvider')
  return ctx
}
