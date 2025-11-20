import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface ConnectionRequest {
  id: string;
  caregiverId: string;
  caregiverName: string;
  caregiverEmail: string;
  patientId: string;
  patientEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ConnectedUser {
  uid: string;
  email: string;
  name: string;
  role: 'patient' | 'caregiver';
}

export const sendConnectionRequest = async (
  caregiverId: string, 
  caregiverName: string, 
  caregiverEmail: string, 
  patientEmail: string
) => {
  try {
    // 1. Find the patient by email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", patientEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("User not found");
    }

    const patientDoc = querySnapshot.docs[0];
    const patientData = patientDoc.data();

    if (patientData.role !== 'patient') {
      throw new Error("User is not a patient");
    }

    // 2. Check if request already exists
    const requestsRef = collection(db, "caregiver_requests");
    const existingRequestQuery = query(
      requestsRef, 
      where("caregiverId", "==", caregiverId),
      where("patientId", "==", patientDoc.id),
      where("status", "==", "pending")
    );
    const existingDocs = await getDocs(existingRequestQuery);

    if (!existingDocs.empty) {
      throw new Error("Request already pending");
    }
    
    // Check if already connected
    if (patientData.caregivers && patientData.caregivers.includes(caregiverId)) {
        throw new Error("Already connected to this patient");
    }

    // 3. Create request
    await addDoc(requestsRef, {
      caregiverId,
      caregiverName,
      caregiverEmail,
      patientId: patientDoc.id,
      patientEmail: patientData.email,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending request:", error);
    return { success: false, error: error.message };
  }
};

export const getPendingRequests = async (patientId: string) => {
  try {
    const requestsRef = collection(db, "caregiver_requests");
    const q = query(
      requestsRef, 
      where("patientId", "==", patientId),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ConnectionRequest[];
  } catch (error) {
    console.error("Error fetching requests:", error);
    return [];
  }
};

export const respondToConnectionRequest = async (requestId: string, accept: boolean) => {
  try {
    const requestRef = doc(db, "caregiver_requests", requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error("Request not found");
    }

    const requestData = requestSnap.data() as ConnectionRequest;
    const batch = writeBatch(db);

    // Update request status
    batch.update(requestRef, { 
      status: accept ? 'accepted' : 'rejected' 
    });

    if (accept) {
      // Add caregiver to patient's caregivers list
      const patientRef = doc(db, "users", requestData.patientId);
      batch.update(patientRef, {
        caregivers: arrayUnion(requestData.caregiverId)
      });

      // Add patient to caregiver's patients list
      const caregiverRef = doc(db, "users", requestData.caregiverId);
      batch.update(caregiverRef, {
        patients: arrayUnion(requestData.patientId)
      });
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error responding to request:", error);
    return { success: false, error: error.message };
  }
};

export const getConnectedPatients = async (caregiverId: string) => {
  try {
    const caregiverRef = doc(db, "users", caregiverId);
    const caregiverSnap = await getDoc(caregiverRef);
    
    if (!caregiverSnap.exists()) return [];
    
    const patientIds = caregiverSnap.data().patients || [];
    if (patientIds.length === 0) return [];

    // Fetch patient details
    // Note: In a real app with many patients, we might want to paginate or query differently
    // Firestore 'in' query supports up to 10 items. For now we'll fetch individually or use 'in' chunks.
    // For simplicity, let's fetch individually for now as the list is likely small.
    
    const patients = [];
    for (const pid of patientIds) {
        const pDoc = await getDoc(doc(db, "users", pid));
        if (pDoc.exists()) {
            patients.push(pDoc.data());
        }
    }
    
    return patients as ConnectedUser[];
  } catch (error) {
    console.error("Error fetching connected patients:", error);
    return [];
  }
};
