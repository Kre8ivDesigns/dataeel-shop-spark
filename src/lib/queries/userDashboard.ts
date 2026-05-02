import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { userDashboardKeys } from "@/lib/queryKeys";

export type RecentDownloadRow = {
  id: string;
  created_at: string;
  racecard_id: string;
  racecards: {
    track_name: string;
    race_date: string;
    num_races: number | null;
  } | null;
};

export type UpcomingCard = {
  id: string;
  track_name: string;
  race_date: string;
  num_races: number | null;
};

export type PurchaseRow = {
  id: string;
  created_at: string;
  package_name: string;
  credits: number;
  amount: number;
  status: string;
};

export type UserDashboardData = {
  credits: number;
  downloadsThisMonth: number;
  downloadsLastMonth: number;
  totalDownloads: number;
  tracksScheduledToday: number;
  recentDownloads: RecentDownloadRow[];
  upcomingCards: UpcomingCard[];
  recentPurchases: PurchaseRow[];
};

const STALE_MS = 60_000;
const GC_MS = 15 * 60_000;

export async function fetchUserDashboard(userId: string): Promise<UserDashboardData> {
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const todayStr = format(now, "yyyy-MM-dd");
  const endWindow = format(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3), "yyyy-MM-dd");

  const [
    balRes,
    thisMonthRes,
    lastMonthRes,
    totalRes,
    recentRes,
    upcomingRes,
    purchasesRes,
    tracksTodayRes,
  ] = await Promise.all([
    supabase.from("credit_balances").select("credits").eq("user_id", userId).maybeSingle(),
    supabase
      .from("racecard_downloads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startThisMonth.toISOString()),
    supabase
      .from("racecard_downloads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startLastMonth.toISOString())
      .lt("created_at", startThisMonth.toISOString()),
    supabase
      .from("racecard_downloads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("racecard_downloads")
      .select(
        `
            id,
            created_at,
            racecard_id,
            racecards (
              track_name,
              race_date,
              num_races
            )
          `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("racecards")
      .select("id, track_name, race_date, num_races")
      .gte("race_date", todayStr)
      .lte("race_date", endWindow)
      .order("race_date", { ascending: true })
      .order("track_name", { ascending: true })
      .limit(12),
    supabase
      .from("transactions")
      .select("id, created_at, package_name, credits, amount, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("racecards")
      .select("id", { count: "exact", head: true })
      .eq("race_date", todayStr),
  ]);

  const err =
    balRes.error ??
    thisMonthRes.error ??
    lastMonthRes.error ??
    totalRes.error ??
    recentRes.error ??
    upcomingRes.error ??
    purchasesRes.error ??
    tracksTodayRes.error;
  if (err) throw err;

  return {
    credits: balRes.data?.credits ?? 0,
    downloadsThisMonth: thisMonthRes.count ?? 0,
    downloadsLastMonth: lastMonthRes.count ?? 0,
    totalDownloads: totalRes.count ?? 0,
    tracksScheduledToday: tracksTodayRes.count ?? 0,
    recentDownloads: (recentRes.data ?? []) as RecentDownloadRow[],
    upcomingCards: (upcomingRes.data ?? []) as UpcomingCard[],
    recentPurchases: (purchasesRes.data ?? []) as PurchaseRow[],
  };
}

export function useUserDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? userDashboardKeys.detail(userId) : ["user-dashboard", "signed-out"],
    queryFn: () => fetchUserDashboard(userId!),
    enabled: !!userId,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    // Credits change after Stripe webhook latency; don't let a "fresh" stale window hide updates on tab focus.
    refetchOnWindowFocus: "always",
  });
}
