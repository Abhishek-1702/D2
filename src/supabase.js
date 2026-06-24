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
  folder = "projects"
) {
  if (!supabase) {
    throw new Error("Supabase not initialized");
  }

  const fileName =
    `${Date.now()}_${file.name}`;

  const filePath =
    `${folder}/${fileName}`;

  const { error } =
    await supabase.storage
      .from("documents")
      .upload(filePath, file);

  if (error) {
    console.error(error);
    throw error;
  }

  const { data } =
    supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    url: data.publicUrl
  };
}

/**
 * Delete file
 */
export async function deleteFile(filePath) {
  if (!supabase) {
    throw new Error("Supabase not initialized");
  }

  const { error } =
    await supabase.storage
      .from("documents")
      .remove([filePath]);

  if (error) throw error;
}

/**
 * List files in folder
 */
export async function listFiles(
  folder = "projects"
) {
  if (!supabase) {
    throw new Error("Supabase not initialized");
  }

  const { data, error } =
    await supabase.storage
      .from("documents")
      .list(folder);

  if (error) throw error;

  return data;
}