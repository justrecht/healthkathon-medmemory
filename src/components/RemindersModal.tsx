import { FontAwesome6 } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { ThemedText } from "./ui";

type ReminderItem = {
  id: string;
  title: string;
  dosage: string;
  time: string;
  notes?: string;
  status: "scheduled" | "taken" | "missed";
};

interface RemindersModalProps {
  visible: boolean;
  onClose: () => void;
  reminders: ReminderItem[];
  onSelect?: (reminder: ReminderItem) => void;
}

export function RemindersModal({ visible, onClose, reminders, onSelect }: RemindersModalProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerContent}>
            <ThemedText variant="title" weight="700">
              Semua Pengingat
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              {reminders.length} pengingat
            </ThemedText>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <FontAwesome6 name="xmark" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 14 }}>
            {reminders.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.row, { borderBottomColor: theme.colors.border }]}
                onPress={() => onSelect?.(item)}
              >
                <View style={[styles.icon, { backgroundColor: theme.colors.cardMuted }]}>
                  <FontAwesome6 name="clock" color={theme.colors.accent} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText weight="600">{item.title}</ThemedText>
                  {!!item.notes && <ThemedText variant="caption" color="muted">{item.notes}</ThemedText>}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <ThemedText>{item.time}</ThemedText>
                  <Text style={[styles.statusChip, styles[item.status as keyof typeof styles]]}>{item.status}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: { flex: 1 },
  closeButton: { padding: 8 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statusChip: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    textTransform: "capitalize",
    fontWeight: "500",
    fontSize: 11,
    fontFamily: "Geist",
  },
  scheduled: { backgroundColor: "rgba(30,143,225,0.15)", color: "#3DA5F5" },
  taken: { backgroundColor: "rgba(12,186,135,0.15)", color: "#10D99D" },
  missed: { backgroundColor: "rgba(255,107,107,0.15)", color: "#FF8585" },
});

export default RemindersModal;
