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
            <View style={styles.iconContainer}>
              <FontAwesome6 
                name={icon} 
                size={32} 
                color={iconColor || theme.colors.accent} 
              />
            </View>
          )}
          
          {title && (
            <ThemedText variant="subheading" weight="600" style={styles.title}>
              {title}
            </ThemedText>
          )}
          
          {message && (
            <ThemedText color="secondary" style={styles.message}>
              {message}
            </ThemedText>
          )}
          
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <Pressable
                key={index}
                style={[
                  styles.button,
                  button.style === "cancel" && { backgroundColor: theme.colors.cardMuted },
                  button.style === "destructive" && { backgroundColor: "#FF3B30" },
                  button.style === "default" && { backgroundColor: theme.colors.accent },
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertContainer: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});