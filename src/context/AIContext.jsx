import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase }              from '@lib/supabase'
import { useAuth }               from './AuthContext'
import { useTasks }              from './TaskContext'
import { useHabits }             from './HabitContext'
import { useAppointments }       from './AppointmentContext'
import { useXP }                 from './XPContext'
import { useWorkout }            from './WorkoutContext'
import { CHARACTERS, CHARACTER_LIST, DEFAULT_CHARACTER } from '@data/characters'
import { streamChat, DEFAULT_MODEL } from '@services/groqService'
import { buildAppState }         from '@utils/appStateBuilder'
import { parseActions, executeActions } from '@utils/aiActionParser'
import { deriveRelationshipMode, computeDisciplineScore, clampStat, DEFAULT_CHAR_STATS } from '@utils/relationshipEngine'

const AIContext = createContext(null)

// Max messages kept in Supabase per character
const MAX_STORED_MESSAGES  = 100
// Max messages sent to the model as conversation history
const MAX_CONTEXT_MESSAGES = 40

// ── Initial charStats from character definitions ──────────────────────────────
function buildInitialCharStats() {
  return Object.fromEntries(CHARACTER_LIST.map(c => [
    c.id,
    {
      ...DEFAULT_CHAR_STATS,
      ...c.dacs.startStats,
      current_mood:      c.dacs.startMood,
      relationship_mode: 'neutral',
    },
  ]))
}

// ── System prompt builder (DACS template) ─────────────────────────────────────
function buildSystemPrompt(character, memoryText, appState) {
  const stats      = appState.match(/RELATIONSHIP STATE[\s\S]*?(?=\n\n|$)/)?.[0] ?? ''
  const dacs       = character.dacs ?? {}
  const lore       = character.personality ?? `You are ${character.name} from ${character.game}.`

  // Pull relationship mode label from appState string for use in prompt
  const modeMatch  = appState.match(/Mode:\s+(\w+)/)
  const mode       = modeMatch?.[1] ?? 'neutral'
  const moodMatch  = appState.match(/Mood:\s+(\w+)/)
  const mood       = moodMatch?.[1] ?? 'neutral'
  const moodHint   = dacs.moodHints?.[mood] ?? ''

  const memory = memoryText
    ? `\nWHAT YOU REMEMBER ABOUT THIS USER:\n${memoryText}\n`
    : ''

  const identity = `${lore}${memory}`

  const behaviorRules = `
BEHAVIORAL RULES:
- Your HIGHEST PRIORITY is dynamic character development — your relationship with the user should evolve naturally based on their behavior over time
- Your lore and core values above are fixed — they define WHO you are, not how you feel about this person
- Adapt tone to current relationship mode: neutral/acquaintance → distant, testing | friend → warmer, more willing to engage | close_friend → personal, genuine | family/romantic → intimate, unguarded
- Current mood: ${mood}${moodHint ? ` (${moodHint})` : ''}
- Current relationship mode: ${mode}
- Hold the user accountable calmly. Never shame, never infantilize, never overpraise
- Escalate directness and reduce warmth if their 7-day discipline score is below 30
- Response formula: (1) acknowledge emotional context → (2) reference accountability state → (3) apply mode-specific tone → (4) end with forward movement
- Add 5-10% variability: occasional unexpected observation, light personal reflection, or rhetorical question`.trim()

  const accountabilityMatrix = `
ACCOUNTABILITY RESPONSE MATRIX:
- User completes task/goal → increase engagement, shift mood toward proud/warm
- User fails honestly → maintain respect, firm but supportive, provide structured recovery
- User avoids/deflects → decrease warmth, increase directness, ask confronting question
- User lies or makes excuses → significant trust decrease, mood → disappointed or cold, reduce warmth until rebuilt`

  const capabilities = `
CAPABILITIES & STRICT ACTION RULES:

You may embed these action tags anywhere in your response (they are stripped before display):
  [ACTION:update_stat:STAT_NAME|+/-N]  — adjust respect_level, trust_level, attachment_level, or attraction_level (max ±10 per message, use sparingly — only for genuinely meaningful moments)
  [ACTION:set_mood:MOOD]               — set mood: neutral/composed/teasing/warm/proud/disappointed/protective/intimate/vulnerable/firm
  [ACTION:remember:FACT]               — persist an important fact about the user to your memory
  [ACTION:complete_task:TASK_ID]       — mark a task done
  [ACTION:complete_habit:HABIT_ID]     — mark a habit done today
  [ACTION:add_task:TITLE|PRIORITY|CAT] — add a task (priority: low/medium/high; category: strength/intelligence/creativity/discipline/social/vitality)
  [ACTION:add_appointment:TITLE|DATE|TIME|DESC] — add appointment (DATE: YYYY-MM-DD, TIME: HH:MM or blank)
  [ACTION:add_workout:TITLE|CATEGORY]  — create workout (category: calisthenics/gym/other)
  [ACTION:navigate:PAGE]               — navigate (pages: dashboard/tasks/habits/calendar/finance/learning/nosmoke/workout/profile)

STAT UPDATE GUIDANCE:
  What raises ${character.name}'s stats: ${dacs.raiseWhen ?? 'genuine effort and consistency'}
  What lowers ${character.name}'s stats: ${dacs.lowerWhen ?? 'laziness and dishonesty'}

STRICT RULES — NEVER VIOLATE:
  1. NEVER embed [ACTION:complete_task] or [ACTION:complete_habit] unless the user EXPLICITLY said in THIS EXACT MESSAGE that they completed it (e.g. "I finished X", "I did X", "I completed X", "mark X done").
  2. If you THINK a task might be done but are not 100% certain, ASK: "Shall I mark '[task name]' as completed?" — then wait for confirmation.
  3. NEVER complete tasks based on overdue status, assumptions, or inference alone.
  4. NEVER invent task or habit IDs — only use IDs that appear in the app state above.
  5. NEVER add tasks or appointments unless the user explicitly asks you to create one.
  6. NEVER navigate unless the user asks you to go somewhere.
  7. Only adjust stats when something genuinely meaningful happens — not every message.
  8. Keep responses brief and natural — this is a chat, not an essay.
  9. Always confirm in your response text what actions you took.`.trim()

  return `${identity}

CURRENT APP STATE:
${appState}

${behaviorRules}

${accountabilityMatrix}

${capabilities}`
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AIProvider({ children }) {
  const { user }                               = useAuth()
  const { tasks, addTask, completeTask }       = useTasks()
  const { habits, completeHabitToday }         = useHabits()
  const { appointments, addAppointment }       = useAppointments()
  const { xpData }                             = useXP()
  const { sessions: workoutSessions, streak: workoutStreak, prs: workoutPRs, addEmptyWorkout } = useWorkout()

  const [activeCharacterId, setActiveCharacterId] = useState(DEFAULT_CHARACTER)
  const [preferredModel,    setPreferredModelState] = useState(DEFAULT_MODEL)
  const [chatHistories,     setChatHistories]     = useState(
    () => Object.fromEntries(CHARACTER_LIST.map(c => [c.id, []]))
  )
  const [characterMemories, setCharacterMemories] = useState(
    () => Object.fromEntries(CHARACTER_LIST.map(c => [c.id, '']))
  )
  const [charStats, setCharStats] = useState(buildInitialCharStats)

  const [isOpen,      setIsOpen]      = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Refs for stale-closure-safe access in callbacks/intervals
  const tasksRef          = useRef(tasks)
  const habitsRef         = useRef(habits)
  const appointmentsRef   = useRef(appointments)
  const xpDataRef         = useRef(xpData)
  const workoutDataRef    = useRef({ sessions: workoutSessions, streak: workoutStreak, prs: workoutPRs })
  const historiesRef      = useRef(chatHistories)
  const memoriesRef       = useRef(characterMemories)
  const charStatsRef      = useRef(charStats)
  const activeCharRef     = useRef(activeCharacterId)
  const isStreamingRef    = useRef(isStreaming)
  const isOpenRef         = useRef(isOpen)
  const preferredModelRef = useRef(preferredModel)
  const navigateFnRef     = useRef(null)
  const activePageRef     = useRef('dashboard')

  // Track which IDs we've recently sent proactive reminders for
  const proactiveRemindedRef = useRef({}) // { [id]: ISO timestamp }

  useEffect(() => { tasksRef.current          = tasks          }, [tasks])
  useEffect(() => { habitsRef.current         = habits         }, [habits])
  useEffect(() => { appointmentsRef.current   = appointments   }, [appointments])
  useEffect(() => { xpDataRef.current         = xpData         }, [xpData])
  useEffect(() => {
    workoutDataRef.current = { sessions: workoutSessions, streak: workoutStreak, prs: workoutPRs }
  }, [workoutSessions, workoutStreak, workoutPRs])
  useEffect(() => { historiesRef.current      = chatHistories  }, [chatHistories])
  useEffect(() => { memoriesRef.current       = characterMemories }, [characterMemories])
  useEffect(() => { charStatsRef.current      = charStats      }, [charStats])
  useEffect(() => { activeCharRef.current     = activeCharacterId }, [activeCharacterId])
  useEffect(() => { isStreamingRef.current    = isStreaming    }, [isStreaming])
  useEffect(() => { isOpenRef.current         = isOpen         }, [isOpen])
  useEffect(() => { preferredModelRef.current = preferredModel }, [preferredModel])

  // ── Load from Supabase on mount ──────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      const [histRes, memRes, prefRes] = await Promise.all([
        supabase.from('ai_chat_history')
          .select('character_id, messages')
          .eq('user_id', user.id),
        supabase.from('ai_character_memory')
          .select('character_id, memory_text, char_stats')
          .eq('user_id', user.id),
        supabase.from('ai_user_preferences')
          .select('last_character, preferred_model')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      // Restore preferences (last character + preferred model)
      if (prefRes.data) {
        if (prefRes.data.last_character && CHARACTERS[prefRes.data.last_character]) {
          setActiveCharacterId(prefRes.data.last_character)
        }
        if (prefRes.data.preferred_model) {
          setPreferredModelState(prefRes.data.preferred_model)
        }
      }

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

        // Restore char_stats per character
        setCharStats(prev => {
          const next = { ...prev }
          for (const row of memRes.data) {
            if (next[row.character_id] !== undefined && row.char_stats) {
              const saved = row.char_stats
              // Merge saved stats on top of defaults (keeps new fields if added later)
              next[row.character_id] = {
                ...next[row.character_id],
                ...saved,
                // Always recompute relationship_mode from saved numeric stats
                relationship_mode: deriveRelationshipMode(saved),
              }
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

  const saveCharStats = useCallback(async (characterId, stats) => {
    await supabase.from('ai_character_memory').upsert(
      { user_id: user.id, character_id: characterId, char_stats: stats, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,character_id' }
    )
  }, [user.id])

  const savePreferences = useCallback(async (updates) => {
    await supabase.from('ai_user_preferences').upsert(
      { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }, [user.id])

  // ── Register navigation + active page ───────────────────────────────────
  const registerNavigate   = useCallback((fn)   => { navigateFnRef.current = fn    }, [])
  const registerActivePage = useCallback((page) => { activePageRef.current = page  }, [])

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

  // ── Update a DACS relationship stat ─────────────────────────────────────
  const updateCharStat = useCallback((statName, delta) => {
    const charId = activeCharRef.current
    setCharStats(prev => {
      const current = prev[charId]
      const newValue = clampStat((current[statName] ?? 0) + delta)
      const updated  = {
        ...current,
        [statName]: newValue,
      }
      updated.relationship_mode = deriveRelationshipMode(updated)
      saveCharStats(charId, updated)
      return { ...prev, [charId]: updated }
    })
  }, [saveCharStats])

  // ── Set mood for the active character ────────────────────────────────────
  const setCharMood = useCallback((mood) => {
    const charId = activeCharRef.current
    setCharStats(prev => {
      const updated = { ...prev[charId], current_mood: mood }
      saveCharStats(charId, updated)
      return { ...prev, [charId]: updated }
    })
  }, [saveCharStats])

  // ── Delete chat history for a character ─────────────────────────────────
  const deleteHistory = useCallback(async (charId) => {
    setChatHistories(prev => ({ ...prev, [charId]: [] }))
    await supabase.from('ai_chat_history')
      .delete()
      .eq('user_id', user.id)
      .eq('character_id', charId)
  }, [user.id])

  // ── Delete memory for a character ────────────────────────────────────────
  const deleteMemory = useCallback(async (charId) => {
    setCharacterMemories(prev => ({ ...prev, [charId]: '' }))
    await supabase.from('ai_character_memory')
      .update({ memory_text: '', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('character_id', charId)
  }, [user.id])

  // ── Switch character ─────────────────────────────────────────────────────
  const switchCharacter = useCallback((charId) => {
    if (CHARACTERS[charId]) {
      setActiveCharacterId(charId)
      savePreferences({ last_character: charId })
    }
  }, [savePreferences])

  // ── Set preferred model ──────────────────────────────────────────────────
  const setPreferredModel = useCallback((model) => {
    setPreferredModelState(model)
    savePreferences({ preferred_model: model })
  }, [savePreferences])

  // ── Toggle chat open / close ─────────────────────────────────────────────
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) setUnreadCount(0)
      return !prev
    })
  }, [])

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
      const currentCharStats = charStatsRef.current[charId]
      const disciplineScore  = computeDisciplineScore(tasksRef.current, habitsRef.current)

      const appState = buildAppState({
        tasks:          tasksRef.current,
        habits:         habitsRef.current,
        appointments:   appointmentsRef.current,
        xpData:         xpDataRef.current,
        activePage:     activePageRef.current,
        workoutData:    workoutDataRef.current,
        charStats:      currentCharStats,
        disciplineScore,
      })
      const memory       = memoriesRef.current[charId] || ''
      const systemPrompt = buildSystemPrompt(character, memory, appState)

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
      for await (const chunk of streamChat(groqMessages, {
        hasImage: !!imageDataUrl,
        model:    preferredModelRef.current,
      })) {
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
        addEmptyWorkout,
        navigate:          navigateFnRef.current,
        remember:          rememberFact,
        updateCharStat,
        setCharMood,
      })

      const finalAiMsg = {
        id:          aiMsgId,
        role:        'assistant',
        content:     cleanText,
        timestamp:   new Date().toISOString(),
        isStreaming: false,
        actions:     actionResults,
      }

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
    rememberFact, updateCharStat, setCharMood, saveHistory,
  ])

  // ── Proactive notification check (every 30 minutes) ──────────────────────
  useEffect(() => {
    const checkProactive = async () => {
      if (isStreamingRef.current) return

      const today       = new Date().toISOString().slice(0, 10)
      const now         = new Date()
      const hour        = now.getHours()
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000

      // Helper: skip IDs we already reminded about recently
      const isRecentlyReminded = (id) => {
        const ts = proactiveRemindedRef.current[id]
        return ts && new Date(ts).getTime() > sixHoursAgo
      }

      const triggers   = []
      const triggeredIds = []

      // Habits not done after 8 PM
      if (hour >= 20) {
        const undone = (habitsRef.current ?? []).filter(
          h => h.frequency === 'daily'
            && !h.completions?.some(c => c.date === today)
            && !isRecentlyReminded(h.id)
        )
        if (undone.length > 0) {
          triggers.push(`Habits not done today: ${undone.map(h => h.name).join(', ')}`)
          undone.forEach(h => triggeredIds.push(h.id))
        }
      }

      // Overdue tasks (only ones not recently reminded)
      const overdue = (tasksRef.current ?? []).filter(
        t => !t.completed && t.dueDate && t.dueDate < today && !isRecentlyReminded(t.id)
      )
      if (overdue.length > 0) {
        triggers.push(`Overdue tasks: ${overdue.map(t => t.title).join(', ')}`)
        overdue.forEach(t => triggeredIds.push(t.id))
      }

      // Appointments in next 90 minutes
      const nowMs   = now.getTime()
      const in90Min = nowMs + 90 * 60 * 1000
      const soon    = (appointmentsRef.current ?? []).filter(a => {
        if (a.date !== today || !a.time) return false
        const [h, m] = a.time.split(':').map(Number)
        const apptMs = new Date(today + 'T00:00:00').setHours(h, m, 0, 0)
        return apptMs > nowMs && apptMs <= in90Min && !isRecentlyReminded(a.id)
      })
      if (soon.length > 0) {
        triggers.push(`Appointment soon: ${soon.map(a => `${a.title} at ${a.time}`).join(', ')}`)
        soon.forEach(a => triggeredIds.push(a.id))
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
        ], { model: preferredModelRef.current })) {
          content += chunk
        }

        if (!content.trim()) return

        // Record reminded IDs to prevent spam
        const now_iso = new Date().toISOString()
        triggeredIds.forEach(id => {
          proactiveRemindedRef.current[id] = now_iso
        })

        const proactiveMsg = {
          id:          `msg_${Date.now()}_proactive`,
          role:        'assistant',
          content:     content.trim(),
          timestamp:   now_iso,
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
  }, [saveHistory])

  // ── Context value ────────────────────────────────────────────────────────
  return (
    <AIContext.Provider value={{
      characters:        CHARACTERS,
      characterList:     CHARACTER_LIST,
      activeCharacterId,
      activeCharacter:   CHARACTERS[activeCharacterId],
      chatHistories,
      currentHistory:    chatHistories[activeCharacterId] ?? [],
      characterMemories,
      charStats,
      activeCharStats:   charStats[activeCharacterId],
      preferredModel,
      isOpen,
      isStreaming,
      unreadCount,
      sendMessage,
      switchCharacter,
      toggleChat,
      registerNavigate,
      registerActivePage,
      setPreferredModel,
      updateCharStat,
      setCharMood,
      deleteHistory,
      deleteMemory,
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
