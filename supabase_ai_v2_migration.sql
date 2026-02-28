-- ============================================================
-- Kyverion AI v2 Migration
-- Run this once in your Supabase SQL editor.
-- ============================================================

-- 1. Add character state machine stats to ai_character_memory
--    Stored as JSONB for flexibility (new stats can be added without schema changes)
ALTER TABLE ai_character_memory
  ADD COLUMN IF NOT EXISTS char_stats jsonb DEFAULT '{
    "respect_level": 10,
    "trust_level": 5,
    "attachment_level": 0,
    "attraction_level": 0,
    "current_mood": "neutral",
    "relationship_mode": "neutral"
  }'::jsonb;

-- 2. User-level preferences (last active character, preferred AI model)
CREATE TABLE IF NOT EXISTS ai_user_preferences (
  user_id         uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  last_character  text NOT NULL DEFAULT 'yae_miko',
  preferred_model text NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own prefs" ON ai_user_preferences;
CREATE POLICY "Users manage own prefs" ON ai_user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
