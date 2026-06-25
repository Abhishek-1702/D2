// src/firebase.js

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

console.log("Project ID:", firebaseConfig.projectId);
console.log("Firebase Configured:", isFirebaseConfigured);

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.error("Firebase init error:", e);
  }
}

export { auth, db };

// ======================
// AUTH
// ======================

export async function registerWithEmailPassword(email, password) {
  if (!auth) throw new Error("Firebase Auth not initialized");

  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
}

export async function signInWithEmailPassword(email, password) {
  if (!auth) throw new Error("Firebase Auth not initialized");

  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
}

export async function signOutUser() {
  if (!auth) return;
  await fbSignOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

// ======================
// MEETINGS
// ======================

export async function saveMeetingToFirestore(meeting) {
  if (!db) throw new Error("Firestore not initialized");

  const col = collection(db, "meetings");

  const docRef = await addDoc(col, {
    ...meeting,
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

export async function loadMeetingsFromFirestore() {
  if (!db) throw new Error("Firestore not initialized");

  const col = collection(db, "meetings");
  const q = query(col, orderBy("createdAt", "desc"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();

    const createdAt =
      data.createdAt?.toDate?.();

    return {
      id: docSnap.id,
      ...data,
      createdAt: createdAt
        ? createdAt.toISOString()
        : null
    };
  });
}

export async function deleteMeetingFromFirestore(meetingId) {
  if (!db) throw new Error("Firestore not initialized");

  await deleteDoc(
    doc(db, "meetings", meetingId)
  );
}

// ======================
// PROJECT LINKS
// ======================

export async function addProjectLink(projectId, link) {
  if (!db) throw new Error("Firestore not initialized");

  await setDoc(
    doc(db, "projects", String(projectId)),
    {
      links: arrayUnion(link)
    },
    { merge: true }
  );
}

export async function removeProjectLink(projectId, link) {
  if (!db) throw new Error("Firestore not initialized");

  await updateDoc(
    doc(db, "projects", String(projectId)),
    {
      links: arrayRemove(link)
    }
  );
}

export async function loadProjectLinks(projectId) {
  if (!db) throw new Error("Firestore not initialized");

  const snap = await getDoc(
    doc(db, "projects", String(projectId))
  );

  if (!snap.exists()) return [];

  return snap.data().links || [];
}

export async function setProjectPpt(
  projectId,
  url,
  name
) {
  if (!db) throw new Error("Firestore not initialized");

  await setDoc(
    doc(db, "projects", String(projectId)),
    {
      ppt: url,
      pptName: name
    },
    { merge: true }
  );
}

export async function loadProjectData(projectId) {
  if (!db) throw new Error("Firestore not initialized");

  const snap = await getDoc(
    doc(db, "projects", String(projectId))
  );

  if (!snap.exists()) return {};

  return snap.data();
}