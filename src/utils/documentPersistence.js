import { isSupabaseConfigured, supabase } from "../supabase";

const STORAGE_KEY = "kesco_section_documents_v1";

function normalizeSectionDocument(document, sectionType, sectionId) {
  if (!document || typeof document !== "object") return document;
  return {
    ...document,
    sectionType: sectionType || document.sectionType || null,
    sectionId: sectionId || document.sectionId || null,
  };
}

function matchesSectionScope(document, sectionType, sectionId) {
  if (!document || typeof document !== "object") return false;

  const docSectionType = document.sectionType || document.section || null;
  const docSectionId = document.sectionId ?? document.section_id ?? document.scopeId ?? null;

  // If a sectionType is requested, the document must declare a matching sectionType.
  if (sectionType) {
    if (!docSectionType) return false;
    if (docSectionType !== sectionType) return false;
  }

  // If a sectionId is requested, the document must declare a matching sectionId.
  if (sectionId != null) {
    if (docSectionId == null) return false;
    if (String(docSectionId) !== String(sectionId)) return false;
  }

  return true;
}

function readStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Failed to read document store", error);
    return {};
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Failed to write document store", error);
  }
}

export function getSectionDocuments(sectionType, sectionId) {
  const store = readStore();
  const key = `${sectionType}:${sectionId}`;
  const documents = Array.isArray(store[key]) ? store[key] : [];
  return documents.filter((document) => matchesSectionScope(document, sectionType, sectionId));
}

export function saveSectionDocuments(sectionType, sectionId, documents) {
  const store = readStore();
  const key = `${sectionType}:${sectionId}`;
  const normalizedDocuments = Array.isArray(documents)
    ? documents.map((document) => normalizeSectionDocument(document, sectionType, sectionId))
    : [];
  store[key] = normalizedDocuments;
  writeStore(store);
  return store[key];
}

export function mergeSectionDocuments(remoteDocuments, fallbackDocuments, sectionType = null, sectionId = null) {
  const remote = Array.isArray(remoteDocuments) ? remoteDocuments : [];
  const fallback = Array.isArray(fallbackDocuments) ? fallbackDocuments : [];
  const merged = [];
  const seen = new Set();

  [...remote, ...fallback].forEach((doc) => {
    if (!doc || !doc.id || seen.has(doc.id)) return;
    if (!matchesSectionScope(doc, sectionType, sectionId)) return;
    seen.add(doc.id);
    merged.push(normalizeSectionDocument(doc, sectionType, sectionId));
  });

  return merged;
}

export function appendSectionDocument(sectionType, sectionId, document) {
  const existing = getSectionDocuments(sectionType, sectionId);
  const scopedDocument = normalizeSectionDocument(document, sectionType, sectionId);
  const next = [scopedDocument, ...existing.filter((item) => item.id !== scopedDocument.id)];
  saveSectionDocuments(sectionType, sectionId, next);
  return next;
}

export function removeSectionDocument(sectionType, sectionId, documentId) {
  const existing = getSectionDocuments(sectionType, sectionId);
  const next = existing.filter((item) => item.id !== documentId);
  saveSectionDocuments(sectionType, sectionId, next);
  return next;
}

export function buildUploadedDocument(file, url, path = null, uploadedAt = new Date().toISOString(), sectionType = null, sectionId = null) {
  return {
    id: `${Date.now()}-${(file.name || "file").replace(/\s+/g, "-")}`,
    name: file.name || "Untitled file",
    size: file.size || 0,
    type: file.type || "application/octet-stream",
    url,
    path,
    uploadedAt,
    sectionType,
    sectionId,
  };
}

export function getStoragePathFromUrl(url) {
  if (!url) return null;
  try {
    const decoded = decodeURIComponent(url);
    const marker = /\/storage\/v1\/object\/public\/[^/]+\//;
    const match = decoded.match(marker);
    if (!match) return null;
    const afterMarker = decoded.slice(decoded.indexOf(match[0]) + match[0].length);
    return afterMarker.split("?")[0].replace(/^\/+/, "");
  } catch (error) {
    console.error("Failed to parse storage path", error);
    return null;
  }
}

export async function readSharedJsonFile(filePath) {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.storage.from("Documents").download(filePath);
    if (error || !data) return null;
    const text = await data.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to read shared JSON", error);
    return null;
  }
}

export async function writeSharedJsonFile(filePath, value) {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = JSON.stringify(value);
    const blob = new Blob([payload], { type: "application/json" });
    const { error } = await supabase.storage.from("Documents").upload(filePath, blob, {
      upsert: true,
      contentType: "application/json",
    });
    return !error;
  } catch (error) {
    console.error("Failed to write shared JSON", error);
    return false;
  }
}

export async function readUserProfilesFile() {
  const data = await readSharedJsonFile("app-data/user-profiles.json");
  return data && typeof data === "object" ? data : {};
}

export async function writeUserProfilesFile(profiles) {
  return writeSharedJsonFile("app-data/user-profiles.json", profiles);
}

export function formatTimestamp(value) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isAdminUser(user) {
  return Boolean(user?.email);
}
