import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { setJwt, clearJwt, signInMobile } from "./api";

export async function signInWithApple(): Promise<boolean> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) return false;
    const token = await signInMobile("apple", credential.identityToken);
    if (!token) return false;
    await setJwt(token);
    return true;
  } catch (e: any) {
    if (e.code === "ERR_CANCELED") return false;
    console.error("Apple sign-in error:", e);
    return false;
  }
}

export async function signInWithGoogle(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices();
    }
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;
    if (!idToken) {
      console.error("Google sign-in: no idToken returned");
      return false;
    }
    const token = await signInMobile("google", idToken);
    if (!token) {
      console.error("Google sign-in: mobile token exchange failed");
      return false;
    }
    await setJwt(token);
    return true;
  } catch (e: any) {
    if (e.code === "SIGN_IN_CANCELLED") return false;
    console.error("Google sign-in error:", e?.code, e?.message);
    throw e;
  }
}

export async function signOut(): Promise<void> {
  await clearJwt();
  try {
    await GoogleSignin.signOut();
  } catch {}
}
