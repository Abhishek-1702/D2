import { isSupabaseConfigured, supabase } from "../supabase";

const STORAGE_KEY = "kesco_section_documents_v1";

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
  return Array.isArray(store[key]) ? store[key] : [];
}

export function saveSectionDocuments(sectionType, sectionId, documents) {
  const store = readStore();
  const key = `${sectionType}:${sectionId}`;
  store[key] = Array.isArray(documents) ? documents : [];
  writeStore(store);
  return store[key];
}

export function appendSectionDocument(sectionType, sectionId, document) {
  const existing = getSectionDocuments(sectionType, sectionId);
  const next = [document, ...existing.filter((item) => item.id !== document.id)];
  saveSectionDocuments(sectionType, sectionId, next);
  return next;
}

export function removeSectionDocument(sectionType, sectionId, documentId) {
  const existing = getSectionDocuments(sectionType, sectionId);
  const next = existing.filter((item) => item.id !== documentId);
  saveSectionDocuments(sectionType, sectionId, next);
  return next;
}

export function buildUploadedDocument(file, url, path = null, uploadedAt = new Date().toISOString()) {
  return {
    id: `${Date.now()}-${(file.name || "file").replace(/\s+/g, "-")}`,
    name: file.name || "Untitled file",
    size: file.size || 0,
    type: file.type || "application/octet-stream",
    url,
    path,
    uploadedAt,
  };
}

export function getStoragePathFromUrl(url) {
  if (!url) return null;
  try {
    const decoded = decodeURIComponent(url);
    const marker = "/storage/v1/object/public/Documents/";
    const startIndex = decoded.indexOf(marker);
    if (startIndex < 0) return null;
    const afterMarker = decoded.slice(startIndex + marker.length);
    return afterMarker.split("?")[0];
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
