import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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
  const filePath = `${folder}/${fileName}`;

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

  const { error } = await supabase.storage
    .from("Documents")
    .remove([filePath]);

  if (error) {
    console.error(error);
    throw error;
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