import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from "react-native";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { t } from "../i18n";

const APP_STORE_URL = "https://apps.apple.com/app/id6766168195";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.newsblock.app";
const STORE_URL = Platform.OS === "android" ? PLAY_STORE_URL : APP_STORE_URL;

interface Props {
  visible: boolean;
}

export function ForceUpgradeModal({ visible }: Props) {
  const { colors } = useTheme();
  const { lang } = useLang();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emoji]}>🚀</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("upgradeTitle", lang)}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {t("upgradeBody", lang)}
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.brand }]}
            onPress={() => Linking.openURL(STORE_URL)}
          >
            <Text style={styles.btnLabel}>{t("upgradeBtn", lang)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  btnLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
