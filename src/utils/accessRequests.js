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
  // try remote first
  try {
    const remote = await readSharedJsonFile("app-data/access-requests.json");
    if (Array.isArray(remote)) return remote;
  } catch (e) {
    // ignore
  }
  return readLocal();
}

export async function writeRequests(list) {
  // write local copy
  writeLocal(list);
  try {
    await writeSharedJsonFile("app-data/access-requests.json", list);
  } catch (e) {
    // ignore
  }
  return list;
}

export async function addRequest(entry) {
  const list = await readRequests();
  const filtered = list.filter((item) => {
    if (item.email !== entry.email) return true;
    return item.status === 'rejected' ? false : true;
  });
  const next = [entry, ...filtered];
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
