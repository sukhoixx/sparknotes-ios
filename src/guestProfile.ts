import AsyncStorage from "@react-native-async-storage/async-storage";

const GUEST_FLAG_KEY = "guestChosen";
const GUEST_PROFILE_KEY = "guestProfile";
const GUEST_ID_KEY = "guest_id";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function ensureGuestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const id = generateUUID();
  await AsyncStorage.setItem(GUEST_ID_KEY, id);
  return id;
}

export async function getGuestId(): Promise<string | null> {
  return AsyncStorage.getItem(GUEST_ID_KEY);
}

export async function getGuestChosen(): Promise<boolean> {
  return (await AsyncStorage.getItem(GUEST_FLAG_KEY)) === "true";
}

export async function setGuestChosen(): Promise<void> {
  await AsyncStorage.setItem(GUEST_FLAG_KEY, "true");
}

export async function getGuestProfile(): Promise<{ screenName: string; categories: string[]; lang: string } | null> {
  const raw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function saveGuestProfile(profile: { screenName: string; categories: string[]; lang: string }): Promise<void> {
  await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
}

export async function clearGuestData(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_FLAG_KEY);
  await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
}
