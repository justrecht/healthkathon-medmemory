import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useLanguage } from "../i18n";
import { useTheme } from "../theme";
import { ThemedText } from "./ui";

interface ConnectPatientModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (email: string) => void;
  loading?: boolean;
}

export function ConnectPatientModal({
  visible,
  onClose,
  onConnect,
  loading = false,
}: ConnectPatientModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    if (email.trim()) {
      onConnect(email.trim());
      setEmail("");
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.modalView,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: "rgba(30,143,225,0.1)" },
              ]}
            >
              <FontAwesome6 name="user-plus" size={20} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="subheading" weight="600">
                {t("connectPatient")}
              </ThemedText>
              <ThemedText variant="caption" color="muted">
                {t("enterPatientEmail")}
              </ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <FontAwesome6 name="xmark" size={20} color={theme.colors.muted} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.inputGroup}>
              <ThemedText variant="caption" style={{ marginBottom: 8 }}>
                {t("patientEmail")}
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <FontAwesome6
                  name="envelope"
                  size={16}
                  color={theme.colors.muted}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.fontFamily,
                    },
                  ]}
                  placeholder={t("emailPlaceholder")}
                  placeholderTextColor={theme.colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.button, { backgroundColor: theme.colors.cardMuted }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily },
                ]}
              >
                {t("cancel")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.button, { flex: 1 }]}
              onPress={handleSubmit}
              disabled={loading || !email}
            >
              <LinearGradient
                colors={theme.colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text
                style={[
                  styles.buttonText,
                  { color: "white", fontFamily: theme.typography.fontFamily },
                ]}
              >
                {loading ? t("sending") : t("sendRequest")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    gap: 16,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
