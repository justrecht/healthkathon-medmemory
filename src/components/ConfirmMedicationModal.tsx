import { FontAwesome6 } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "../i18n";
import { useTheme } from "../theme";
import { ThemedText } from "./ui";

interface ConfirmMedicationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  medicationName?: string;
  loading?: boolean;
}

export function ConfirmMedicationModal({
  visible,
  onClose,
  onConfirm,
  medicationName,
  loading = false,
}: ConfirmMedicationModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? () => {} : onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={loading ? undefined : onClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconContainer}>
            <FontAwesome6 name="circle-check" color={theme.colors.success} size={64} />
          </View>
          <ThemedText variant="heading" weight="700" style={styles.title}>
            {t("confirmMedication")}
          </ThemedText>
          <ThemedText color="secondary" style={styles.subtitle}>
            {t("haveYouTakenMedicationName", { medicationName: medicationName || "" })}
          </ThemedText>
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, { backgroundColor: theme.colors.cardMuted }]}
              onPress={onClose}
              disabled={loading}
            >
              <ThemedText weight="600" style={{ opacity: loading ? 0.5 : 1 }}>{t("notYet")}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: theme.colors.success }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>{t("already")}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "Geist",
  },
});