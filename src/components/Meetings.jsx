// src/components/Meetings.jsx
import React, { useState, useEffect, useRef } from "react";
import { Upload, FileText, X, Eye } from "lucide-react";
import { AUTHORITY_HIERARCHY, resolveMeetingDesignation } from "../data/officers";
import { deleteFile, uploadFileToStorage, isSupabaseConfigured } from "../supabase";
import { useAuth } from "../contexts/AuthContext";
import { appendSectionDocument, buildUploadedDocument, formatTimestamp, getSectionDocuments, getStoragePathFromUrl, isAdminUser, readSharedJsonFile, removeSectionDocument, saveSectionDocuments, writeSharedJsonFile } from "../utils/documentPersistence";

const MEETINGS_STORAGE_KEY = "kesco_meetings_v1";

function readStoredMeetings() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MEETINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read meetings store", error);
    return [];
  }
}

function writeStoredMeetings(meetingsList) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetingsList));
  } catch (error) {
    console.error("Failed to write meetings store", error);
  }
}

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [selectedPath, setSelectedPath] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [personName, setPersonName] = useState("");
  const [meetingConductedBy, setMeetingConductedBy] = useState("");
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const { user } = useAuth();
  const canManageDocuments = isAdminUser(user);

  const persistMeetingsState = async (nextMeetings) => {
    try {
      writeStoredMeetings(nextMeetings);
      await writeSharedJsonFile('app-data/meetings-state.json', nextMeetings);
    } catch (error) {
      console.error('Failed to sync meetings state', error);
    }
  };

  useEffect(() => {
    const loadMeetingsState = async () => {
      const storedMeetings = readStoredMeetings();
      const remoteMeetings = await readSharedJsonFile('app-data/meetings-state.json');
      const sourceMeetings = Array.isArray(remoteMeetings) && remoteMeetings.length > 0 ? remoteMeetings : storedMeetings;
      const hydratedMeetings = sourceMeetings.map((meeting) => {
        const storedDocs = getSectionDocuments('meeting', meeting.id);
        const files = [...(meeting.files || []), ...storedDocs];
        const uniqueFiles = Array.from(new Map(files.map((file) => [file.id, file])).values());
        return { ...meeting, files: uniqueFiles };
      });
      setMeetings(hydratedMeetings);
      if (Array.isArray(remoteMeetings) && remoteMeetings.length > 0) {
        writeStoredMeetings(hydratedMeetings);
      }
    };

    loadMeetingsState();
  }, []);

  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (!selectedPosition) return;
    if (!meetingTitle.trim()) return;
    setSaving(true);
    try {
      if (!user) {
        // saving is only allowed for signed-in users
        // eslint-disable-next-line no-alert
        alert('Please sign in to save meetings and upload documents.');
        return;
      }

      const inputFiles = Array.from(fileInputRef.current?.files || []);
      const uploaded = [];

      for (const f of inputFiles) {
        try {
          let url = URL.createObjectURL(f);
          let path = null;
          if (isSupabaseConfigured) {
            const res = await uploadFileToStorage(f);
            url = res.url;
            path = res.path;
          }
          const docEntry = buildUploadedDocument(f, url, path);
          uploaded.push(docEntry);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("file upload failed", f.name, err);
          const localUrl = URL.createObjectURL(f);
          uploaded.push(buildUploadedDocument(f, localUrl));
        }
      }

      const selectedDesignation = resolveMeetingDesignation(selectedPosition);
      const now = new Date();
      const meetingDoc = {
        title: meetingTitle.trim(),
        date: date || now.toISOString().slice(0, 10),
        time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        designation: selectedDesignation,
        officer: personName.trim() || selectedDesignation,
        conductedBy: meetingConductedBy.trim(),
        note: note.trim(),
        createdAt: now.toISOString(),
        files: uploaded,
        createdBy: null,
      };

      if (user) {
        meetingDoc.createdBy = { uid: user.uid, email: user.email };
      }

      let newMeeting = {
        id: Date.now(),
        ...meetingDoc,
        files: uploaded.map((doc) => ({ ...doc, uploadedAt: doc.uploadedAt || new Date().toISOString() })),
      };

      newMeeting.files.forEach((doc) => appendSectionDocument('meeting', newMeeting.id, doc));
      const nextMeetings = [newMeeting, ...meetings];
      setMeetings(nextMeetings);
      await persistMeetingsState(nextMeetings);

      setMeetingTitle("");
      setDate("");
      setNote("");
      setPersonName("");
      setMeetingConductedBy("");
      setSelectedPath([]);
      setSelectedPosition("");
      if (fileInputRef.current) fileInputRef.current.value = null;
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFile = async (meetingId, fileId) => {
    const item = meetings.find((meeting) => meeting.id === meetingId)?.files?.find((file) => file.id === fileId);
    const nextMeetings = meetings
      .map((meeting) => meeting.id === meetingId ? { ...meeting, files: meeting.files.filter((file) => file.id !== fileId) } : meeting)
      .filter((meeting) => meeting.id !== undefined);
    setMeetings(nextMeetings);
    await persistMeetingsState(nextMeetings);
    removeSectionDocument('meeting', meetingId, fileId);

    const resolvedPath = item?.path || getStoragePathFromUrl(item?.url);
    if (resolvedPath) {
      try {
        await deleteFile(resolvedPath);
      } catch (error) {
        console.error('delete failed', error);
      }
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    const meeting = meetings.find((item) => item.id === meetingId);
    if (!meeting) return;

    const filesToDelete = (meeting.files || []).map((file) => file.path || getStoragePathFromUrl(file.url)).filter(Boolean);
    setMeetings((prev) => {
      const next = prev.filter((item) => item.id !== meetingId);
      void persistMeetingsState(next);
      return next;
    });
    saveSectionDocuments('meeting', meetingId, []);

    if (filesToDelete.length > 0) {
      await Promise.allSettled(filesToDelete.map((path) => deleteFile(path)));
    }
  };

  const resetForm = () => {
    setMeetingTitle("");
    setDate("");
    setNote("");
    setPersonName("");
    setSelectedPath([]);
    setSelectedPosition("");
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const getNextOptions = (path) => {
    // Traverse the tree using the path segments. Start from the root list.
    if (path.length === 0) return AUTHORITY_HIERARCHY;
    let nodes = AUTHORITY_HIERARCHY;
    for (const segment of path) {
      const found = nodes.find((n) => n.label === segment);
      if (!found) return [];
      nodes = found.children || [];
    }
    return nodes || [];
  };

  const handleSelectionChange = (value, level) => {
    const nextPath = selectedPath.slice(0, level);
    nextPath[level] = value;
    const trimmed = nextPath.filter((entry) => entry !== undefined);
    setSelectedPath(trimmed);
    // only keep the last selected designation (not the full tree)
    setSelectedPosition(value || trimmed[trimmed.length - 1] || "");
  };

  const getPreviewSource = (file) => {
    if (!file?.url) return null;
    const name = (file.name || "").toLowerCase();
    const ext = name.split(".").pop() || "";
    const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
    const officeExts = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "xlsm", "xltx"];

    if (imageExts.includes(ext)) return { src: file.url, type: "image" };
    if (ext === "pdf") return { src: file.url, type: "pdf" };
    if (officeExts.includes(ext)) return { src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`, type: "office" };
    return { src: file.url, type: "fallback" };
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-[#FFFBEA]/30 to-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4">
        <h1 className="text-2xl font-display font-bold text-gray-900">Meetings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record official meeting details for the selected authority position.</p>
        <div className="mt-3">
          {isSupabaseConfigured ? (
            <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Supabase: Connected</span>
          ) : (
            <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Supabase: Local (offline)</span>
          )}
          {saving && <span className="ml-3 text-xs text-yellow-600">Saving…</span>}
        </div>
      </div>

      <div className="px-8 py-6">
        <form onSubmit={handleAddMeeting} className="space-y-4 max-w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Authority position</label>
            <div className="flex gap-3 flex-nowrap overflow-x-auto">
              {selectedPath.map((value, index) => (
                <select
                  key={`${value}-${index}`}
                  value={value}
                  onChange={(e) => handleSelectionChange(e.target.value, index)}
                  className="min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800"
                >
                  <option value="">Select</option>
                  {getNextOptions(selectedPath.slice(0, index)).map((option) => (
                    <option key={option.label} value={option.label}>{option.label}</option>
                  ))}
                </select>
              ))}
              {(() => {
                const nextOptions = getNextOptions(selectedPath);
                if (!nextOptions || nextOptions.length === 0) return null;
                return (
                  <select
                    value=""
                    onChange={(e) => handleSelectionChange(e.target.value, selectedPath.length)}
                    className="min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800"
                  >
                    <option value="">Designation</option>
                    {nextOptions.map((option) => (
                      <option key={option.label} value={option.label}>{option.label}</option>
                    ))}
                  </select>
                );
              })()}
            </div>
          </div>

          {selectedPosition && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Name</label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="Enter officer / official name"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Meeting title</label>
                <input
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Enter meeting title"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Meeting conducted by</label>
                <input
                  type="text"
                  value={meetingConductedBy}
                  onChange={(e) => setMeetingConductedBy(e.target.value)}
                  placeholder="Enter name of person who conducted the meeting"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Short note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Add a short note"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label
                  className={`flex flex-1 ${user ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} items-center gap-3 rounded-2xl border border-dashed border-yellow-200 bg-yellow-50/50 px-4 py-3 text-sm text-gray-700`}
                  onClick={() => {
                    if (!user) {
                      // eslint-disable-next-line no-alert
                      alert('Sign in to attach documents');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload size={16} className="text-yellow-600" />
                  <span>{fileInputRef.current?.files?.length ? fileInputRef.current.files[0].name : "Attach document"}</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,application/*"
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!user}
                    className={`bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors ${!user ? 'opacity-50 cursor-not-allowed hover:bg-yellow-400' : ''}`}
                  >
                    {user ? 'Save Meeting' : 'Sign in to Save'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-white border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-xl"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="mt-8 space-y-4">
          {meetings.length === 0 && (
            <div className="text-sm text-gray-400">No meetings recorded yet.</div>
          )}

          {meetings.map((m) => (
            <div key={m.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-700 font-bold">M</div>
                <div className="flex-1">

                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">{m.title}</h3>
                      <div className="text-xs text-gray-400 mt-1">{m.date} {m.time ? `• ${m.time}` : null}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {canManageDocuments && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete meeting "${m.title}"?`)) {
                              handleDeleteMeeting(m.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"
                          title="Delete meeting"
                        >
                          <X size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">{m.designation}</div>
                  <div className="mt-1 text-sm text-gray-700">{m.officer}</div>
                  {m.conductedBy ? (
                    <div className="mt-1 text-sm text-gray-600">Meeting conducted by: <span className="font-medium text-gray-800">{m.conductedBy}</span></div>
                  ) : null}
                  {m.note ? <p className="mt-2 text-sm text-gray-600">{m.note}</p> : null}

                  {m.files && m.files.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {m.files.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-3 py-2">
                          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
                            <FileText size={18} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{f.name}</p>
                            <p className="text-xs text-gray-400">{Math.round(f.size / 1024)} KB</p>
                            <p className="text-[11px] text-gray-400">{formatTimestamp(f.uploadedAt)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewFile(f)}
                            className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-yellow-600"
                          >
                            <Eye size={13} /> Preview
                          </button>
                          <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600">Open ↗</a>
                          {canManageDocuments ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete "${f.name}"?`)) {
                                  handleRemoveFile(m.id, f.id);
                                }
                              }}
                              className="text-gray-300 hover:text-red-400 ml-2"
                              title="Delete document"
                            >
                              <X size={14} />
                            </button>
                          ) : (
                            <div className="ml-2 text-xs text-gray-400">Admin only</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {previewFile && (() => {
        const preview = getPreviewSource(previewFile);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Preview</p>
                  <p className="text-xs text-gray-500">{previewFile.name}</p>
                </div>
                <button type="button" onClick={() => setPreviewFile(null)} className="text-gray-400 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>
              <div className="bg-gray-50 p-3 min-h-[420px] max-h-[70vh] overflow-auto">
                {preview?.type === "image" ? (
                  <img src={preview.src} alt={previewFile.name} className="mx-auto max-h-[65vh] object-contain" />
                ) : preview?.type === "pdf" || preview?.type === "office" ? (
                  <iframe title={previewFile.name} src={preview.src} className="w-full h-[65vh] rounded-xl border border-gray-200" />
                ) : (
                  <div className="flex h-[65vh] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center text-sm text-gray-500">
                    <FileText size={28} className="mb-2 text-gray-300" />
                    <p className="font-medium text-gray-700">Preview is not available for this file type.</p>
                    <p className="mt-1">You can still open it directly using the link above.</p>
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
