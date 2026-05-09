import * as SecureStore from "expo-secure-store";
import type { Post, UserProfile, Comment, PageData } from "./types";

export const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://sparknotes.up.railway.app"
).replace(/\/$/, "");

const JWT_KEY = "newsblock_jwt";

export async function getJwt(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function setJwt(token: string): Promise<void> {
  return SecureStore.setItemAsync(JWT_KEY, token);
}

export async function clearJwt(): Promise<void> {
  return SecureStore.deleteItemAsync(JWT_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const jwt = await getJwt();
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const auth = await authHeaders();
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
}

export async function fetchPosts(
  category: string,
  cursor: string | null,
  cats?: string,
  q?: string
): Promise<PageData> {
  const params = new URLSearchParams({ category });
  if (cursor) params.set("cursor", cursor);
  if (category === "all" && cats) params.set("cats", cats);
  if (q) params.set("q", q);
  const res = await apiFetch(`/api/posts?${params}`);
  return res.json();
}

export async function fetchMyLikes(): Promise<number[]> {
  try {
    const res = await apiFetch("/api/me/likes");
    if (!res.ok) return [];
    const data = await res.json();
    return data.likedPostIds ?? [];
  } catch {
    return [];
  }
}

export async function toggleLike(postId: number, wasLiked: boolean): Promise<void> {
  await apiFetch(`/api/posts/${postId}/like`, {
    method: wasLiked ? "DELETE" : "POST",
  });
}

export async function fetchComments(postId: number): Promise<Comment[]> {
  try {
    const res = await apiFetch(`/api/posts/${postId}/comments`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.comments ?? [];
  } catch {
    return [];
  }
}

export async function postComment(postId: number, body: string): Promise<Comment | null> {
  const res = await apiFetch(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text: body }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.comment ?? null;
}

export async function fetchProfile(): Promise<UserProfile | null> {
  try {
    const res = await apiFetch("/api/profile");
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile ?? null;
  } catch {
    return null;
  }
}

export async function saveProfile(
  screenName: string,
  categories: string[]
): Promise<UserProfile | null> {
  const res = await apiFetch("/api/profile", {
    method: "POST",
    body: JSON.stringify({ screenName, categories }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.profile ?? null;
}

export async function deleteAccount(): Promise<boolean> {
  try {
    const res = await apiFetch("/api/account", { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPost(id: number): Promise<Post | null> {
  try {
    const res = await apiFetch(`/api/posts/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.post ?? null;
  } catch {
    return null;
  }
}

export async function fetchOgImage(sourceUrl: string): Promise<string | null> {
  try {
    const res = await apiFetch(`/api/og?url=${encodeURIComponent(sourceUrl)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.imageUrl ?? null;
  } catch {
    return null;
  }
}

export async function signInMobile(
  provider: "apple" | "google",
  idToken: string
): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, idToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.token ?? null;
}
