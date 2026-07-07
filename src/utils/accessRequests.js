import { isSupabaseConfigured, supabase } from "../supabase";
import { readSharedJsonFile, writeSharedJsonFile } from "./documentPersistence";

const STORAGE_KEY = "kesco_access_requests_v1";
const SYNC_KEY = "kesco_access_requests_sync_v1";

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

function dispatchRequestUpdateEvent(list) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("kesco-access-requests-updated", { detail: { requests: list } }));
}

function writeSyncKey() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SYNC_KEY, String(Date.now()));
  } catch (e) {
    console.error("Failed to update access request sync key", e);
  }
}

function parseTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeRequestEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const email = String(entry.email || '').trim().toLowerCase();
  if (!email) return null;
  const createdAt = entry.createdAt || entry.createdat || new Date().toISOString();
  const updatedAt = entry.updatedAt || entry.updatedat || createdAt;
  return {
    ...entry,
    id: entry.id || `${Date.now()}-${email.replace(/[^a-z0-9]/g, '-')}`,
    email,
    status: entry.status || 'pending',
    createdAt,
    updatedAt,
  };
}

function mergeRequests(local, remote) {
  const all = Array.isArray(local) ? local : [];
  const remoteList = Array.isArray(remote) ? remote : [];
  const requestsByEmail = new Map();

  [...all, ...remoteList].forEach((item) => {
    const normalized = normalizeRequestEntry(item);
    if (!normalized) return;
    const existing = requestsByEmail.get(normalized.email);
    if (!existing) {
      requestsByEmail.set(normalized.email, normalized);
      return;
    }

    const existingTime = parseTimestamp(existing.updatedAt || existing.createdAt);
    const incomingTime = parseTimestamp(normalized.updatedAt || normalized.createdAt);
    if (incomingTime > existingTime) {
      requestsByEmail.set(normalized.email, normalized);
    } else if (incomingTime === existingTime) {
      if (existing.status === 'pending' && normalized.status !== 'pending') {
        requestsByEmail.set(normalized.email, normalized);
      }
    }
  });

  return Array.from(requestsByEmail.values()).sort((a, b) => parseTimestamp(b.updatedAt || b.createdAt) - parseTimestamp(a.updatedAt || a.createdAt));
}

function writeLocal(list, notify = true) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    writeSyncKey();
    if (notify) {
      dispatchRequestUpdateEvent(list);
    }
    return true;
  } catch (e) {
    console.error("writeLocal access requests failed", e);
    return false;
  }
}

async function readRemoteRequestsFromSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    console.debug("Supabase not configured, skipping remote access request read.");
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("access_requests")
      .select("*")
      .order("updatedat", { ascending: false });

    if (error) {
      console.error("Failed to read access requests from Supabase", error);
      return null;
    }

    const normalized = Array.isArray(data) ? data.map(normalizeRequestEntry).filter(Boolean) : [];
    console.debug("Supabase access requests loaded", normalized.length, "records");
    return normalized;
  } catch (error) {
    console.error("Unexpected Supabase access requests read error", error);
    return null;
  }
}

async function writeRemoteRequestsToSupabase(list) {
  if (!isSupabaseConfigured || !supabase) {
    console.debug("Supabase not configured, skipping remote access request write.");
    return null;
  }
  const normalized = (Array.isArray(list) ? list : []).map(normalizeRequestEntry).filter(Boolean);
  console.debug("Writing access requests to Supabase", normalized.length, "records");
  try {
    // Map fields to the Supabase table column names (lowercase) to avoid schema errors
    const remoteRows = normalized.map((r) => ({
      id: r.id,
      name: r.name || null,
      mobile: r.mobile || null,
      email: r.email || null,
      designation: r.designation || null,
      office: r.office || null,
      status: r.status || null,
      createdat: r.createdAt || r.createdat || new Date().toISOString(),
      updatedat: r.updatedAt || r.updatedat || r.createdAt || new Date().toISOString(),
      rawdesignation: r.rawDesignation || r.rawdesignation || null,
    }));

    const { error } = await supabase.from("access_requests").upsert(remoteRows, { onConflict: "email" });
    if (error) {
      console.error("Failed to write access requests to Supabase", error);
      return null;
    }
    console.debug("Supabase access requests upsert succeeded");
    return normalized;
  } catch (error) {
    console.error("Unexpected Supabase access requests write error", error);
    return null;
  }
}

async function readRemoteRequests() {
  const dbResult = await readRemoteRequestsFromSupabase();
  if (dbResult !== null) {
    return dbResult;
  }

  // If Supabase is configured but the read failed, avoid falling back to the
  // potentially stale shared JSON file. This prevents old requests from being
  // re-introduced when remote DB has intermittent errors.
  if (isSupabaseConfigured) {
    console.warn('Supabase is configured but remote read failed; skipping shared file fallback to avoid stale data.');
    return null;
  }

  try {
    const remote = await readSharedJsonFile("app-data/access-requests.json");
    if (!Array.isArray(remote)) {
      return null;
    }
    return remote.map(normalizeRequestEntry).filter(Boolean);
  } catch (e) {
    console.error('Failed to read remote access requests from shared file', e);
    return null;
  }
}

async function writeRemoteRequests(list) {
  const dbResult = await writeRemoteRequestsToSupabase(list);
  if (dbResult !== null) {
    return dbResult;
  }

  const normalized = (Array.isArray(list) ? list : []).map(normalizeRequestEntry).filter(Boolean);
  try {
    await writeSharedJsonFile("app-data/access-requests.json", normalized);
  } catch (e) {
    console.error('Failed to persist access requests to shared storage', e);
  }
  return normalized;
}

export async function readRequests() {
  const local = readLocal();
  const remote = await readRemoteRequests();
  if (remote !== null) {
    const merged = mergeRequests(local, remote);
    if (JSON.stringify(merged) !== JSON.stringify(local)) {
      writeLocal(merged, false);
    }
    if (JSON.stringify(merged) !== JSON.stringify(remote)) {
      await writeRemoteRequests(merged);
    }
    if (JSON.stringify(merged) !== JSON.stringify(local)) {
      dispatchRequestUpdateEvent(merged);
    }
    return merged;
  }
  return local;
}

export function readCachedRequests() {
  return readLocal();
}

export async function writeRequests(list) {
  const normalized = (Array.isArray(list) ? list : []).map(normalizeRequestEntry).filter(Boolean);
  console.debug("Persisting access requests locally", normalized.length, "records");
  writeLocal(normalized);
  const remoteResult = await writeRemoteRequests(normalized);
  if (remoteResult === null) {
    console.warn("Remote access requests persistence failed, local copy only.");
  }
  return normalized;
}

export async function addRequest(entry) {
  const list = await readRequests();
  const normalizedEntry = normalizeRequestEntry({
    ...entry,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.debug("Adding access request", normalizedEntry.email, normalizedEntry);
  const hasPending = list.some((item) => item.email === normalizedEntry.email && item.status === 'pending');
  if (hasPending) {
    throw new Error('A pending request already exists for this email.');
  }

  const next = [normalizedEntry, ...list.filter((item) => item.email !== normalizedEntry.email)];
  await writeRequests(next);
  return next;
}

export async function clearAllRequests() {
  const list = await readRequests();
  // Remove only pending requests when clearing all from the UI.
  // Rejected and approved records are preserved for manual review/deletion.
  const next = list.filter((r) => r.status !== 'pending');
  await writeRequests(next);
  return next;
}

export async function deleteRequest(identifier) {
  const list = await readRequests();
  const next = list.filter((r) => (r.id !== identifier && r.email !== identifier));
  await writeRequests(next);
  return next;
}

export async function updateRequestStatus(email, status) {
  const list = await readRequests();
  const next = list.map((r) => (r.email === email ? { ...normalizeRequestEntry(r), status, updatedAt: new Date().toISOString() } : normalizeRequestEntry(r)));
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

export async function forceRemoteSync() {
  try {
    const remote = await readRemoteRequestsFromSupabase();
    if (remote === null) {
      console.warn('forceRemoteSync: remote read returned null');
      return null;
    }

    const local = readLocal();
    const merged = mergeRequests(local, remote);
    await writeRequests(merged);
    console.debug('forceRemoteSync: merged and wrote', merged.length, 'records');
    return merged;
  } catch (error) {
    console.error('forceRemoteSync failed', error);
    return null;
  }
}
