import { FontAwesome6 } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../theme";
import { ThemedText } from "./ui";

interface AddMedicationModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (medication: { title: string; dosage: string; time: string; notes: string; interval?: string; repeatDays?: number[] }) => void;
  medication: { title: string; dosage: string; time: string; notes: string; interval?: string; repeatDays?: number[] };
  onMedicationChange: (medication: { title: string; dosage: string; time: string; notes: string; interval?: string; repeatDays?: number[] }) => void;
  mode?: "add" | "edit";
}

export function AddMedicationModal({
  visible,
  onClose,
  onAdd,
  medication,
  onMedicationChange,
  mode = "add",
}: AddMedicationModalProps) {
  const { theme } = useTheme();

  const handleInputChange = (field: keyof typeof medication, value: string) => {
    onMedicationChange({ ...medication, [field]: value });
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
              <View
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.cardMuted,
                    borderColor: theme.colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
              >
                <TextInput
                  style={{
                    flex: 1,
                    color: theme.colors.textPrimary,
                    fontFamily: "Geist",
                    fontSize: 15,
                    padding: 0,
                  }}
                  placeholder="Contoh: 500"
                  placeholderTextColor={theme.colors.muted}
                  keyboardType="numeric"
                  value={medication.dosage ? String(medication.dosage).replace(/[^0-9]/g, "") : ""}
                  onChangeText={(text) => {
                    const cleanText = text.replace(/[^0-9]/g, "");
                    handleInputChange("dosage", cleanText ? `${cleanText} mg` : "");
                  }}
                />
                <ThemedText color="muted">mg</ThemedText>
              </View>
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
                Ulangi Hari
              </ThemedText>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day, index) => {
                  const isSelected = medication.repeatDays?.includes(index) ?? true;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => {
                        const currentDays = medication.repeatDays ?? [0, 1, 2, 3, 4, 5, 6];
                        let newDays;
                        if (currentDays.includes(index)) {
                          newDays = currentDays.filter((d) => d !== index);
                        } else {
                          newDays = [...currentDays, index].sort();
                        }
                        handleInputChange("repeatDays" as any, newDays as any);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.cardMuted,
                        borderWidth: 1,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      }}
                    >
                      <ThemedText
                        style={{
                          color: isSelected ? "white" : theme.colors.textPrimary,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {day}
                      </ThemedText>
                    </Pressable>
                  );
                })}
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