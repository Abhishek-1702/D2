import { readSharedJsonFile, writeSharedJsonFile } from "./documentPersistence";

const STORAGE_KEY = "kesco_access_requests_v1";

function readLocal() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("readLocal access requests failed", e);
    return [];
  }
}

function writeLocal(list) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("writeLocal access requests failed", e);
    return false;
  }
}

export async function readRequests() {
  try {
    const remote = await readSharedJsonFile("app-data/access-requests.json");
    if (Array.isArray(remote)) {
      writeLocal(remote);
      return remote;
    }
  } catch (e) {
    // ignore remote failure and fall back to local cache
  }
  return readLocal();
}

export async function writeRequests(list) {
  writeLocal(list);
  try {
    await writeSharedJsonFile("app-data/access-requests.json", list);
  } catch (e) {
    console.error('Failed to persist access requests to shared storage', e);
  }
  return list;
}

export async function addRequest(entry) {
  const list = await readRequests();
  const hasPending = list.some((item) => item.email === entry.email && item.status === 'pending');
  if (hasPending) {
    throw new Error('A pending request already exists for this email.');
  }

  const next = [entry, ...list.filter((item) => item.email !== entry.email)];
  await writeRequests(next);
  return next;
}

export async function clearAllRequests() {
  const cleared = [];
  writeLocal(cleared);
  try {
    await writeSharedJsonFile("app-data/access-requests.json", cleared);
  } catch (e) {
    // ignore
  }
  return cleared;
}

export async function updateRequestStatus(email, status) {
  const list = await readRequests();
  const next = list.map((r) => (r.email === email ? { ...r, status } : r));
  await writeRequests(next);
  return next;
}

export async function getRequestByEmail(email) {
  const list = await readRequests();
  return list.find((r) => r.email === email) || null;
}

const accessRequestsAPI = {
  readRequests,
  writeRequests,
  addRequest,
  updateRequestStatus,
  getRequestByEmail,
};

export default accessRequestsAPI;
