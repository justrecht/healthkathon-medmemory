import { FontAwesome6 } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../theme";
import { ThemedText } from "./ui";

interface AddMedicationModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (medication: { title: string; dosage: string; time: string; notes: string }) => void;
  medication: { title: string; dosage: string; time: string; notes: string };
  onMedicationChange: (medication: { title: string; dosage: string; time: string; notes: string }) => void;
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

  const formatTimeInput = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const normalizeTime = (text: string) => {
    const match = text.match(/^(\d{1,2})(?::?(\d{1,2}))?$/);
    if (!match) return text;
    let h = parseInt(match[1] ?? "0", 10);
    let m = parseInt(match[2] ?? "0", 10);
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const isValidTime = (text: string) => {
    return /^((0\d|1\d|2[0-3])):([0-5]\d)$/.test(text);
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
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.cardMuted,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Contoh: 500 mg"
                placeholderTextColor={theme.colors.muted}
                value={medication.dosage}
                onChangeText={(text) => handleInputChange("dosage", text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="caption" color="secondary" style={styles.label}>
                Waktu (HH:MM) *
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
                placeholder="Contoh: 07:00"
                placeholderTextColor={theme.colors.muted}
                value={medication.time}
                onChangeText={(text) => handleInputChange("time", formatTimeInput(text))}
                onBlur={() => handleInputChange("time", normalizeTime(medication.time))}
                keyboardType="number-pad"
              />
              {!!medication.time && !isValidTime(medication.time) && (
                <ThemedText variant="caption" color="muted">Format waktu harus HH:MM (00-23:00-59)</ThemedText>
              )}
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
                style={[styles.submitButton, { backgroundColor: theme.colors.accent, flex: 2, opacity: (!medication.title || !medication.dosage || !isValidTime(medication.time)) ? 0.6 : 1 }]}
                disabled={!medication.title || !medication.dosage || !isValidTime(medication.time)}
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