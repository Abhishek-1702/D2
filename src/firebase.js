// src/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, serverTimestamp, deleteDoc, doc, getDocs, query, orderBy, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged } from "firebase/auth";



const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.storageBucket);

let app = null;
let storage = null;
let db = null;
let auth = null;


if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.error("Firebase init error:", e);
    app = null;
    auth = null;
  }
}

export { auth, db };

export async function registerWithEmailPassword(email, password) {
  if (!auth) throw new Error('Firebase Auth not initialized');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signInWithEmailPassword(email, password) {
  if (!auth) throw new Error('Firebase Auth not initialized');
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signOutUser() {
  if (!auth) return;
  await fbSignOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) return () => { };
  return onAuthStateChanged(auth, callback);
}

export async function uploadFileToStorage(file, pathPrefix = "meetings") {
  if (!storage) throw new Error("Firebase Storage not initialized");
  const name = `${Date.now()}_${file.name}`;
  const ref = storageRef(storage, `${pathPrefix}/${name}`);
  const metadata = { contentType: file.type || "application/octet-stream" };

  // Use resumable upload for better reliability and progress handling
  const uploadTask = uploadBytesResumable(ref, file, metadata);

  const snapshot = await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      () => { },
      (error) => reject(error),
      () => resolve(uploadTask.snapshot)
    );
  });

  const url = await getDownloadURL(snapshot.ref);
  return { name: file.name, size: file.size, type: file.type, url };
}

export async function saveMeetingToFirestore(meeting) {
  if (!db) throw new Error("Firestore not initialized");
  const col = collection(db, "meetings");
  const docRef = await addDoc(col, { ...meeting, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function loadMeetingsFromFirestore() {
  if (!db) throw new Error("Firestore not initialized");
  const col = collection(db, "meetings");
  const q = query(col, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const createdAt = data.createdAt?.toDate?.();
    return {
      id: docSnap.id,
      ...data,
      createdAt: createdAt ? createdAt.toISOString() : null,
    };
  });
}

export async function deleteMeetingFromFirestore(meetingId) {
  if (!db) throw new Error("Firestore not initialized");
  const d = doc(db, 'meetings', meetingId);
  await deleteDoc(d);
}

// Project links persistence helpers
export async function addProjectLink(projectId, link) {
  if (!db) throw new Error("Firestore not initialized");
  const d = doc(db, 'projects', String(projectId));
  await setDoc(d, { links: arrayUnion(link) }, { merge: true });
}

export async function removeProjectLink(projectId, link) {
  if (!db) throw new Error("Firestore not initialized");
  const d = doc(db, 'projects', String(projectId));
  await updateDoc(d, { links: arrayRemove(link) });
}

export async function loadProjectLinks(projectId) {
  if (!db) throw new Error("Firestore not initialized");
  const d = doc(db, 'projects', String(projectId));
  const snap = await getDoc(d);
  if (!snap.exists()) return [];
  const data = snap.data();
  return data.links || [];
}

export async function setProjectPpt(projectId, url, name) {
  if (!db) throw new Error("Firestore not initialized");
  const d = doc(db, 'projects', String(projectId));
  await setDoc(d, { ppt: url, pptName: name }, { merge: true });
}

export async function loadProjectData(projectId) {
  if (!db) throw new Error("Firestore not initialized");
  const d = doc(db, 'projects', String(projectId));
  const snap = await getDoc(d);
  if (!snap.exists()) return {};
  return snap.data();
}