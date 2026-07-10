// ---- Base shapes ----
export interface SummaryMetrics {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface DailyMetrics extends SummaryMetrics {
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface FacebookDailyMetrics extends DailyMetrics {
  reach: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface InstagramDailyMetrics extends DailyMetrics {
  reach: number;
  likes: number;
  comments: number;
  saves: number;
}

export interface GoogleDailyMetrics extends DailyMetrics {
  costPerConversion: number;
}

export interface LinkedInDailyMetrics extends DailyMetrics {
  likes: number;
  comments: number;
  shares: number;
  follows: number;
}

// ---- /v1/metrics-summary ----
export interface PeriodTotals {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface PlatformSummary {
  totals: PeriodTotals;
  previousTotals: PeriodTotals;
  dailyData: SummaryMetrics[];
}

export interface MetricsSummaryResponse {
  period: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
  meta: {
    facebook: PlatformSummary;
    instagram: PlatformSummary;
  };
  google: PlatformSummary;
  linkedin: PlatformSummary;
}

// ---- /v1/metrics-insights ----
export type NetworkParam = "meta" | "google" | "linkedin";

export interface InsightsTotals {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  costPerConversion?: number;
}

export interface InsightsResponse<T extends DailyMetrics = DailyMetrics> {
  network: NetworkParam;
  period: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
  totals: InsightsTotals;
  previousTotals: InsightsTotals;
  dailyData: T[];
}

// Confirmed via live check: network=meta splits facebook/instagram at every level
export interface MetaInsightsResponse {
  network: "meta";
  period: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
  totals: {
    facebook: Omit<FacebookDailyMetrics, "date">;
    instagram: Omit<InstagramDailyMetrics, "date">;
  };
  previousTotals: {
    facebook: Omit<FacebookDailyMetrics, "date">;
    instagram: Omit<InstagramDailyMetrics, "date">;
  };
  dailyData: {
    facebook: FacebookDailyMetrics[];
    instagram: InstagramDailyMetrics[];
  };
}

export type GoogleInsightsResponse = InsightsResponse<GoogleDailyMetrics>;
export type LinkedInInsightsResponse = InsightsResponse<LinkedInDailyMetrics>;

export interface ApiError {
  error: string;
  message: string;
}
