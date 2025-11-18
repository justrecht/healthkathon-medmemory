import { FontAwesome6 } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type MedicationRecord } from "../services/storage";
import { useTheme } from "../theme";
import { ThemedText } from "./ui";

interface MedicationHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  medicationHistory: MedicationRecord[];
}

export function MedicationHistoryModal({
  visible,
  onClose,
  medicationHistory,
}: MedicationHistoryModalProps) {
  const { theme } = useTheme();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "taken":
        return "#10D99D";
      case "missed":
        return "#FF8585";
      case "late":
        return "#F59E0B";
      default:
        return theme.colors.accent;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "taken":
        return "Diminum";
      case "missed":
        return "Terlewat";
      case "late":
        return "Terlambat";
      default:
        return status;
    }
  };

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
              Riwayat Konsumsi
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              {medicationHistory.length} catatan
            </ThemedText>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <FontAwesome6 name="xmark" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {medicationHistory.length > 0 ? (
            <View style={styles.historyList}>
              {medicationHistory
                .filter(record => record.takenAt)
                .sort((a, b) => new Date(b.takenAt!).getTime() - new Date(a.takenAt!).getTime())
                .map((record) => (
                  <View
                    key={record.id}
                    style={[
                      styles.historyItem,
                      { 
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.historyHeader}>
                      <View style={styles.medicationInfo}>
                        <ThemedText variant="subheading" weight="600">
                          {record.medicationName}
                        </ThemedText>
                        <ThemedText variant="caption" color="secondary">
                          {record.dosage}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${getStatusColor(record.status)}15` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { 
                              color: getStatusColor(record.status),
                              fontFamily: theme.typography.fontFamily,
                            },
                          ]}
                        >
                          {getStatusText(record.status)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.timeInfo}>
                      <View style={styles.timeItem}>
                        <FontAwesome6 name="calendar" size={14} color={theme.colors.muted} />
                        <ThemedText variant="caption" color="muted">
                          {record.takenAt ? formatDate(record.takenAt) : 'N/A'}
                        </ThemedText>
                      </View>
                      <View style={styles.timeItem}>
                        <FontAwesome6 name="clock" size={14} color={theme.colors.muted} />
                        <ThemedText variant="caption" color="muted">
                          Dijadwalkan: {record.scheduledTime}
                        </ThemedText>
                      </View>
                      <View style={styles.timeItem}>
                        <FontAwesome6 name="check-circle" size={14} color={theme.colors.muted} />
                        <ThemedText variant="caption" color="muted">
                          Diminum: {record.takenAt ? formatTime(record.takenAt) : 'N/A'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome6 name="hourglass" color={theme.colors.muted} size={64} />
              <ThemedText color="muted" style={styles.emptyStateTitle}>
                Belum ada riwayat
              </ThemedText>
              <ThemedText variant="caption" color="muted" style={styles.emptyStateSubtitle}>
                Riwayat konsumsi obat akan muncul di sini setelah Anda mulai mengonfirmasi minum obat
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  historyList: {
    gap: 16,
  },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timeInfo: {
    gap: 8,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "600",
  },
  emptyStateSubtitle: {
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});