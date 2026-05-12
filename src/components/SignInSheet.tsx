import React, { useMemo } from "react";
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
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { t } from "../i18n";
import type { Colors } from "../theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}

export function SignInSheet({ visible, onClose, onSignedIn }: Props) {
  const { colors } = useTheme();
  const { lang } = useLang();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  async function handleApple() {
    try {
      const ok = await signInWithApple();
      if (ok) {
        onSignedIn();
        onClose();
      }
    } catch {
      Alert.alert(t("signInFailed", lang), t("signInFailedApple", lang));
    }
  }

  async function handleGoogle() {
    try {
      const ok = await signInWithGoogle();
      if (ok) {
        onSignedIn();
        onClose();
      } else {
        Alert.alert(t("signInFailed", lang), t("signInFailedGoogle", lang));
      }
    } catch (e: any) {
      Alert.alert(t("signInFailed", lang), e?.message ?? t("signInFailedGoogle", lang));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t("signInTitle", lang)}</Text>
        <Text style={styles.subtitle}>{t("signInSubtitle", lang)}</Text>

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
          <Text style={styles.googleLabel}>{t("continueWithGoogle", lang)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelLabel}>{t("notNow", lang)}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.backdrop,
    },
    sheet: {
      backgroundColor: c.surface,
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
      backgroundColor: c.border,
      borderRadius: 2,
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: c.text,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: c.textTertiary,
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
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
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
      color: c.textSub,
    },
    cancelBtn: {
      paddingVertical: 12,
    },
    cancelLabel: {
      fontSize: 15,
      color: c.textMuted,
    },
  });
}
