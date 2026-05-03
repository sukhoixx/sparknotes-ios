import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { signInWithApple, signInWithGoogle } from "../auth";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}

export function SignInSheet({ visible, onClose, onSignedIn }: Props) {
  async function handleApple() {
    try {
      const ok = await signInWithApple();
      if (ok) {
        onSignedIn();
        onClose();
      }
    } catch {
      Alert.alert("Sign in failed", "Could not sign in with Apple. Please try again.");
    }
  }

  async function handleGoogle() {
    try {
      const ok = await signInWithGoogle();
      if (ok) {
        onSignedIn();
        onClose();
      } else {
        Alert.alert("Sign in failed", "Could not sign in with Google. Make sure EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set and the app was rebuilt.");
      }
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message ?? "Could not sign in with Google. Please try again.");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Sign in to SparkNotes</Text>
        <Text style={styles.subtitle}>
          Save your likes, comments, and preferences across devices
        </Text>

        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={styles.appleBtn}
            onPress={handleApple}
          />
        )}

        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleLabel}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelLabel}>Not now</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  appleBtn: {
    width: "100%",
    height: 50,
    marginBottom: 12,
  },
  googleBtn: {
    width: "100%",
    height: 50,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  googleG: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4285f4",
  },
  googleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelLabel: {
    fontSize: 15,
    color: "#9ca3af",
  },
});
