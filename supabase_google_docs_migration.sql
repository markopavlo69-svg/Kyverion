-- Add Google Docs URL column to learning_areas
-- Run this in the Supabase SQL Editor

alter table learning_areas
  add column if not exists doc_url text;
