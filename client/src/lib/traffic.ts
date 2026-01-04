import { apiRequest } from "@/lib/queryClient";

let tracked = false;

export async function trackTrafficOnce(pathname: string) {
  if (tracked) return;
  tracked = true;

  try {
    await apiRequest("POST", "/api/metrics/traffic", {
      pathname,
    });
  } catch {
    // Best-effort only.
  }
}
