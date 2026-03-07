
-- Track racecard downloads to prevent double-charges
CREATE TABLE public.racecard_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  racecard_id UUID NOT NULL REFERENCES public.racecards(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, racecard_id)
);

ALTER TABLE public.racecard_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own downloads"
  ON public.racecard_downloads FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Service role can insert downloads"
  ON public.racecard_downloads FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));
