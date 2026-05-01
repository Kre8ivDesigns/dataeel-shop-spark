-- FAQ-style cache for identical assistant questions (SHA-256 of normalized text).
-- Populated by racing-assistant after a successful LLM reply; read before calling the model.
-- No RLS policies: anon/authenticated clients cannot access; service_role (Edge Functions) bypasses RLS.

CREATE TABLE IF NOT EXISTS public.ai_chat_answer_cache (
  question_hash text PRIMARY KEY,
  answer_text text NOT NULL,
  hit_count bigint NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_chat_answer_cache IS
  'Global deduplicated answers for DATAEEL AI assistant; keyed by SHA-256 of normalized user question.';

ALTER TABLE public.ai_chat_answer_cache ENABLE ROW LEVEL SECURITY;
