import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../src/config/firebase";

import { AddMedicationModal } from "../../src/components/AddMedicationModal";
import { ConfirmMedicationModal } from "../../src/components/ConfirmMedicationModal";
import { ConnectPatientModal } from "../../src/components/ConnectPatientModal";
import { CustomAlert } from "../../src/components/CustomAlert";
import { MedicationHistoryModal } from "../../src/components/MedicationHistoryModal";
import RemindersModal from "../../src/components/RemindersModal";
import { ReminderShimmer } from "../../src/components/shimmer";
import {
  GradientChip,
  SectionHeader,
  Surface,
  ThemedText,
} from "../../src/components/ui";
import {
  getConnectedPatients,
  getPendingRequests,
  respondToConnectionRequest,
  sendConnectionRequest,
  type ConnectedUser,
  type ConnectionRequest,
} from "../../src/services/caregiver";
import {
  addNotificationResponseListener,
  cancelMedicationNotifications,
  dedupeMedicationNotifications,
  registerForPushNotifications,
  scheduleReminderNotification,
  sendCaregiverNotification,
} from "../../src/services/notifications";
import {
  calculateAdherence,
  createReminder as createReminderInStore,
  deleteReminder as deleteReminderInStore,
  getDailyAdherence,
  getMedicationHistory,
  getReminders as getRemindersFromStore,
  saveMedicationRecord,
  updateReminder as updateReminderInStore,
  type MedicationRecord
} from "../../src/services/storage";
import { useTheme } from "../../src/theme";

export default function HomeScreen() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const [userRole, setUserRole] = useState<'patient' | 'caregiver' | null>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adherenceData, setAdherenceData] = useState<any[]>([]);
  const [adherencePercentage, setAdherencePercentage] = useState(0);
  const [activeRemindersCount, setActiveRemindersCount] = useState(0);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [editMedication, setEditMedication] = useState({ title: "", dosage: "", time: "", notes: "" });
  const [newMedication, setNewMedication] = useState({ title: "", dosage: "", time: "", notes: "" });
  const [medicationHistory, setMedicationHistory] = useState<MedicationRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    buttons?: Array<{text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive"}>;
    icon?: keyof typeof FontAwesome6.glyphMap;
    iconColor?: string;
  }>({ visible: false });
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
  const [connectedPatients, setConnectedPatients] = useState<ConnectedUser[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const role = docSnap.data().role;
            setUserRole(role);
            
            // Load role-specific data
            if (role === 'caregiver') {
              loadCaregiverData(user.uid);
            } else if (role === 'patient') {
              loadPatientRequests(user.uid);
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Request notification permissions
    registerForPushNotifications();
    // Clean up any duplicate scheduled notifications across sessions
    dedupeMedicationNotifications();

    // Set up notification response listener
    const subscription = addNotificationResponseListener((response) => {
      const { medicationId, type } = response.notification.request.content.data as { medicationId: string; type: string };
      console.log("Notification tapped:", type, medicationId);
      
      if (type === "ontime" || type === "after") {
        // Navigate to confirmation or show alert
        showAlert(
          "Konfirmasi Minum Obat",
          "Udah minum obatnya belum?",
          [
            { text: "Belum", style: "cancel" },
            { text: "Udah", onPress: () => handleConfirmMedication(medicationId), style: "default" },
          ],
          "pills",
          "#2874A6"
        );
      }
    });

    // Load initial data
    loadData();

    return () => {
      subscription.remove();
    };
  }, []);

  // Schedule notifications when reminders change (but only once per reminder)
  useEffect(() => {
    if (reminders.length > 0 && !loading) {
      scheduleAllNotifications();
    }
  }, [reminders.length, loading]);

  const showAlert = (title: string, message: string, buttons?: Array<{text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive"}>, icon?: keyof typeof FontAwesome6.glyphMap, iconColor?: string) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: "OK" }],
      icon,
      iconColor,
    });
  };

  const closeAlert = () => {
    setCustomAlert({ visible: false });
  };

  async function loadCaregiverData(uid: string) {
    const patients = await getConnectedPatients(uid);
    setConnectedPatients(patients);
  }

  async function loadPatientRequests(uid: string) {
    const requests = await getPendingRequests(uid);
    setPendingRequests(requests);
  }

  async function handleConnectPatient(email: string) {
    if (!auth.currentUser) return;
    
    setIsConnecting(true);
    try {
      const result = await sendConnectionRequest(
        auth.currentUser.uid,
        auth.currentUser.displayName || "Caregiver",
        auth.currentUser.email || "",
        email
      );

      if (result.success) {
        setShowConnectModal(false);
        showAlert(
          "Permintaan Terkirim",
          "Menunggu konfirmasi dari pasien",
          [{ text: "OK" }],
          "check-circle",
          "#10D99D"
        );
      } else {
        showAlert(
          "Gagal",
          result.error || "Gagal mengirim permintaan",
          [{ text: "OK" }],
          "triangle-exclamation",
          "#FF8585"
        );
      }
    } catch (error) {
      console.error(error);
      showAlert("Error", "Terjadi kesalahan", [{ text: "OK" }], "triangle-exclamation", "#FF8585");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleRespondRequest(requestId: string, accept: boolean) {
    try {
      const result = await respondToConnectionRequest(requestId, accept);
      if (result.success) {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        showAlert(
          accept ? "Terhubung" : "Ditolak",
          accept ? "Anda sekarang terhubung dengan caregiver" : "Permintaan ditolak",
          [{ text: "OK" }],
          accept ? "check-circle" : "xmark-circle",
          accept ? "#10D99D" : "#FF8585"
        );
      } else {
        showAlert("Error", "Gagal memproses permintaan", [{ text: "OK" }], "triangle-exclamation", "#FF8585");
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadData() {
    try {
      const [adherencePercent, dailyData, remoteReminders] = await Promise.all([
        calculateAdherence(7),
        getDailyAdherence(7),
        getRemindersFromStore(),
      ]);

      // Load reminders from Firestore
      setReminders(remoteReminders);
      setAdherencePercentage(adherencePercent);
      setCaregivers([]);
      
      if (dailyData.length > 0) {
        setAdherenceData(dailyData);
      }

      setMedicationHistory([]);
      setActiveRemindersCount(remoteReminders.filter(r => r.status === "scheduled").length);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setLoading(false);
    }
  }

  async function scheduleAllNotifications() {
    try {
      console.log(`Scheduling notifications for ${reminders.length} reminders`);
      for (const reminder of reminders) {
        if (reminder.status === "scheduled") {
          console.log(`Scheduling reminder: ${reminder.title} at ${reminder.time}`);
          await scheduleReminderNotification({
            id: reminder.id,
            title: reminder.title,
            dosage: reminder.dosage,
            time: reminder.time,
            notes: reminder.notes,
          });
        }
      }
      console.log("All notifications scheduled successfully");
    } catch (error) {
      console.error("Error scheduling notifications:", error);
    }
  }

  async function handleAddMedication(medication?: { title: string; dosage: string; time: string; notes: string }) {
    const medicationData = medication || newMedication;
    
    console.log("Adding medication:", medicationData);
    
    if (!medicationData.title || !medicationData.dosage || !medicationData.time) {
      console.log("Validation failed - missing required fields");
      showAlert(
        "Error", 
        "Isi dulu semua field yang diperlukan ya",
        [{ text: "OK" }],
        "triangle-exclamation",
        "#FF8585"
      );
      return;
    }

    const newReminder = {
      id: `med-${Date.now()}`,
      title: medicationData.title,
      dosage: medicationData.dosage,
      time: medicationData.time,
      notes: medicationData.notes || "",
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };

    console.log("Creating reminder:", newReminder);

    try {
      // Close modal first
      setShowAddModal(false);
      setNewMedication({ title: "", dosage: "", time: "", notes: "" });

      // Persist to Firestore then update local state; scheduling will be handled by effect
      await createReminderInStore(newReminder as any);
      setReminders((prev) => [...prev, newReminder]);
      setActiveRemindersCount((c) => c + 1);
      console.log("Reminder saved to Firestore and local state updated");

      // Show success alert after modal is closed
      setTimeout(() => {
        showAlert(
          "Berhasil", 
          "Pengingat obat udah berhasil ditambahkan!",
          [{ text: "OK" }],
          "check-circle",
          "#10D99D"
        );
      }, 300);
    } catch (error) {
      console.error("Error adding medication:", error);
      showAlert(
        "Error", 
        "Gagal menambahkan pengingat. Coba lagi ya!",
        [{ text: "OK" }],
        "triangle-exclamation",
        "#FF8585"
      );
    }
  }

  async function handleStartEdit(reminder: any) {
    setSelectedReminderId(reminder.id);
    setEditMedication({ title: reminder.title, dosage: reminder.dosage, time: reminder.time, notes: reminder.notes || "" });
    setShowEditModal(true);
  }

  async function handleUpdateMedication(medication?: { title: string; dosage: string; time: string; notes: string }) {
    if (!selectedReminderId) return;
    const data = medication || editMedication;
    try {
      // Persist to Firestore
      await updateReminderInStore(selectedReminderId, {
        title: data.title,
        dosage: data.dosage,
        time: data.time,
        notes: data.notes,
      } as any);

      // Update local list
      setReminders((prev) => prev.map((r) => r.id === selectedReminderId ? { ...r, ...data } : r));

      // Reschedule notifications for this reminder
      await cancelMedicationNotifications(selectedReminderId);
      const updated = { id: selectedReminderId, ...data, status: "scheduled" } as any;
      await scheduleReminderNotification(updated);

      setShowEditModal(false);
      showAlert(
        "Berhasil",
        "Perubahan pengingat sudah disimpan",
        [{ text: "OK" }],
        "check-circle",
        "#10D99D"
      );
    } catch (e) {
      console.error("Failed to update reminder", e);
      showAlert("Error", "Gagal menyimpan perubahan", [{ text: "OK" }], "triangle-exclamation", "#FF8585");
    }
  }

  async function handleDeleteMedication() {
    if (!selectedReminderId) return;
    try {
      await cancelMedicationNotifications(selectedReminderId);
      const ok = await deleteReminderInStore(selectedReminderId);
      if (ok) {
        setReminders((prev) => prev.filter((r) => r.id !== selectedReminderId));
        setActiveRemindersCount((c) => Math.max(0, c - 1));
      }
      setShowEditModal(false);
      showAlert(
        "Berhasil",
        "Pengingat sudah dihapus",
        [{ text: "OK" }],
        "check-circle",
        "#10D99D"
      );
    } catch (e) {
      console.error("Failed to delete reminder", e);
      showAlert("Error", "Gagal menghapus pengingat", [{ text: "OK" }], "triangle-exclamation", "#FF8585");
    }
  }

  async function handleViewHistory() {
    try {
      // Load latest history from Firebase before showing modal
      const history = await getMedicationHistory(7);
      setMedicationHistory(history);
      setShowHistoryModal(true);
    } catch (error) {
      console.error("Error viewing history:", error);
      showAlert(
        "Error", 
        "Gagal memuat riwayat konsumsi nih",
        [{ text: "OK" }],
        "triangle-exclamation",
        "#FF8585"
      );
    }
  }

  async function handleConfirmMedication(medicationId?: string) {
    const targetId = medicationId || nextReminder.id;
    if (!targetId) return;
    setShowConfirmModal(false);

    try {
      // Save to history
      const reminder = reminders.find((r) => r.id === targetId);
      if (reminder) {
        const record: MedicationRecord = {
          id: `${targetId}-${Date.now()}`,
          medicationId: targetId,
          medicationName: reminder.title,
          dosage: reminder.dosage,
          scheduledTime: reminder.time,
          takenAt: new Date().toISOString(),
          status: "taken",
          date: new Date().toISOString(),
          confirmedBy: "user",
        };
        await saveMedicationRecord(record);
        
        // Update local history state
        setMedicationHistory(prev => [record, ...prev]);
      }

      // Update UI
      setReminders((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, status: "taken" } : r))
      );
      // Persist status change to Firestore
      await updateReminderInStore(targetId, { status: "taken" } as any);

      // Refresh adherence data
      const newAdherence = await calculateAdherence(7);
      setAdherencePercentage(newAdherence);
      
      const dailyData = await getDailyAdherence(7);
      if (dailyData.length > 0) {
        setAdherenceData(dailyData);
      }

      // Success handled by modal close
    } catch (error) {
      console.error("Error confirming medication:", error);
      showAlert(
        "Error", 
        "Gagal konfirmasi konsumsi obat nih",
        [{ text: "OK" }],
        "triangle-exclamation",
        "#FF8585"
      );
    }
  }

  // Check for missed medications and notify caregivers
  useEffect(() => {
    const checkMissedMedications = setInterval(async () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      
      for (const reminder of reminders) {
        if (reminder.status === "scheduled") {
          const [schedHour, schedMin] = reminder.time.split(":").map(Number);
          const scheduledTime = new Date();
          scheduledTime.setHours(schedHour, schedMin, 0, 0);
          
          // If 30 minutes past scheduled time and not confirmed
          const timeDiff = now.getTime() - scheduledTime.getTime();
          if (timeDiff > 30 * 60 * 1000 && timeDiff < 35 * 60 * 1000) {
            // Notify caregivers
            const activeCaregivers = caregivers.filter((c) => c.status === "active");
            for (const caregiver of activeCaregivers) {
              await sendCaregiverNotification(
                caregiver.name,
                reminder.title,
                "Pasien"
              );
            }
          }
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(checkMissedMedications);
  }, [reminders, caregivers]);

  const nextReminder = reminders.length > 0 ? reminders[0] : null;

  if (userRole === 'caregiver') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.md, gap: theme.spacing.md }]}
          showsVerticalScrollIndicator={false}
        >
          <Surface padding={false}>
            <LinearGradient
              colors={theme.colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroHeader}>
                <ThemedText variant="title" weight="700" style={styles.heroTitle}>
                  MedMemory
                </ThemedText>
                <FontAwesome6 name="user-nurse" color="white" size={24} />
              </View>
              <Text style={styles.heroSubtitle}>Mode Pendamping (Caregiver)</Text>
            </LinearGradient>
          </Surface>

          <Surface>
            {connectedPatients.length > 0 ? (
              <View>
                <SectionHeader 
                  title="Pasien Terhubung" 
                  subtitle={`${connectedPatients.length} pasien dalam pantauan`}
                  actionLabel="Tambah"
                  onActionPress={() => setShowConnectModal(true)}
                />
                <View style={{ gap: 12 }}>
                  {connectedPatients.map((patient) => (
                    <Pressable 
                      key={patient.uid} 
                      style={[
                        styles.caregiverRow, 
                        { 
                          backgroundColor: theme.colors.cardMuted,
                          padding: 12,
                          borderRadius: 12,
                          marginBottom: 0
                        }
                      ]}
                      onPress={() => router.push({ pathname: "/patient-detail", params: { patientId: patient.uid } })}
                    >
                      <View style={[styles.reminderIcon, { backgroundColor: theme.colors.background }]}>
                        <FontAwesome6 name="user" color={theme.colors.textPrimary} size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText weight="600">{patient.name}</ThemedText>
                        <ThemedText variant="caption" color="muted">{patient.email}</ThemedText>
                      </View>
                      <FontAwesome6 name="chevron-right" color={theme.colors.muted} size={14} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome6 name="users" color={theme.colors.muted} size={48} />
                <ThemedText color="muted" style={styles.emptyStateTitle}>Belum ada pasien terhubung</ThemedText>
                <ThemedText variant="caption" color="muted">Hubungkan pasien untuk memantau pengobatan mereka</ThemedText>
                
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: theme.colors.accent, marginTop: 16, width: '100%' }]}
                  onPress={() => setShowConnectModal(true)}
                >
                  <Text style={[styles.primaryButtonText, { fontFamily: theme.typography.fontFamily }]}>Hubungkan Pasien</Text>
                </Pressable>
              </View>
            )}
          </Surface>
        </ScrollView>

        <ConnectPatientModal
          visible={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onConnect={handleConnectPatient}
          loading={isConnecting}
        />

        <CustomAlert
          visible={customAlert.visible}
          title={customAlert.title}
          message={customAlert.message}
          buttons={customAlert.buttons}
          icon={customAlert.icon}
          iconColor={customAlert.iconColor}
          onClose={closeAlert}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.md, gap: theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Surface padding={false}>
          <LinearGradient
            colors={theme.colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroHeader}>
              <ThemedText variant="title" weight="700" style={styles.heroTitle}>
                MedMemory
              </ThemedText>
              <FontAwesome6 name="bell" color="white" size={24} />
            </View>
            <Text style={styles.heroSubtitle}>Pendamping terapi untuk peserta JKN</Text>
            <View style={styles.heroTags}>
              <GradientChip label={`Konsistensi ${adherencePercentage}%`} />
              <GradientChip label={`${activeRemindersCount} pengingat`} />
            </View>
          </LinearGradient>
        </Surface>

        {pendingRequests.length > 0 && (
          <Surface>
            <SectionHeader title="Permintaan Koneksi" subtitle="Caregiver ingin terhubung" />
            <View style={{ gap: 12 }}>
              {pendingRequests.map((request) => (
                <View 
                  key={request.id} 
                  style={[
                    styles.caregiverRow, 
                    { 
                      backgroundColor: theme.colors.cardMuted,
                      padding: 12,
                      borderRadius: 12,
                      marginBottom: 0,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 8
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' }}>
                    <View style={[styles.reminderIcon, { backgroundColor: theme.colors.background }]}>
                      <FontAwesome6 name="user-nurse" color={theme.colors.accent} size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText weight="600">{request.caregiverName}</ThemedText>
                      <ThemedText variant="caption" color="muted">{request.caregiverEmail}</ThemedText>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 8, width: '100%', marginTop: 4 }}>
                    <Pressable 
                      style={{ flex: 1, padding: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }}
                      onPress={() => handleRespondRequest(request.id, false)}
                    >
                      <ThemedText variant="caption" weight="600">Tolak</ThemedText>
                    </Pressable>
                    <Pressable 
                      style={{ flex: 1, padding: 8, alignItems: 'center', borderRadius: 8, backgroundColor: theme.colors.accent }}
                      onPress={() => handleRespondRequest(request.id, true)}
                    >
                      <ThemedText variant="caption" weight="600" style={{ color: 'white' }}>Terima</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </Surface>
        )}

        <Surface>
          <SectionHeader
            title="Dosis berikutnya"
            subtitle="Tambahkan jika belum ada"
            actionLabel="Tambah"
            onActionPress={() => setShowAddModal(true)}
          />
          {nextReminder ? (
            <>
            <View style={styles.nextDoseRow}>
              <View style={[styles.pillIcon, { backgroundColor: theme.colors.cardMuted }]}>
                <FontAwesome6 name="pills" color={theme.colors.accent} size={18} />
              </View>
              <View style={styles.nextDoseContent}>
                  <ThemedText variant="subheading" weight="600">
                    {nextReminder.title}
                  </ThemedText>
                  <ThemedText variant="caption" color="secondary">{nextReminder.dosage}</ThemedText>
                  <ThemedText variant="caption" color="muted">{nextReminder.notes}</ThemedText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <ThemedText variant="subheading" weight="600">
                    {nextReminder.time}
                  </ThemedText>
                  <ThemedText variant="caption" color="muted">
                    hari ini
                  </ThemedText>
                </View>
              </View>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => setShowConfirmModal(true)}
              >
                <Text style={[styles.primaryButtonText, { fontFamily: theme.typography.fontFamily }]}>Udah minum obat</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome6 name="calendar-plus" color={theme.colors.muted} size={48} />
              <ThemedText color="muted" style={styles.emptyStateTitle}>Belum ada pengingat nih</ThemedText>
              <ThemedText variant="caption" color="muted">Yuk, tambahin pengingat pertama kamu</ThemedText>
            </View>
          )}
        </Surface>

        <Surface>
          <SectionHeader title="Timeline konsumsi" subtitle="Catatan konsumsi 7 hari" />
          {adherenceData.length > 0 ? (
            /* Compact histogram so pasien dapat memantau pola kepatuhan mingguan */
            <View style={styles.timelineRow}>
              {adherenceData.map((day) => (
                <View key={day.label} style={styles.timelineColumn}>
                  <View
                    style={[
                      styles.timelineBarContainer,
                      { backgroundColor: theme.colors.cardMuted },
                    ]}
                  >
                    <LinearGradient
                      colors={theme.colors.gradient}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[
                        styles.timelineBar,
                        {
                          height: `${day.value}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText variant="caption" color="muted" style={styles.timelineLabel}>
                    {day.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome6 name="chart-line" color={theme.colors.muted} size={48} />
              <ThemedText color="muted" style={styles.emptyStateTitle}>Yah, belum ada data, nih!</ThemedText>
              <ThemedText variant="caption" color="muted">Mulai minum obat buat lihat timeline konsumsi</ThemedText>
            </View>
          )}
        </Surface>

        <Surface>
          <SectionHeader
            title="Pengingat hari ini"
            actionLabel={reminders.length > 3 ? "Lihat semua" : undefined}
            onActionPress={() => reminders.length > 3 && setShowAllReminders(true)}
          />
          {loading ? (
            <ReminderShimmer />
          ) : reminders.length > 0 ? (
            <View style={styles.remindersList}>
              {(reminders.length > 3 ? reminders.slice(0, 3) : reminders).map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.reminderRow,
                    {
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onTouchEnd={() => handleStartEdit(item)}
                >
                  <View
                    style={[
                      styles.reminderIcon,
                      { backgroundColor: theme.colors.cardMuted },
                    ]}
                  >
                    <FontAwesome6 name="clock" color={theme.colors.accent} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText weight="600">{item.title}</ThemedText>
                    <ThemedText color="muted">{item.notes}</ThemedText>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <ThemedText>{item.time}</ThemedText>
                    <Text style={[styles.statusChip, styles[item.status as keyof typeof styles]]}>{item.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome6 name="clock" color={theme.colors.muted} size={48} />
              <ThemedText color="muted" style={styles.emptyStateTitle}>Yah, belum ada data, nih!</ThemedText>
              <ThemedText variant="caption" color="muted">Tambahin pengingat obat buat lihat jadwal harian</ThemedText>
            </View>
          )}
        </Surface>

        <Surface>
          <SectionHeader title="Pemantauan keluarga" subtitle="Caregiver menerima notifikasi" />
          {caregivers.filter((c) => c.status === "active").map((caregiver) => (
            <View key={caregiver.id} style={styles.caregiverRow}>
              <View style={{ flex: 1 }}>
                <ThemedText weight="500">{caregiver.name}</ThemedText>
                <ThemedText variant="caption" color="muted">{caregiver.role} | {caregiver.contact}</ThemedText>
              </View>
              <FontAwesome6 name="shield-halved" color={theme.colors.success} size={20} />
            </View>
          ))}
          <View style={styles.caregiverActions}>
            <Pressable onPress={handleViewHistory}>
              <Surface muted padding={true} style={styles.caregiverAction}>
                <View style={styles.actionContent}>
                  <FontAwesome6 name="chart-line" color={theme.colors.accent} size={16} />
                  <ThemedText variant="caption">Riwayat konsumsi</ThemedText>
                </View>
              </Surface>
            </Pressable>
          </View>
        </Surface>
      </ScrollView>

      <ConfirmMedicationModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => handleConfirmMedication()}
        medicationName={nextReminder?.title}
      />

      <AddMedicationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMedication}
        medication={newMedication}
        onMedicationChange={setNewMedication}
      />

      <AddMedicationModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onAdd={handleUpdateMedication}
        medication={editMedication}
        onMedicationChange={setEditMedication}
        mode="edit"
        onDelete={handleDeleteMedication}
      />

      <MedicationHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        medicationHistory={medicationHistory}
      />

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        icon={customAlert.icon}
        iconColor={customAlert.iconColor}
        onClose={closeAlert}
      />

      <RemindersModal
        visible={showAllReminders}
        onClose={() => setShowAllReminders(false)}
        reminders={reminders}
        onSelect={(item) => {
          setShowAllReminders(false);
          handleStartEdit(item);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    padding: 24,
    borderRadius: 24,
    minHeight: 160,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  heroTitle: {
    color: "white",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Geist",
  },
  heroTags: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  nextDoseRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  nextDoseContent: {
    flex: 1,
  },
  nextDoseTime: {
    alignItems: "flex-end",
  },
  pillIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyStateTitle: {
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  timelineColumn: {
    alignItems: "center",
    flex: 1,
  },
  timelineBarContainer: {
    width: "100%",
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(226,232,240,0.4)",
  },
  timelineBar: {
    borderRadius: 12,
    width: "100%",
  },
  timelineLabel: {
    marginTop: 8,
  },
  remindersList: {
    gap: 14,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(30,143,225,0.08)",
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
  scheduled: {
    backgroundColor: "rgba(30,143,225,0.15)",
    color: "#3DA5F5",
  },
  taken: {
    backgroundColor: "rgba(12,186,135,0.15)",
    color: "#10D99D",
  },
  missed: {
    backgroundColor: "rgba(255,107,107,0.15)",
    color: "#FF8585",
  },
  caregiverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  caregiverActions: {
    flexDirection: "row",
    gap: 12,
  },
  caregiverAction: {
    flex: 1,
    maxWidth: 200,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
