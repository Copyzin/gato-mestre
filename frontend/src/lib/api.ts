import type { Banner, Sport, TipWithMatch } from "@shared/index";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  baseUrl: API_URL,
  getSports: () => getJson<Sport[]>("/sports"),
  getTodayTips: () => getJson<TipWithMatch[]>("/tips/today"),
  getResults: () => getJson<TipWithMatch[]>("/tips/results"),
  getBanners: () => getJson<Banner[]>("/banners"),
};
