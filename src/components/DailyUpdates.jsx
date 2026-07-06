import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileText, Upload, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { deleteFile, uploadFileToStorage, isSupabaseConfigured } from "../supabase";
import { readSharedJsonFile, writeSharedJsonFile } from "../utils/documentPersistence";

const STORAGE_KEY = "kesco_daily_updates_v1";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function readStoredUpdates() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read daily updates", error);
    return [];
  }
}

function writeStoredUpdates(updates) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
  } catch (error) {
    console.error("Failed to write daily updates", error);
  }
}

function getTodayParts() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function getPreviewSource(doc) {
  if (!doc?.url) return null;
  const name = (doc.name || "").toLowerCase();
  const ext = name.split(".").pop() || "";
  const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
  const officeExts = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "xlsm", "xltx"];

  if (imageExts.includes(ext)) return { src: doc.url, type: "image" };
  if (ext === "pdf") return { src: doc.url, type: "pdf" };
  if (officeExts.includes(ext)) return { src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.url)}`, type: "office" };
  return { src: doc.url, type: "fallback" };
}

export default function DailyUpdates() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [updates, setUpdates] = useState([]);
  const [personName, setPersonName] = useState("");
  const [updateDate, setUpdateDate] = useState("");
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUpdatesState = async () => {
      const storedUpdates = readStoredUpdates();
      const remoteUpdates = await readSharedJsonFile("app-data/daily-updates-state.json");
      const sourceUpdates = Array.isArray(remoteUpdates) && remoteUpdates.length > 0 ? remoteUpdates : storedUpdates;
      const sorted = [...sourceUpdates].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setUpdates(sorted);

      if (Array.isArray(remoteUpdates) && remoteUpdates.length > 0) {
        writeStoredUpdates(sorted);
      }

      if ((!filterYear || !filterMonth) && sorted.length > 0) {
        const latestReport = sorted[0];
        const latestYear = latestReport.reportYear || latestReport.date?.slice(0, 4);
        const latestMonth = latestReport.reportMonth || latestReport.date?.slice(5, 7);
        if (latestYear && latestMonth) {
          setFilterYear(latestYear);
          setFilterMonth(latestMonth.padStart(2, "0"));
        }
      }
    };

    void loadUpdatesState();
  }, []);

  useEffect(() => {
    // Only prefill from the user's displayName (do not use email local-part as default)
    if (user?.displayName) {
      setPersonName(user.displayName);
    }
  }, [user]);

  useEffect(() => {
    const { date } = getTodayParts();
    if (!updateDate) setUpdateDate(date);
  }, [updateDate]);

  const availableYears = useMemo(() => {
    const startYear = 2024;
    const endYear = 2030;
    const years = [];
    for (let year = endYear; year >= startYear; year -= 1) {
      years.push(String(year));
    }
    updates.forEach((item) => {
      const itemYear = item.reportYear || item.date?.slice(0, 4);
      if (itemYear && !years.includes(itemYear)) {
        years.push(itemYear);
      }
    });
    return years.sort((a, b) => Number(b) - Number(a));
  }, [updates]);

  const selectedPeriod = filterYear && filterMonth ? `${filterYear}-${filterMonth.padStart(2, "0")}` : null;
  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const isFutureSelection = selectedPeriod ? selectedPeriod > currentPeriod : false;

  const visibleUpdates = useMemo(() => {
    return updates.filter((item) => {
      const itemYear = item.reportYear || item.date?.slice(0, 4);
      const itemMonth = item.reportMonth || item.date?.slice(5, 7);
      if (filterYear && itemYear !== filterYear) return false;
      if (filterMonth && itemMonth !== filterMonth.padStart(2, "0")) return false;
      return true;
    });
  }, [filterMonth, filterYear, updates]);

  const persistUpdates = async (nextUpdates) => {
    writeStoredUpdates(nextUpdates);
    if (isSupabaseConfigured) {
      try {
        const remoteUpdates = nextUpdates.map((item) => {
          const doc = item.document;
          const documentForRemote = doc && !doc.localOnly && doc.url && doc.path
            ? { ...doc }
            : null;
          return {
            ...item,
            document: documentForRemote,
          };
        });
        await writeSharedJsonFile("app-data/daily-updates-state.json", remoteUpdates);
      } catch (error) {
        console.error("Failed to persist daily updates to shared storage", error);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!personName.trim()) {
      setUploadError("Please enter the person’s name.");
      return;
    }

    setSaving(true);
    setUploadError("");

    try {
      const { time } = getTodayParts();
      const entryDate = updateDate || getTodayParts().date;
      const reportYear = filterYear;
      const reportMonth = filterMonth?.padStart(2, "0") || "";
      setUpdateDate(entryDate);

      let documentEntry = null;
      if (selectedFile) {
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
          setUploadError("File size must be 50 MB or less.");
          setSaving(false);
          return;
        }

        let url = null;
        let path = null;
        let uploadFailed = false;

        if (isSupabaseConfigured) {
          try {
            const res = await uploadFileToStorage(selectedFile, "daily-updates");
            url = res.url;
            path = res.path;
          } catch (error) {
            console.error("Daily update upload failed", error);
            uploadFailed = true;
            setUploadError("Document upload failed. The update will save locally only.");
          }
        }

        if (!url && !path) {
          // Local device can preview the file, but shared remote state should not persist the blob URL.
          url = null;
          path = null;
        }

        documentEntry = {
          id: `${Date.now()}-${selectedFile.name.replace(/\s+/g, "-")}`,
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type || "application/octet-stream",
          url,
          path,
          uploadedAt: new Date().toISOString(),
          localOnly: uploadFailed || (!isSupabaseConfigured && !url),
        };
      }

      const newEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        personName: personName.trim(),
        date: entryDate,
        reportYear,
        reportMonth,
        time,
        note: note.trim(),
        document: documentEntry,
        createdAt: new Date().toISOString(),
      };

      const nextUpdates = [newEntry, ...updates].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setUpdates(nextUpdates);
      await persistUpdates(nextUpdates);

      setPersonName(user?.displayName || "");
      setUpdateDate(entryDate);
      setNote("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (filterYear && filterMonth) {
        setFilterYear(filterYear);
        setFilterMonth(filterMonth);
      }
    } catch (error) {
      console.error("Failed to save daily update", error);
      setUploadError("Unable to save the update right now.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (updateId) => {
    const target = updates.find((item) => item.id === updateId);
    if (!target?.document) return;

    const nextUpdates = updates.map((item) => (item.id === updateId ? { ...item, document: null } : item));
    setUpdates(nextUpdates);
    await persistUpdates(nextUpdates);

    if (target.document.path) {
      try {
        await deleteFile(target.document.path);
      } catch (error) {
        console.error("Failed to delete daily update document", error);
      }
    }
  };

  const handleDeleteEntry = async (updateId) => {
    const target = updates.find((item) => item.id === updateId);
    if (!target) return;

    const nextUpdates = updates.filter((item) => item.id !== updateId);
    setUpdates(nextUpdates);
    await persistUpdates(nextUpdates);

    if (target.document?.path) {
      try {
        await deleteFile(target.document.path);
      } catch (error) {
        console.error("Failed to delete daily update document", error);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-[#FFFBEA]/30 to-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4">
        <h1 className="text-2xl font-display font-bold text-gray-900">Daily Updates</h1>
        <p className="text-sm text-gray-500 mt-0.5">Log updates, notes, and documents by date for quick review.</p>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 items-center justify-center text-center lg:flex-row lg:items-end lg:justify-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500"></p>
              <p className="text-sm text-gray-600"></p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Year</label>
                <select
                  value={filterYear}
                  onChange={(event) => setFilterYear(event.target.value)}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-8 py-3 text-base font-medium text-gray-800"
                >
                  <option value="">Select year</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Month</label>
                <select
                  value={filterMonth}
                  onChange={(event) => setFilterMonth(event.target.value)}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-8 py-3 text-base font-medium text-gray-800"
                >
                  <option value="">Select month</option>
                  {Array.from({ length: 12 }, (_, index) => {
                    const value = String(index + 1).padStart(2, "0");
                    const label = new Date(2000, index, 1).toLocaleString("en", { month: "long" });
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>

        {!filterYear || !filterMonth ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            Please select year and month to add updates.
          </div>
        ) : isFutureSelection ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            Invalid selection: future month/year selected.
          </div>
        ) : (
          <>
            {user ? (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">Person name</label>
                    <input
                      value={personName}
                      onChange={(event) => setPersonName(event.target.value)}
                      placeholder="Enter name"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">Date</label>
                    <input
                      type="date"
                      value={updateDate}
                      onChange={(event) => setUpdateDate(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Short note</label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    placeholder="Add a short update note"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-yellow-200 bg-yellow-50/50 px-4 py-3 text-sm text-gray-700">
                    <Upload size={16} className="text-yellow-600" />
                    <span>{selectedFile ? selectedFile.name : "Upload a document (all types, up to 50 MB)"}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="*/*"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? "Saving..." : "Save Update"}
                  </button>
                </div>

                {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
              </form>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                Sign in to add or delete updates. You can still preview documents below.
              </div>
            )}

            <div className="space-y-4">
          {visibleUpdates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
              No updates found for the selected month and year.
            </div>
          ) : (
            visibleUpdates.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.personName}</p>
                      <p className="text-xs text-gray-500">{item.date} • {item.time}</p>
                    </div>
                    {user ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete this full update entry?")) {
                            handleDeleteEntry(item.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-500"
                        title="Delete full update"
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </div>
                  {item.note ? <p className="text-sm text-gray-600">{item.note}</p> : null}
                </div>

                {item.document ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <FileText size={16} className="text-blue-500" />
                      <span className="font-medium">{item.document.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(item.document)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-yellow-600"
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <a
                      href={item.document.url}
                      target="_blank"
                      rel="noreferrer"
                      download={item.document.name}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      <Download size={13} /> Download
                    </a>
                    {user ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-500"
                      >
                        <X size={13} /> Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
          </>
      )}
      </div>

      {previewDoc && (() => {
        const preview = getPreviewSource(previewDoc);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Preview</p>
                  <p className="text-xs text-gray-500">{previewDoc.name}</p>
                </div>
                <button type="button" onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[70vh] min-h-[420px] overflow-auto bg-gray-50 p-3">
                {preview?.type === "image" ? (
                  <img src={preview.src} alt={previewDoc.name} className="mx-auto max-h-[65vh] object-contain" />
                ) : preview?.type === "pdf" || preview?.type === "office" ? (
                  <iframe title={previewDoc.name} src={preview.src} className="h-[65vh] w-full rounded-xl border border-gray-200" />
                ) : (
                  <div className="flex h-[65vh] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center text-sm text-gray-500">
                    <FileText size={28} className="mb-2 text-gray-300" />
                    <p className="font-medium text-gray-700">Preview is not available for this file type.</p>
                    <p className="mt-1">You can still download it directly.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
