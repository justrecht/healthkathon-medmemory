import { FontAwesome6 } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../theme";
import { ThemedText } from "./ui";

interface AddMedicationModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (medication: { title: string; dosage: string; time: string; notes: string; interval?: string }) => void;
  medication: { title: string; dosage: string; time: string; notes: string; interval?: string };
  onMedicationChange: (medication: { title: string; dosage: string; time: string; notes: string; interval?: string }) => void;
  mode?: "add" | "edit";
  onDelete?: () => void;
}

export function AddMedicationModal({
  visible,
  onClose,
  onAdd,
  medication,
  onMedicationChange,
  mode = "add",
  onDelete,
}: AddMedicationModalProps) {
  const { theme } = useTheme();

  const handleInputChange = (field: keyof typeof medication, value: string) => {
    onMedicationChange({ ...medication, [field]: value });
  };

  const dosageOptions = Array.from({ length: 10 }, (_, i) => (i + 1) * 100); // 100..1000
  const intervalOptions = Array.from({ length: 24 }, (_, i) => (i + 1) * 30); // 30..720 minutes (30min steps up to 12h)

  const formatIntervalLabel = (mins: number) => {
    if (mins % 60 === 0) return `${mins / 60} jam`;
    return `${mins} menit`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <ThemedText variant="heading" weight="700">
              {mode === "edit" ? "Ubah Pengingat Obat" : "Tambah Pengingat Obat"}
            </ThemedText>
            <Pressable onPress={onClose}>
              <FontAwesome6 name="xmark" color={theme.colors.textSecondary} size={24} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText variant="caption" color="secondary" style={styles.label}>
                Nama Obat *
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.cardMuted,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Contoh: Metformin"
                placeholderTextColor={theme.colors.muted}
                value={medication.title}
                onChangeText={(text) => handleInputChange("title", text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="caption" color="secondary" style={styles.label}>
                Dosis *
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 6 }}>
                {dosageOptions.map((d) => {
                  const selected = String(d) === String(medication.dosage).replace(/\s*mg/i, "");
                  return (
                    <Pressable
                      key={d}
                      onPress={() => handleInputChange("dosage", `${d}`)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        marginRight: 8,
                        backgroundColor: selected ? theme.colors.accent : theme.colors.cardMuted,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.accent : theme.colors.border,
                      }}
                    >
                      <ThemedText style={{ color: selected ? "white" : theme.colors.textPrimary }}>{`${d} mg`}</ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="caption" color="secondary" style={styles.label}>
                Alarm Interval (kelipatan 30 menit)
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 6 }}>
                {intervalOptions.map((mins) => {
                  const selected = String(mins) === String(medication.interval || "");
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => handleInputChange("interval", String(mins))}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        marginRight: 8,
                        backgroundColor: selected ? theme.colors.accent : theme.colors.cardMuted,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.accent : theme.colors.border,
                      }}
                    >
                      <ThemedText style={{ color: selected ? "white" : theme.colors.textPrimary }}>{formatIntervalLabel(mins)}</ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="caption" color="secondary" style={styles.label}>
                Waktu *
              </ThemedText>
              
              {/* Hour Selector */}
              <View style={{ marginBottom: 12 }}>
                <ThemedText variant="caption" color="secondary" style={{ marginBottom: 8 }}>
                  Jam
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 6 }}>
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((hour) => {
                    const currentHour = medication.time.split(":")[0] || "00";
                    const selected = hour === currentHour;
                    return (
                      <Pressable
                        key={hour}
                        onPress={() => {
                          const minute = medication.time.split(":")[1] || "00";
                          handleInputChange("time", `${hour}:${minute}`);
                        }}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          marginRight: 8,
                          backgroundColor: selected ? theme.colors.accent : theme.colors.cardMuted,
                          borderWidth: 1,
                          borderColor: selected ? theme.colors.accent : theme.colors.border,
                        }}
                      >
                        <ThemedText style={{ color: selected ? "white" : theme.colors.textPrimary }}>
                          {hour}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Minute Selector */}
              <View>
                <ThemedText variant="caption" color="secondary" style={{ marginBottom: 8 }}>
                  Menit
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 6 }}>
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((minute) => {
                    const currentMinute = medication.time.split(":")[1] || "00";
                    const selected = minute === currentMinute;
                    return (
                      <Pressable
                        key={minute}
                        onPress={() => {
                          const hour = medication.time.split(":")[0] || "00";
                          handleInputChange("time", `${hour}:${minute}`);
                        }}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 12,
                          marginRight: 8,
                          backgroundColor: selected ? theme.colors.accent : theme.colors.cardMuted,
                          borderWidth: 1,
                          borderColor: selected ? theme.colors.accent : theme.colors.border,
                        }}
                      >
                        <ThemedText style={{ color: selected ? "white" : theme.colors.textPrimary }}>
                          {minute}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="caption" color="secondary" style={styles.label}>
                Catatan (Opsional)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.cardMuted,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Catatan tambahan..."
                placeholderTextColor={theme.colors.muted}
                value={medication.notes}
                onChangeText={(text) => handleInputChange("notes", text)}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              {mode === "edit" && (
                <Pressable
                  style={[styles.submitButton, { backgroundColor: theme.colors.cardMuted, flex: 1 }]}
                  onPress={onDelete}
                >
                  <Text style={[styles.submitButtonText, { color: theme.colors.textPrimary }]}>Hapus</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.submitButton, { backgroundColor: theme.colors.accent, flex: 2, opacity: (!medication.title || !medication.dosage || !medication.time) ? 0.6 : 1 }]}
                disabled={!medication.title || !medication.dosage || !medication.time}
                onPress={() => onAdd(medication)}
              >
                <Text style={styles.submitButtonText}>{mode === "edit" ? "Simpan Perubahan" : "Simpan Pengingat"}</Text>
              </Pressable>
            </View>
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
    padding: 24,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Geist",
    borderWidth: 1,
  },
  textArea: {
    height: 80,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "Geist",
  },
});