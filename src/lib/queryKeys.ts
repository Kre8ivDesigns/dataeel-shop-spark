/** Centralized TanStack Query keys for invalidation and deduplication. */

export const racecardPublicKeys = {
  all: ["racecards-public"] as const,
  byDate: (raceDate: string) => [...racecardPublicKeys.all, raceDate] as const,
};

export const racecardDownloadKeys = {
  byUser: (userId: string) => ["racecard-downloads", userId] as const,
};

export const userDashboardKeys = {
  all: ["user-dashboard"] as const,
  detail: (userId: string) => [...userDashboardKeys.all, userId] as const,
};
