import { supabase } from "./supabase";

type AuthMode = "required" | "optional" | "none";

type ApiFetchOptions = RequestInit & {
  auth?: AuthMode;
};

const LOCAL_API_HOSTS = new Set(["127.0.0.1", "localhost", "10.0.2.2"]);

export const getApiBase = () => {
  const base = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (!base) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE.");
  }

  const parsed = new URL(base);
  const isLocalHttp = parsed.protocol === "http:" && LOCAL_API_HOSTS.has(parsed.hostname);

  if (parsed.protocol !== "https:" && !isLocalHttp) {
    throw new Error("EXPO_PUBLIC_API_BASE must use HTTPS outside local development.");
  }

  return base.replace(/\/+$/, "");
};

const getAccessToken = async (auth: AuthMode) => {
  if (auth === "none") return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const accessToken = data.session?.access_token ?? null;
  if (auth === "required" && !accessToken) {
    throw new Error("You must be signed in to continue.");
  }

  return accessToken;
};

export const apiFetch = async (path: string, options: ApiFetchOptions = {}) => {
  const { auth = "required", headers, ...rest } = options;
  const token = await getAccessToken(auth);
  const mergedHeaders = new Headers(headers ?? {});

  if (token) {
    mergedHeaders.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${getApiBase()}${path}`, {
    ...rest,
    headers: mergedHeaders,
  });
};

export const apiJsonHeaders = (headers?: HeadersInit) => {
  const mergedHeaders = new Headers(headers ?? {});
  mergedHeaders.set("Content-Type", "application/json");
  return mergedHeaders;
};
