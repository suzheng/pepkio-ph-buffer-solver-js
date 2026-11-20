// SPDX-License-Identifier: MIT

export const TOOL_ID = "ph-buffer-solver";
export const DEFAULT_API_BASE_URL = "https://tools.pepkio.com";

export function resolveBaseUrl(override?: string): string {
  if (override) {
    return override.replace(/\/$/, "");
  }
  const env = process.env.PEPKIO_API_BASE_URL;
  if (env) {
    return env.replace(/\/$/, "");
  }
  return DEFAULT_API_BASE_URL;
}

export function isLocalUrl(baseUrl: string): boolean {
  return (
    baseUrl.includes("localtest.me") ||
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1")
  );
}

export function resolveApiKey(baseUrl: string, override?: string): string | undefined {
  if (override !== undefined) {
    return override || undefined;
  }
  if (isLocalUrl(baseUrl)) {
    return process.env.LOCAL_PEPKIO_API_KEY ?? process.env.PEPKIO_API_KEY;
  }
  return process.env.PEPKIO_API_KEY;
}

export function apiPath(baseUrl: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}/api/tools/v1${normalized}`;
}
