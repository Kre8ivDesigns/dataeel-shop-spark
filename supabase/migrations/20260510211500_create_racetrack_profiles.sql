CREATE TABLE IF NOT EXISTS public.racetrack_profiles (
  track_code text PRIMARY KEY,
  display_name text NOT NULL,
  official_url text,
  latitude numeric,
  longitude numeric,
  timezone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_racetrack_profiles_updated_at ON public.racetrack_profiles;
CREATE TRIGGER update_racetrack_profiles_updated_at
BEFORE UPDATE ON public.racetrack_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.racetrack_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read racetrack profiles" ON public.racetrack_profiles;
CREATE POLICY "Public can read racetrack profiles"
ON public.racetrack_profiles
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert racetrack profiles" ON public.racetrack_profiles;
CREATE POLICY "Admins can insert racetrack profiles"
ON public.racetrack_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update racetrack profiles" ON public.racetrack_profiles;
CREATE POLICY "Admins can update racetrack profiles"
ON public.racetrack_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete racetrack profiles" ON public.racetrack_profiles;
CREATE POLICY "Admins can delete racetrack profiles"
ON public.racetrack_profiles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

INSERT INTO public.racetrack_profiles (track_code, display_name, official_url, latitude, longitude, timezone)
VALUES
  ('AQU', 'Aqueduct', 'https://www.nyra.com/aqueduct/', 40.6728, -73.8272, 'America/New_York'),
  ('ASD', 'Assiniboia Downs', 'https://www.asdowns.com/', 49.8844, -97.3294, 'America/Winnipeg'),
  ('BAQ', 'Belmont at the Big A', 'https://www.nyra.com/belmont-at-the-big-a/', 40.6728, -73.8272, 'America/New_York'),
  ('BEL', 'Belmont Park', 'https://www.nyra.com/belmont/', 40.7147, -73.7225, 'America/New_York'),
  ('BTP', 'Belterra Park', 'https://www.belterrapark.com/racing', 39.1006, -84.6114, 'America/New_York'),
  ('CD', 'Churchill Downs', 'https://www.churchilldowns.com/', 38.2029, -85.7714, 'America/Kentucky/Louisville'),
  ('CMR', 'Camarero Race Track', 'https://www.hipodromo-camarero.com', 18.3894, -65.8761, 'America/Puerto_Rico'),
  ('CT', 'Charles Town', 'https://www.hollywoodcasinocharlestown.com/racing', 39.2967, -77.8606, 'America/New_York'),
  ('DED', 'Delta Downs', 'https://www.deltadownsracing.com/', 30.1956, -93.5813, 'America/Chicago'),
  ('DMR', 'Del Mar', 'https://www.dmtc.com/', 32.9753, -117.2606, 'America/Los_Angeles'),
  ('ELP', 'Ellis Park', 'https://ellisparkracing.com/', 37.8872, -87.5714, 'America/Chicago'),
  ('FE', 'Fort Erie', 'https://www.forterieracing.com/', 42.9078, -78.9328, 'America/Toronto'),
  ('FG', 'Fair Grounds', 'https://www.fairgroundsracecourse.com/', 29.9858, -90.0775, 'America/Chicago'),
  ('FL', 'Finger Lakes', 'https://www.fingerlakesgaming.com/racing', 42.9622, -77.3503, 'America/New_York'),
  ('GP', 'Gulfstream Park', 'https://www.gulfstreampark.com/', 25.9786, -80.1394, 'America/New_York'),
  ('HAW', 'Hawthorne', 'https://www.hawthorneracecourse.com/', 41.8294, -87.7447, 'America/Chicago'),
  ('HOU', 'Sam Houston Race Park', 'https://www.shrp.com/', 29.9308, -95.5253, 'America/Chicago'),
  ('KD', 'Kentucky Downs', 'https://www.kentuckydowns.com/', 36.6544, -86.5636, 'America/Chicago'),
  ('KEE', 'Keeneland', 'https://www.keeneland.com/', 38.0469, -84.6086, 'America/New_York'),
  ('LA', 'Los Alamitos', 'https://www.losalamitos.com/', 33.8031, -118.0436, 'America/Los_Angeles'),
  ('LAD', 'Louisiana Downs', 'https://www.ladowns.com/', 32.5492, -93.6344, 'America/Chicago'),
  ('LRL', 'Laurel Park', 'https://www.laurelpark.com/', 39.1047, -76.8311, 'America/New_York'),
  ('MED', 'Meadow Lands', 'https://playmeadowlands.com/', 40.8136, -74.0744, 'America/New_York'),
  ('MNR', 'Mountaineer Park', 'https://www.cnty.com/mountaineer/racing/', 40.5586, -80.6403, 'America/New_York'),
  ('MTH', 'Monmouth Park', 'https://www.monmouthpark.com/', 40.3075, -74.0167, 'America/New_York'),
  ('MVR', 'Mahoning Valley', 'https://www.hollywoodmahoningvalley.com/racing', 41.1225, -80.7703, 'America/New_York'),
  ('OP', 'Oaklawn Park', 'https://www.oaklawn.com/racing/', 34.485, -93.0594, 'America/Chicago'),
  ('PEN', 'Penn National', 'https://www.hollywoodpnrc.com/racing', 40.3972, -76.6503, 'America/New_York'),
  ('PIM', 'Pimlico', 'https://www.pimlico.com/', 39.3514, -76.675, 'America/New_York'),
  ('PRM', 'Prairie Meadows', 'https://www.prairiemeadows.com/racing', 41.6547, -93.4917, 'America/Chicago'),
  ('PRX', 'Parx Racing', 'https://www.parxracing.com/', 40.1233, -74.9567, 'America/New_York'),
  ('SA', 'Santa Anita Park', 'https://www.santaanita.com/', 34.1392, -118.0444, 'America/Los_Angeles'),
  ('SAR', 'Saratoga', 'https://www.nyra.com/saratoga/', 43.0731, -73.7675, 'America/New_York'),
  ('TAM', 'Tampa Bay Downs', 'https://www.tampabaydowns.com/', 28.0497, -82.6483, 'America/New_York'),
  ('WO', 'Woodbine', 'https://woodbine.com/', 43.7122, -79.6044, 'America/Toronto')
ON CONFLICT (track_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  official_url = COALESCE(public.racetrack_profiles.official_url, EXCLUDED.official_url),
  latitude = COALESCE(public.racetrack_profiles.latitude, EXCLUDED.latitude),
  longitude = COALESCE(public.racetrack_profiles.longitude, EXCLUDED.longitude),
  timezone = COALESCE(public.racetrack_profiles.timezone, EXCLUDED.timezone);

DROP POLICY IF EXISTS "Admins can read racecard predictions" ON public.racecard_predictions;
DROP POLICY IF EXISTS "Admins and purchasers can read racecard predictions" ON public.racecard_predictions;
CREATE POLICY "Admins and purchasers can read racecard predictions"
ON public.racecard_predictions
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.racecard_downloads rd
    WHERE rd.racecard_id = racecard_predictions.racecard_id
      AND rd.user_id = auth.uid()
  )
);
