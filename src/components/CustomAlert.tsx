import { FontAwesome6 } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { ThemedText } from "./ui";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  onClose?: () => void;
  icon?: keyof typeof FontAwesome6.glyphMap;
  iconColor?: string;
}

export function CustomAlert({
  visible,
  title,
  message,
  buttons = [{ text: "OK" }],
  onClose,
  icon,
  iconColor,
}: CustomAlertProps) {
  const { theme } = useTheme();

  // Ensure default button style has filled background
  const resolvedButtons: AlertButton[] = buttons.map((b) => ({
    style: b.style ?? "default",
    ...b,
  }));

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, { backgroundColor: theme.colors.card }]}>
          {icon && (
            <View style={[
              styles.iconContainer,
              iconColor === "#10D99D" && { backgroundColor: "rgba(16, 217, 157, 0.12)" },
              iconColor === "#FF8585" && { backgroundColor: "rgba(255, 133, 133, 0.12)" },
              iconColor === "#2874A6" && { backgroundColor: "rgba(40, 116, 166, 0.12)" },
            ]}>
              <FontAwesome6 
                name={icon} 
                size={36} 
                color={iconColor || theme.colors.accent} 
              />
            </View>
          )}
          
          {title && (
            <ThemedText variant="subheading" weight="700" style={styles.title}>
              {title}
            </ThemedText>
          )}
          
          {message && (
            <ThemedText color="secondary" style={styles.message}>
              {message}
            </ThemedText>
          )}
          
          <View style={styles.buttonContainer}>
            {resolvedButtons.map((button, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.button,
                  button.style === "cancel" && { backgroundColor: theme.colors.cardMuted },
                  button.style === "destructive" && { backgroundColor: "#FF3B30" },
                  button.style === "default" && { backgroundColor: theme.colors.accent },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => handleButtonPress(button)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { fontFamily: theme.typography.fontFamily },
                    button.style === "cancel" && { color: theme.colors.textPrimary },
                    (button.style === "destructive" || button.style === "default") && { color: "white" },
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertContainer: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 217, 157, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: 10,
    fontSize: 20,
  },
  message: {
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
    fontSize: 15,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});