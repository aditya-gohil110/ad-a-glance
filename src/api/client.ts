import type {
  MetricsSummaryResponse,
  MetaInsightsResponse,
  GoogleInsightsResponse,
  LinkedInInsightsResponse,
  NetworkParam,
  ApiError,
} from "../types";

const BASE_URL = "https://eulerity-hackathon.appspot.com";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body: ApiError = await res.json();
    throw new Error(`${body.error}: ${body.message}`);
  }
  return res.json();
}

export function getSummary(): Promise<MetricsSummaryResponse> {
  return fetch(`${BASE_URL}/v1/metrics-summary`).then((r) => handle(r));
}

export function getInsights(network: "meta", startDate: string, endDate: string): Promise<MetaInsightsResponse>;
export function getInsights(network: "google", startDate: string, endDate: string): Promise<GoogleInsightsResponse>;
export function getInsights(network: "linkedin", startDate: string, endDate: string): Promise<LinkedInInsightsResponse>;
export function getInsights(network: NetworkParam, startDate: string, endDate: string): Promise<any> {
  const params = new URLSearchParams({ network, startDate, endDate });
  return fetch(`${BASE_URL}/v1/metrics-insights?${params}`).then((r) => handle(r));
}
