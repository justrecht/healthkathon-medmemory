import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
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
    ThemedText
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
    clearMedicationHistory,
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
  const [editMedication, setEditMedication] = useState<{ title: string; dosage: string; time: string; notes: string; repeatDays?: number[] }>({ title: "", dosage: "", time: "", notes: "", repeatDays: [0,1,2,3,4,5,6] });
  const [newMedication, setNewMedication] = useState<{ title: string; dosage: string; time: string; notes: string; repeatDays?: number[] }>({ title: "", dosage: "", time: "", notes: "", repeatDays: [0,1,2,3,4,5,6] });
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
  const [isConfirming, setIsConfirming] = useState(false);
  const notificationsScheduledRef = useRef(false);

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

  // Schedule notifications when reminders change (but only once per app session)
  useEffect(() => {
    if (reminders.length > 0 && !loading) {
      // Only schedule if we haven't scheduled in this session
      if (!notificationsScheduledRef.current) {
        notificationsScheduledRef.current = true;
        scheduleAllNotifications();
      }
    }
  }, [reminders, loading]);

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

  async function resetDailyMedicationStatus(reminders: any[]) {
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
    const updatedReminders = [];
    
    for (const reminder of reminders) {
      if (reminder.status === 'taken' && reminder.lastTakenDate) {
        const takenDate = reminder.lastTakenDate.split('T')[0];
        
        // If taken date is not today, reset to scheduled
        if (takenDate !== today) {
          try {
            await updateReminderInStore(reminder.id, { 
              status: 'scheduled',
              lastTakenDate: null 
            } as any);
            updatedReminders.push({ ...reminder, status: 'scheduled', lastTakenDate: null });
          } catch (error) {
            console.error('Error resetting reminder status:', error);
            updatedReminders.push(reminder);
          }
        } else {
          updatedReminders.push(reminder);
        }
      } else {
        updatedReminders.push(reminder);
      }
    }
    
    return updatedReminders;
  }

  async function loadData() {
    try {
      const [adherencePercent, dailyData, remoteReminders] = await Promise.all([
        calculateAdherence(7),
        getDailyAdherence(7),
        getRemindersFromStore(),
      ]);

      // Reset daily medication statuses
      const resetReminders = await resetDailyMedicationStatus(remoteReminders);
      
      // Load reminders from Firestore
      // Sort by closest upcoming time
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      resetReminders.sort((a: any, b: any) => {
        const [aHours, aMinutes] = a.time.split(':').map(Number);
        const [bHours, bMinutes] = b.time.split(':').map(Number);
        
        const aTimeMinutes = aHours * 60 + aMinutes;
        const bTimeMinutes = bHours * 60 + bMinutes;
        
        // If time has passed today, treat it as tomorrow (add 24 hours worth of minutes)
        const aAdjusted = aTimeMinutes < currentMinutes ? aTimeMinutes + 1440 : aTimeMinutes;
        const bAdjusted = bTimeMinutes < currentMinutes ? bTimeMinutes + 1440 : bTimeMinutes;
        
        return aAdjusted - bAdjusted;
      });
      setReminders(resetReminders);
      setAdherencePercentage(adherencePercent);
      
      // Load connected caregivers if user is logged in
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const caregiverIds = userData.caregivers || [];
            
            if (caregiverIds.length > 0) {
              // Fetch caregiver details
              const caregiverPromises = caregiverIds.map(async (caregiverId: string) => {
                const caregiverDoc = await getDoc(doc(db, "users", caregiverId));
                if (caregiverDoc.exists()) {
                  return { id: caregiverDoc.id, ...caregiverDoc.data() };
                }
                return null;
              });
              
              const caregiverDetails = await Promise.all(caregiverPromises);
              setCaregivers(caregiverDetails.filter(c => c !== null) as any);
            } else {
              setCaregivers([]);
            }
          } else {
            setCaregivers([]);
          }
        } catch (error) {
          console.error("Error loading caregivers:", error);
          setCaregivers([]);
        }
      } else {
        setCaregivers([]);
      }
      
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
      console.log(`Checking notifications for ${reminders.length} reminders`);
      for (const reminder of reminders) {
        if (reminder.status === "scheduled") {
          // Pass forceReschedule=false so it only schedules if not already scheduled
          await scheduleReminderNotification({
            id: reminder.id,
            title: reminder.title,
            dosage: reminder.dosage,
            time: reminder.time,
            notes: reminder.notes,
            repeatDays: reminder.repeatDays,
          }, false);
        }
      }
      console.log("Notification check completed");
    } catch (error) {
      console.error("Error scheduling notifications:", error);
    }
  }

  async function handleAddMedication(medication?: { title: string; dosage: string; time: string; notes: string; repeatDays?: number[] }) {
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
      repeatDays: medicationData.repeatDays ?? [0, 1, 2, 3, 4, 5, 6],
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };

    console.log("Creating reminder:", newReminder);

    try {
      // Close modal first
      setShowAddModal(false);
      setNewMedication({ title: "", dosage: "", time: "", notes: "", repeatDays: [0,1,2,3,4,5,6] });

      // Persist to Firestore then update local state
      await createReminderInStore(newReminder as any);
      setReminders((prev) => [...prev, newReminder]);
      setActiveRemindersCount((c) => c + 1);
      
      // Schedule notifications for the new reminder immediately
      await scheduleReminderNotification({
        id: newReminder.id,
        title: newReminder.title,
        dosage: newReminder.dosage,
        time: newReminder.time,
        notes: newReminder.notes,
        repeatDays: newReminder.repeatDays,
      }, true);
      
      console.log("Reminder saved to Firestore and notifications scheduled");

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
    setEditMedication({ 
      title: reminder.title, 
      dosage: reminder.dosage, 
      time: reminder.time, 
      notes: reminder.notes || "",
      repeatDays: reminder.repeatDays ?? [0,1,2,3,4,5,6]
    });
    setShowEditModal(true);
  }

  async function handleUpdateMedication(medication?: { title: string; dosage: string; time: string; notes: string; repeatDays?: number[] }) {
    if (!selectedReminderId) return;
    const data = medication || editMedication;

    // Close the edit modal first so the alert is visible
    setShowEditModal(false);

    showAlert(
      "Simpan Perubahan?",
      "Yakin mau simpan perubahan jadwal obat ini?",
      [
        { 
          text: "Batal", 
          style: "cancel",
          onPress: () => setShowEditModal(true) // Re-open modal if cancelled
        },
        { 
          text: "Simpan", 
          onPress: async () => {
            try {
              // Persist to Firestore
              await updateReminderInStore(selectedReminderId, {
                title: data.title,
                dosage: data.dosage,
                time: data.time,
                notes: data.notes,
                repeatDays: data.repeatDays,
              } as any);

              // Update local list
              setReminders((prev) => prev.map((r) => r.id === selectedReminderId ? { ...r, ...data } : r));

              // Reschedule notifications for this reminder (force reschedule)
              await cancelMedicationNotifications(selectedReminderId);
              const updated = { id: selectedReminderId, ...data, status: "scheduled" } as any;
              await scheduleReminderNotification(updated, true);

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
        }
      ],
      "floppy-disk",
      theme.colors.accent
    );
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
    const targetId = medicationId || nextReminder?.id;
    if (!targetId) return;
    
    setIsConfirming(true);

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

      // Update UI with current date
      const now = new Date().toISOString();
      setReminders((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, status: "taken", lastTakenDate: now } : r))
      );
      // Persist status change to Firestore with date
      await updateReminderInStore(targetId, { status: "taken", lastTakenDate: now } as any);

      // Cancel any pending notifications for this medication (e.g. the "After" reminder)
      await cancelMedicationNotifications(targetId);

      // Refresh adherence data
      const newAdherence = await calculateAdherence(7);
      setAdherencePercentage(newAdherence);
      
      const dailyData = await getDailyAdherence(7);
      if (dailyData.length > 0) {
        setAdherenceData(dailyData);
      }

      setShowConfirmModal(false);
    } catch (error) {
      console.error("Error confirming medication:", error);
      showAlert(
        "Error", 
        "Gagal konfirmasi konsumsi obat nih",
        [{ text: "OK" }],
        "triangle-exclamation",
        "#FF8585"
      );
    } finally {
      setIsConfirming(false);
    }
  }

  async function deleteReminderDirectly(id: string) {
    try {
      await cancelMedicationNotifications(id);
      const ok = await deleteReminderInStore(id);
      if (ok) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        setActiveRemindersCount((c) => Math.max(0, c - 1));
      }
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

  function confirmDelete(item: any) {
    showAlert(
      "Hapus Pengingat",
      `Yakin mau hapus jadwal ${item.title}?`,
      [
        { text: "Batal", style: "cancel" },
        { 
            text: "Hapus", 
            style: "destructive",
            onPress: () => deleteReminderDirectly(item.id)
        }
      ],
      "trash",
      theme.colors.danger
    );
  }

  function handlePressConfirmButton() {
    if (!nextReminder) return;

    const now = new Date();
    const [schedHour, schedMin] = nextReminder.time.split(":").map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(schedHour, schedMin, 0, 0);

    // If scheduled time is in the future (more than 15 mins)
    // We use today's date with scheduled time. 
    // If it's 23:00 and schedule is 08:00, diff is negative (past).
    // If it's 08:00 and schedule is 10:00, diff is positive (future).
    const diffMs = scheduledTime.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins > 15) {
      showAlert(
        "Terlalu Cepat?",
        `Jadwal obat ini jam ${nextReminder.time}. Yakin udah diminum sekarang?`,
        [
          { text: "Batal", style: "cancel" },
          { 
            text: "Ya, Sudah", 
            onPress: () => setShowConfirmModal(true),
            style: "default" 
          }
        ],
        "clock",
        theme.colors.warning
      );
    } else {
      setShowConfirmModal(true);
    }
  }

  // Check for missed medications and notify caregivers
  useEffect(() => {
    const checkMissedMedications = setInterval(async () => {
      if (!auth.currentUser) return;
      
      const now = new Date();
      const currentDay = now.getDay();
      
      for (const reminder of reminders) {
        // Check if medication is scheduled for today and status is still "scheduled"
        const isScheduledToday = !reminder.repeatDays || reminder.repeatDays.includes(currentDay);
        
        if (reminder.status === "scheduled" && isScheduledToday) {
          const [schedHour, schedMin] = reminder.time.split(":").map(Number);
          const scheduledTime = new Date();
          scheduledTime.setHours(schedHour, schedMin, 0, 0);
          
          // If 30 minutes past scheduled time and not confirmed
          const timeDiff = now.getTime() - scheduledTime.getTime();
          if (timeDiff > 30 * 60 * 1000 && timeDiff < 35 * 60 * 1000) {
            // Notify caregivers about missed medication
            if (caregivers.length > 0) {
              const patientName = auth.currentUser.displayName || "Pasien";
              const patientId = auth.currentUser.uid;
              
              console.log(`⚠️ Medication missed: ${reminder.title} at ${reminder.time}. Notifying ${caregivers.length} caregiver(s)...`);
              
              for (const caregiver of caregivers) {
                await sendCaregiverNotification(
                  caregiver.id,
                  caregiver.name || caregiver.email,
                  reminder.title,
                  patientId,
                  patientName,
                  reminder.time
                );
              }
            }
          }
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(checkMissedMedications);
  }, [reminders, caregivers]);

  const nextReminder = reminders
    .filter(r => r.status === 'scheduled' && (!r.repeatDays || r.repeatDays.includes(new Date().getDay())))
    .sort((a, b) => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [aHours, aMinutes] = a.time.split(':').map(Number);
      const [bHours, bMinutes] = b.time.split(':').map(Number);
      
      const aTimeMinutes = aHours * 60 + aMinutes;
      const bTimeMinutes = bHours * 60 + bMinutes;
      
      // If time has passed today, treat it as tomorrow (add 24 hours)
      const aAdjusted = aTimeMinutes < currentMinutes ? aTimeMinutes + 1440 : aTimeMinutes;
      const bAdjusted = bTimeMinutes < currentMinutes ? bTimeMinutes + 1440 : bTimeMinutes;
      
      return aAdjusted - bAdjusted;
    })[0];

  if (userRole === 'caregiver') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: mode === "dark" ? "#000000" : "#F2F2F7" }]}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerDate, { color: theme.colors.textSecondary }]}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Ringkasan</Text>
            </View>
            <Pressable style={[styles.profileButton, { backgroundColor: mode === "dark" ? "#1C1C1E" : "#E5E5EA" }]}>
              <FontAwesome6 name="user-nurse" color={theme.colors.accent} size={20} />
            </Pressable>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: mode === "dark" ? "#1C1C1E" : "#FFFFFF" }]}>
             <View style={styles.summaryHeader}>
                <View>
                  <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>Mode Caregiver</Text>
                  <Text style={[styles.summarySubtitle, { color: theme.colors.textSecondary }]}>Memantau {connectedPatients.length} Pasien</Text>
                </View>
                <FontAwesome6 name="user-nurse" color={theme.colors.accent} size={24} />
             </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Pasien Terhubung</Text>
              <Pressable onPress={() => setShowConnectModal(true)}>
                 <Text style={{ color: theme.colors.accent, fontSize: 17, fontWeight: "600" }}>Tambah</Text>
              </Pressable>
            </View>
            <View style={{ gap: 12, paddingHorizontal: 20 }}>
              {connectedPatients.length > 0 ? connectedPatients.map((patient) => (
                <Pressable 
                  key={patient.uid} 
                  style={[
                    styles.caregiverRow, 
                    { 
                      marginBottom: 0,
                      backgroundColor: mode === "dark" ? "#1C1C1E" : "#FFFFFF",
                      borderRadius: 12
                    }
                  ]}
                  onPress={() => router.push({ pathname: "/patient-detail", params: { patientId: patient.uid } })}
                >
                  <View style={[styles.reminderIcon, { backgroundColor: mode === "dark" ? "#2C2C2E" : "#F2F2F7" }]}>
                    <FontAwesome6 name="user" color={theme.colors.accent} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText weight="600" style={{ fontSize: 17 }}>{patient.name}</ThemedText>
                    <ThemedText variant="caption" color="muted" style={{ fontSize: 15 }}>{patient.email}</ThemedText>
                  </View>
                  <FontAwesome6 name="chevron-right" color={theme.colors.muted} size={14} />
                </Pressable>
              )) : (
                <View style={[styles.emptyState, { backgroundColor: mode === "dark" ? "#1C1C1E" : "#FFFFFF", borderRadius: 12, padding: 24 }]}>
                  <FontAwesome6 name="users" color={theme.colors.muted} size={48} />
                  <ThemedText color="muted" style={styles.emptyStateTitle}>Belum ada pasien terhubung</ThemedText>
                  <ThemedText variant="caption" color="muted">Hubungkan pasien untuk memantau pengobatan mereka</ThemedText>
                  
                  <Pressable
                    style={[styles.primaryButton, { backgroundColor: theme.colors.accent, marginTop: 16, width: '100%' }]}
                    onPress={() => setShowConnectModal(true)}
                  >
                    <Text style={styles.primaryButtonText}>Hubungkan Pasien</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: mode === "dark" ? "#000000" : "#F2F2F7" }]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerDate, { color: theme.colors.textSecondary }]}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
            </Text>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Ringkasan</Text>
          </View>
          <Pressable style={[styles.profileButton, { backgroundColor: mode === "dark" ? "#1C1C1E" : "#E5E5EA" }]}>
            <FontAwesome6 name="user" color={theme.colors.accent} size={20} />
          </Pressable>
        </View>

        <LinearGradient
          colors={mode === "dark" ? ["#1C1C1E", "#2C2C2E"] : ["#FFFFFF", "#F8F9FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>Kepatuhan Hari Ini</Text>
              <Text style={[styles.summarySubtitle, { color: theme.colors.textSecondary }]}>Tetap konsisten ya!</Text>
            </View>
            <LinearGradient
              colors={theme.colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientIconContainer}
            >
              <FontAwesome6 name="chart-pie" color="#FFFFFF" size={22} />
            </LinearGradient>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <LinearGradient
                colors={theme.colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 12 }}
              >
                <Text style={[styles.percentageText, { 
                  color: "#FFFFFF",
                  textShadowColor: 'rgba(0,0,0,0.1)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }]}>{adherencePercentage}%</Text>
              </LinearGradient>
              <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 12 }}>
                <Text style={[styles.percentageLabel, { color: theme.colors.textSecondary, fontSize: 16 }]}>tercapai</Text>
                <Text style={[styles.percentageSubtext, { color: theme.colors.textSecondary }]}>
                  {reminders.filter(r => r.status === 'taken' && (!r.repeatDays || r.repeatDays.includes(new Date().getDay()))).length} dari {reminders.filter(r => !r.repeatDays || r.repeatDays.includes(new Date().getDay())).length} dosis
                </Text>
              </View>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBackground, { 
                backgroundColor: mode === "dark" ? "#2C2C2E" : "#E5E5EA",
                shadowColor: mode === "dark" ? "#000" : "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: mode === "dark" ? 0.5 : 0.1,
                shadowRadius: 4,
                elevation: 2,
              }]}>
                <LinearGradient
                  colors={theme.colors.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { 
                    width: `${adherencePercentage}%`,
                    shadowColor: theme.colors.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                  }]}
                />
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
             <View style={styles.statItem}>
                <LinearGradient
                  colors={[mode === "dark" ? "rgba(0,122,255,0.3)" : "rgba(0,122,255,0.15)", mode === "dark" ? "rgba(0,122,255,0.1)" : "rgba(0,122,255,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statIconContainer}
                >
                  <FontAwesome6 name="calendar-check" color={theme.colors.accent} size={18} />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{reminders.filter(r => !r.repeatDays || r.repeatDays.includes(new Date().getDay())).length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Jadwal Hari Ini</Text>
             </View>
             <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: mode === "dark" ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingLeft: 20 }]}>
                <LinearGradient
                  colors={[mode === "dark" ? "rgba(52,199,89,0.3)" : "rgba(52,199,89,0.15)", mode === "dark" ? "rgba(52,199,89,0.1)" : "rgba(52,199,89,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statIconContainer}
                >
                  <FontAwesome6 name="check-circle" color="#34C759" size={18} />
                </LinearGradient>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{reminders.filter(r => r.status === 'taken' && (!r.repeatDays || r.repeatDays.includes(new Date().getDay()))).length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Diminum Hari Ini</Text>
             </View>
          </View>
        </LinearGradient>

        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Permintaan Koneksi</Text>
            </View>
            <View style={{ gap: 12, paddingHorizontal: 20 }}>
              {pendingRequests.map((request) => (
                <View 
                  key={request.id} 
                  style={[
                    styles.caregiverRow, 
                    { 
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 12,
                      backgroundColor: mode === "dark" ? "#1C1C1E" : "#FFFFFF",
                      borderRadius: 12
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' }}>
                    <View style={[styles.reminderIcon, { backgroundColor: mode === "dark" ? "#2C2C2E" : "#F2F2F7" }]}>
                      <FontAwesome6 name="user-nurse" color={theme.colors.accent} size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText weight="600" style={{ fontSize: 17 }}>{request.caregiverName}</ThemedText>
                      <ThemedText variant="caption" color="muted">{request.caregiverEmail}</ThemedText>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                    <Pressable 
                      style={{ flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: mode === "dark" ? "#2C2C2E" : "#F2F2F7" }}
                      onPress={() => handleRespondRequest(request.id, false)}
                    >
                      <ThemedText variant="caption" weight="600" style={{ color: "#FF3B30", fontSize: 15 }}>Tolak</ThemedText>
                    </Pressable>
                    <Pressable 
                      style={{ flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: theme.colors.accent }}
                      onPress={() => handleRespondRequest(request.id, true)}
                    >
                      <ThemedText variant="caption" weight="600" style={{ color: 'white', fontSize: 15 }}>Terima</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Dosis Berikutnya</Text>
            <Pressable onPress={() => setShowAddModal(true)}>
               <FontAwesome6 name="plus" color={theme.colors.accent} size={20} />
            </Pressable>
          </View>
          <View style={styles.cardContainer}>
            {nextReminder ? (
              <LinearGradient
                colors={mode === "dark" ? ["#1C1C1E", "#2C2C2E"] : ["#FFFFFF", "#F8F9FA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ borderRadius: 16 }}
              >
              <View style={styles.nextDoseRow}>
                <LinearGradient
                  colors={theme.colors.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pillIcon}
                >
                  <FontAwesome6 name="pills" color="#FFFFFF" size={24} />
                </LinearGradient>
                <View style={styles.nextDoseContent}>
                    <ThemedText variant="subheading" weight="600" style={{ fontSize: 19 }}>
                      {nextReminder.title}
                    </ThemedText>
                    <View style={[styles.dosageBadge, { backgroundColor: mode === "dark" ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.1)" }]}>
                      <ThemedText weight="600" style={{ fontSize: 14, color: theme.colors.accent }}>{nextReminder.dosage}</ThemedText>
                    </View>
                    {nextReminder.notes ? <ThemedText variant="caption" color="muted" style={{ marginTop: 4 }}>{nextReminder.notes}</ThemedText> : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <ThemedText variant="subheading" weight="600" style={{ fontSize: 19, color: theme.colors.accent }}>
                      {nextReminder.time}
                    </ThemedText>
                    <ThemedText variant="caption" color="muted">
                      hari ini
                    </ThemedText>
                  </View>
                </View>
                <LinearGradient
                  colors={theme.colors.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.primaryButton, { margin: 16, marginTop: 8 }]}
                >
                  <Pressable
                    style={{ paddingVertical: 12, alignItems: 'center', width: '100%' }}
                    onPress={handlePressConfirmButton}
                  >
                    <Text style={styles.primaryButtonText}>Udah minum obat</Text>
                  </Pressable>
                </LinearGradient>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={mode === "dark" ? ["#1C1C1E", "#2C2C2E"] : ["#FFFFFF", "#F8F9FA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ borderRadius: 16 }}
              >
                <View style={styles.emptyState}>
                  <FontAwesome6 name="calendar-plus" color={theme.colors.muted} size={48} />
                  <ThemedText color="muted" style={styles.emptyStateTitle}>Belum ada pengingat</ThemedText>
                  <ThemedText variant="caption" color="muted">Yuk, tambahin pengingat kamu untuk hari ini!</ThemedText>
                </View>
              </LinearGradient>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
             <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Timeline</Text>
             <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>7 Hari Terakhir</Text>
          </View>
          <LinearGradient
            colors={mode === "dark" ? ["#1C1C1E", "#2C2C2E"] : ["#FFFFFF", "#F8F9FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardContainer}
          >
            {adherenceData.length > 0 ? (
              <View style={styles.timelineRow}>
                {adherenceData.map((day, index) => {
                  const isToday = index === adherenceData.length - 1;
                  const percentage = Math.round(day.value);
                  return (
                    <View key={day.label} style={styles.timelineColumn}>
                      <View style={styles.timelineValueContainer}>
                        <Text style={[
                          styles.timelineValue,
                          { 
                            color: percentage >= 80 ? '#34C759' : percentage >= 50 ? theme.colors.accent : '#FF9500',
                            fontFamily: "Geist-Bold",
                          }
                        ]}>
                          {percentage}%
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.timelineBarContainer,
                          { 
                            backgroundColor: mode === "dark" ? "#2C2C2E" : "#F2F2F7",
                            borderWidth: isToday ? 2 : 0,
                            borderColor: theme.colors.accent,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={
                            percentage >= 80 
                              ? ['#34C759', '#30D158']
                              : percentage >= 50
                              ? theme.colors.gradient
                              : ['#FF9500', '#FFCC00']
                          }
                          start={{ x: 0, y: 1 }}
                          end={{ x: 0, y: 0 }}
                          style={[
                            styles.timelineBar,
                            {
                              height: `${Math.max(day.value, 5)}%`,
                              borderRadius: 8,
                              shadowColor: percentage >= 80 ? '#34C759' : percentage >= 50 ? theme.colors.accent : '#FF9500',
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.5,
                              shadowRadius: 6,
                            },
                          ]}
                        />
                      </View>
                      <View style={[
                        styles.timelineLabelContainer,
                        isToday && { 
                          backgroundColor: mode === "dark" ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.1)",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }
                      ]}>
                        <ThemedText 
                          variant="caption" 
                          weight={isToday ? "600" : "500"}
                          style={[
                            styles.timelineLabel,
                            { color: isToday ? theme.colors.accent : theme.colors.textSecondary }
                          ]}
                        >
                          {day.label}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome6 name="chart-line" color={theme.colors.muted} size={48} />
                <ThemedText color="muted" style={styles.emptyStateTitle}>Belum ada data</ThemedText>
                <ThemedText variant="caption" color="muted">Mulai minum obat buat lihat timeline</ThemedText>
              </View>
            )}
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Jadwal Obat</Text>
            {reminders.length > 3 && (
               <Pressable onPress={() => setShowAllReminders(true)}>
                  <Text style={{ color: theme.colors.accent, fontSize: 17 }}>Lihat Semua</Text>
               </Pressable>
            )}
          </View>
          <LinearGradient
            colors={mode === "dark" ? ["#1C1C1E", "#2C2C2E"] : ["#FFFFFF", "#F8F9FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardContainer}
          >
            {(() => {
              if (loading) {
                return (
                  <View style={{ padding: 20 }}>
                    <ReminderShimmer />
                  </View>
                );
              }
              
              if (reminders.length > 0) {
                return (
                  <View style={styles.remindersList}>
                    {(reminders.length > 3 ? reminders.slice(0, 3) : reminders).map((item, index, arr) => (
                      <View
                        key={item.id}
                        style={[
                          styles.reminderRow,
                          {
                            borderBottomWidth: index === arr.length - 1 ? 0 : 0.5,
                            borderBottomColor: mode === "dark" ? 'rgba(255,255,255,0.1)' : '#C6C6C8',
                          },
                        ]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                          <LinearGradient
                            colors={[
                              mode === "dark" ? "rgba(0,122,255,0.3)" : "rgba(0,122,255,0.15)",
                              mode === "dark" ? "rgba(0,122,255,0.1)" : "rgba(0,122,255,0.05)"
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.reminderIcon}
                          >
                            <FontAwesome6 name="clock" color={theme.colors.accent} size={16} />
                          </LinearGradient>
                          <View style={{ flex: 1 }}>
                            <ThemedText weight="600" style={{ fontSize: 17 }}>{item.title}</ThemedText>
                            {item.notes ? <ThemedText color="muted" style={{ fontSize: 13 }}>{item.notes}</ThemedText> : null}
                            {item.repeatDays && item.repeatDays.length < 7 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                {item.repeatDays.sort((a: number, b: number) => a - b).map((day: number) => (
                                  <View key={day} style={{ backgroundColor: mode === "dark" ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <ThemedText style={{ fontSize: 11, color: theme.colors.accent }}>
                                      {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][day]}
                                    </ThemedText>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <ThemedText style={{ fontSize: 17, color: theme.colors.textPrimary }}>{item.time}</ThemedText>
                            <Text style={[styles.statusChip, styles[item.status as keyof typeof styles]]}>{item.status}</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            onPress={() => handleStartEdit(item)}
                            style={{
                              padding: 8,
                              backgroundColor: mode === "dark" ? "#2C2C2E" : "#F2F2F7",
                              borderRadius: 8,
                            }}
                          >
                            <FontAwesome6 name="pen" size={12} color={theme.colors.accent} />
                          </Pressable>
                          <Pressable
                            onPress={() => confirmDelete(item)}
                            style={{
                              padding: 8,
                              backgroundColor: "rgba(255,59,48,0.1)",
                              borderRadius: 8,
                            }}
                          >
                            <FontAwesome6 name="trash" size={12} color="#FF3B30" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }
              
              return (
                <View style={styles.emptyState}>
                  <FontAwesome6 name="clock" color={theme.colors.muted} size={48} />
                  <ThemedText color="muted" style={styles.emptyStateTitle}>Belum ada jadwal</ThemedText>
                  <ThemedText variant="caption" color="muted">Tambahin pengingat obat buat lihat jadwal</ThemedText>
                </View>
              );
            })()}
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
             <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Caregiver</Text>
          </View>
          <LinearGradient
            colors={mode === "dark" ? ["#1C1C1E", "#2C2C2E"] : ["#FFFFFF", "#F8F9FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardContainer}
          >
            {(() => {
              // Get connected caregivers from the array field
              const connectedCaregivers = caregivers.length > 0 ? caregivers : [];
              
              if (connectedCaregivers.length > 0) {
                return connectedCaregivers.map((caregiver: any) => (
                  <View key={caregiver.id || caregiver['0']} style={[styles.caregiverRow, { padding: 16, marginBottom: 0, shadowOpacity: 0 }]}>
                    <LinearGradient
                      colors={theme.colors.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <FontAwesome6 name="user-nurse" color="#FFFFFF" size={16} />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <ThemedText weight="600" style={{ fontSize: 17 }}>{caregiver.name || caregiver.caregiverName || 'Caregiver'}</ThemedText>
                      <ThemedText variant="caption" color="muted">{caregiver.email || caregiver.caregiverEmail || 'Terhubung'}</ThemedText>
                    </View>
                    <View style={{ backgroundColor: 'rgba(52,199,89,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759' }} />
                      <ThemedText variant="caption" weight="600" style={{ color: '#34C759', fontSize: 12 }}>Aktif</ThemedText>
                    </View>
                  </View>
                ));
              }
              
              return (
                <View style={{ paddingVertical: 16 }}>
                  <ThemedText color="muted" style={{ textAlign: 'center' }}>Belum ada caregiver terhubung</ThemedText>
                </View>
              );
            })()}
            <View style={[styles.caregiverActions, { borderTopColor: mode === "dark" ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Pressable onPress={handleViewHistory} style={{ flex: 1 }}>
                <View style={[styles.caregiverAction, { backgroundColor: 'transparent' }]}>
                  <FontAwesome6 name="chart-line" color={theme.colors.accent} size={16} />
                  <ThemedText variant="caption" weight="600" style={{ color: theme.colors.accent, fontSize: 15 }}>Riwayat konsumsi</ThemedText>
                </View>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      <ConfirmMedicationModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => handleConfirmMedication()}
        medicationName={nextReminder?.title}
        loading={isConfirming}
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
      />

      <MedicationHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        medicationHistory={medicationHistory}
        onClearAll={() => {
          showAlert(
            "Hapus Semua Riwayat",
            "Yakin mau hapus semua riwayat konsumsi obat? Tindakan ini tidak bisa dibatalkan.",
            [
              { text: "Batal", style: "cancel" },
              {
                text: "Hapus Semua",
                style: "destructive",
                onPress: async () => {
                  const success = await clearMedicationHistory();
                  if (success) {
                    setMedicationHistory([]);
                    setShowHistoryModal(false);
                    showAlert(
                      "Berhasil",
                      "Semua riwayat sudah dihapus",
                      [{ text: "OK" }],
                      "check-circle",
                      "#10D99D"
                    );
                  } else {
                    showAlert(
                      "Error",
                      "Gagal menghapus riwayat",
                      [{ text: "OK" }],
                      "triangle-exclamation",
                      "#FF8585"
                    );
                  }
                },
              },
            ],
            "trash",
            theme.colors.danger
          );
        }}
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
        onDelete={(reminderId) => {
          const item = reminders.find(r => r.id === reminderId);
          if (item) {
            confirmDelete(item);
          }
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 34,
    letterSpacing: 0.3,
    fontFamily: "Geist-Bold",
  },
  headerDate: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: "Geist-SemiBold",
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E5EA",
  },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  gradientIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  progressContainer: {
    gap: 16,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 14,
    borderRadius: 7,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    marginBottom: 4,
    fontFamily: "Geist-SemiBold",
  },
  summarySubtitle: {
    fontSize: 14,
    fontFamily: "Geist",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  percentageText: {
    fontSize: 44,
    letterSpacing: -1.5,
    lineHeight: 52,
    fontFamily: "Geist-Bold",
  },
  percentageLabel: {
    fontSize: 15,
    fontFamily: "Geist-SemiBold",
  },
  percentageSubtext: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Geist",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  statItem: {
    flex: 1,
    gap: 6,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Geist-Bold",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Geist-Medium",
    lineHeight: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 22,
    letterSpacing: 0.3,
    fontFamily: "Geist-Bold",
  },
  sectionSubtitle: {
    fontSize: 15,
    fontFamily: "Geist-Medium",
  },
  cardContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  dosageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  nextDoseRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    padding: 16,
  },
  nextDoseContent: {
    flex: 1,
    gap: 4,
  },
  pillIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateTitle: {
    marginTop: 8,
    fontSize: 17,
    fontFamily: "Geist-SemiBold",
  },
  primaryButton: {
    margin: 16,
    marginTop: 0,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Geist-SemiBold",
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    padding: 20,
    paddingBottom: 16,
  },
  timelineColumn: {
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  timelineValueContainer: {
    minHeight: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineValue: {
    fontSize: 13,
    fontFamily: "Geist-Bold",
  },
  timelineBarContainer: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  timelineBar: {
    borderRadius: 8,
    width: "100%",
  },
  timelineLabelContainer: {
    minHeight: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLabel: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Geist-Medium",
  },
  remindersList: {
    gap: 0,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statusChip: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    textTransform: "capitalize",
    fontSize: 12,
    fontFamily: "Geist-SemiBold",
  },
  scheduled: {
    backgroundColor: "rgba(0,122,255,0.1)",
    color: "#007AFF",
  },
  taken: {
    backgroundColor: "rgba(52,199,89,0.1)",
    color: "#34C759",
  },
  missed: {
    backgroundColor: "rgba(255,59,48,0.1)",
    color: "#FF3B30",
  },
  caregiverRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  caregiverActions: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  caregiverAction: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
});
