import { FontAwesome6 } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
  // Common medication times
  const commonTimes = [
    { label: "Pagi", time: "07:00", icon: "cloud-sun", desc: "Setelah bangun" },
    { label: "Sarapan", time: "08:00", icon: "mug-hot", desc: "Saat makan pagi" },
    { label: "Siang", time: "12:00", icon: "sun", desc: "Saat makan siang" },
    { label: "Sore", time: "15:00", icon: "cloud-sun", desc: "Sore hari" },
    { label: "Malam", time: "18:00", icon: "moon", desc: "Saat makan malam" },
    { label: "Tidur", time: "21:00", icon: "bed", desc: "Sebelum tidur" },
  ];

  const { theme, mode: themeMode } = useTheme();
  const [showCustomTime, setShowCustomTime] = useState(false);

  // Animation values for preset cards
  const presetAnimations = useRef(
    commonTimes.map(() => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
    }))
  ).current;

  const handleInputChange = (field: keyof typeof medication, value: string) => {
    onMedicationChange({ ...medication, [field]: value });
  };

  const handlePresetPress = (preset: typeof commonTimes[0], index: number) => {
    // Animate press
    Animated.sequence([
      Animated.parallel([
        Animated.spring(presetAnimations[index].scale, {
          toValue: 0.92,
          useNativeDriver: true,
          speed: 50,
        }),
        Animated.timing(presetAnimations[index].opacity, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(presetAnimations[index].scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
          tension: 40,
        }),
        Animated.timing(presetAnimations[index].opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    handleInputChange("time", preset.time);
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
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <ThemedText variant="caption" color="secondary" style={styles.label}>
                  Waktu Minum Obat *
                </ThemedText>
                {medication.time && (
                  <View style={[styles.selectedTimeBadge, { backgroundColor: themeMode === "dark" ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.1)" }]}>
                    <FontAwesome6 name="clock" color={theme.colors.accent} size={12} />
                    <ThemedText weight="600" style={{ fontSize: 15, color: theme.colors.accent }}>
                      {medication.time}
                    </ThemedText>
                  </View>
                )}
              </View>
              
              {!showCustomTime ? (
                <>
                  {/* Quick Time Presets */}
                  <View style={styles.timeGrid}>
                    {commonTimes.map((preset) => {
                      const isSelected = medication.time === preset.time;
                      return (
                        <Pressable
                          key={preset.time}
                          onPress={() => {
                            handleInputChange("time", preset.time);
                          }}
                          style={[
                            styles.timePresetCard,
                            {
                              backgroundColor: themeMode === "dark" ? "#1C1C1E" : "#FFFFFF",
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                              padding: isSelected ? 11 : 12,
                            },
                          ]}
                        >
                          {isSelected && (
                            <LinearGradient
                              colors={theme.colors.gradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.selectedGradient}
                            />
                          )}
                          <View style={[
                            styles.timeIconContainer,
                            { backgroundColor: isSelected ? "transparent" : (themeMode === "dark" ? "#2C2C2E" : "#F2F2F7") }
                          ]}>
                            <FontAwesome6 
                              name={preset.icon as any} 
                              color={isSelected ? "#FFFFFF" : theme.colors.accent} 
                              size={18}
                              solid
                            />
                          </View>
                          <ThemedText 
                            weight="600" 
                            style={{ 
                              fontSize: 15, 
                              color: isSelected ? "#FFFFFF" : theme.colors.textPrimary,
                              zIndex: 1,
                            }}
                          >
                            {preset.label}
                          </ThemedText>
                          <ThemedText 
                            variant="caption" 
                            style={{ 
                              fontSize: 12, 
                              color: isSelected ? "rgba(255,255,255,0.8)" : theme.colors.textSecondary,
                              zIndex: 1,
                            }}
                          >
                            {preset.time}
                          </ThemedText>
                          <ThemedText 
                            variant="caption" 
                            style={{ 
                              fontSize: 11, 
                              color: isSelected ? "rgba(255,255,255,0.7)" : theme.colors.muted,
                              marginTop: 2,
                              zIndex: 1,
                            }}
                          >
                            {preset.desc}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={() => setShowCustomTime(true)}
                    style={[
                      styles.customTimeButton,
                      { 
                        backgroundColor: themeMode === "dark" ? "#2C2C2E" : "#F2F2F7",
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }
                    ]}
                  >
                    <FontAwesome6 name="clock" color={theme.colors.accent} size={16} />
                    <ThemedText weight="600" style={{ color: theme.colors.accent }}>
                      Atur Waktu Kustom
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Timer Picker */}
                  <View style={styles.customTimePicker}>
                    <View style={[styles.timePickerHeader, { 
                      backgroundColor: themeMode === "dark" ? "rgba(0,122,255,0.15)" : "rgba(0,122,255,0.1)",
                      borderColor: theme.colors.accent,
                    }]}>
                      <FontAwesome6 name="clock" color={theme.colors.accent} size={16} />
                      <ThemedText variant="caption" weight="600" style={{ color: theme.colors.accent }}>
                        Pilih waktu minum obat
                      </ThemedText>
                    </View>
                    
                    <View style={{ alignItems: "center", justifyContent: "center", width: "100%", paddingVertical: 20 }}>
                      <DateTimePicker
                        value={(() => {
                          const [hours, minutes] = (medication.time || "00:00").split(':').map(Number);
                          const date = new Date();
                          date.setHours(hours || 0);
                          date.setMinutes(minutes || 0);
                          date.setSeconds(0);
                          return date;
                        })()}
                        mode="time"
                        is24Hour={true}
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (event.type === "set" && selectedDate) {
                            const hours = selectedDate.getHours();
                            const minutes = selectedDate.getMinutes();
                            handleInputChange(
                              "time",
                              `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
                            );
                          }
                        }}
                        themeVariant={themeMode === "dark" ? "dark" : "light"}
                        style={{
                          width: 320,
                          height: 180,
                        }}
                      />
                    </View>
                  </View>

                  <Pressable
                    onPress={() => setShowCustomTime(false)}
                    style={[
                      styles.customTimeButton,
                      { 
                        backgroundColor: themeMode === "dark" ? "#2C2C2E" : "#F2F2F7",
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        marginTop: 16,
                      }
                    ]}
                  >
                    <FontAwesome6 name="arrow-left" color={theme.colors.accent} size={16} />
                    <ThemedText weight="600" style={{ color: theme.colors.accent }}>
                      Kembali ke Preset
                    </ThemedText>
                  </Pressable>
                </>
              )}
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
                scrollEnabled={false}
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
    maxHeight: "90%",
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
    marginBottom: 20,
  },
  form: {
    gap: 20,
    paddingBottom: 8,
    maxHeight: "100%",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    marginBottom: 4,
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
  selectedTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 12,
  },
  timePresetCard: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    position: "relative",
    overflow: "hidden",
  },
  selectedGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  timeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    zIndex: 1,
  },
  customTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  customTimePicker: {
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  timePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
  },
  pickerLabel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeSeparator: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  scrollPickerContainer: {
    height: 240,
    width: "100%",
    borderRadius: 16,
    borderWidth: 2,
    position: "relative",
    overflow: "hidden",
  },
  scrollPickerItem: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginHorizontal: 8,
  },
  gradientOverlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 10,
  },
  gradientOverlayBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 10,
  },
  selectionIndicator: {
    position: "absolute",
    top: 90,
    left: 8,
    right: 8,
    height: 60,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderRadius: 12,
    pointerEvents: "none",
    zIndex: 5,
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