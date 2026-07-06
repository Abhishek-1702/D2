import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function normalizeStoragePath(filePath) {
  if (!filePath) {
    return "";
  }

  const cleaned = String(filePath).replace(/^\/+|\/+$/g, "");
  if (!cleaned) {
    return "";
  }

  const parts = cleaned.split("/").filter(Boolean);
  if (!parts.length) {
    return "";
  }

  if (parts[0].toLowerCase() === "documents") {
    return parts.slice(1).join("/");
  }

  return parts.join("/");
}

function buildStoragePath(folder, fileName) {
  const normalizedFolder = normalizeStoragePath(folder || "documents");
  const normalizedFileName = String(fileName || "file").replace(/^\/+|\/+$/g, "");
  const stem = normalizedFolder ? `documents/${normalizedFolder}` : "documents";
  return `${stem}/${normalizedFileName}`;
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFileToStorage(
  file,
  folder = "Documents"
) {
  if (!supabase) {
    throw new Error("Supabase not initialized");
  }

  const fileName = `${Date.now()}_${file.name}`;
  const filePath = buildStoragePath(folder, fileName);

  console.log("========== UPLOAD ==========");
  console.log("Bucket:", "Documents");
  console.log("Folder:", folder);
  console.log("Uploading to:", filePath);

  const { error } = await supabase.storage
    .from("Documents")
    .upload(filePath, file);

  if (error) {
    console.error("Upload Error:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from("Documents")
    .getPublicUrl(filePath);

  console.log("Public URL:", data.publicUrl);

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    url: data.publicUrl,
    path: filePath
  };
}

/**
 * Delete file
 */
export async function deleteFile(filePath) {
  if (!supabase) {
    throw new Error("Supabase not initialized");
  }

  const normalized = normalizeStoragePath(filePath);
  const candidates = Array.from(new Set([filePath, normalized, `documents/${normalized}`, `Documents/${normalized}`].filter(Boolean)));

  let lastError = null;

  for (const candidate of candidates) {
    const { error } = await supabase.storage
      .from("Documents")
      .remove([candidate]);

    if (!error) {
      return;
    }

    lastError = error;
  }

  if (lastError) {
    console.error(lastError);
    throw lastError;
  }
}

/**
 * List files in folder
 */
export async function listFiles(folder = "Documents") {
  if (!supabase) {
    throw new Error("Supabase not initialized");
  }

  console.log("========== LIST ==========");
  console.log("Bucket:", "Documents");
  console.log("Folder Requested:", folder);

  const { data, error } = await supabase.storage
    .from("Documents")
    .list(folder);

  if (error) {
    console.error("List Error:", error);
    throw error;
  }

  console.log("Files Returned:", data);

  return data;
}