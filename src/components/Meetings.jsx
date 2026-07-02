// src/components/Meetings.jsx
import React, { useState, useEffect, useRef } from "react";
import { Upload, FileText, X, Eye } from "lucide-react";
import { OFFICERS } from "../data/officers";
import { deleteFile, uploadFileToStorage, isSupabaseConfigured } from "../supabase";
import { useAuth } from "../contexts/AuthContext";
import { appendSectionDocument, buildUploadedDocument, formatTimestamp, getSectionDocuments, getStoragePathFromUrl, isAdminUser, removeSectionDocument, saveSectionDocuments } from "../utils/documentPersistence";

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
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [designation, setDesignation] = useState(OFFICERS[0]?.designation || "");
  const [officer, setOfficer] = useState("");
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const { user } = useAuth();
  const canManageDocuments = isAdminUser(user);

  useEffect(() => {
    const storedMeetings = readStoredMeetings();
    const hydratedMeetings = storedMeetings.map((meeting) => {
      const storedDocs = getSectionDocuments('meeting', meeting.id);
      const files = [...(meeting.files || []), ...storedDocs];
      const uniqueFiles = Array.from(new Map(files.map((file) => [file.id, file])).values());
      return { ...meeting, files: uniqueFiles };
    });
    setMeetings(hydratedMeetings);
  }, []);

  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
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

      const meetingDoc = {
        title: title.trim(),
        date: date || new Date().toISOString().slice(0, 10),
        designation,
        officer,
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
      writeStoredMeetings(nextMeetings);

      setTitle("");
      setDate("");
      setOfficer("");
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
    writeStoredMeetings(nextMeetings);
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
      writeStoredMeetings(next);
      return next;
    });
    saveSectionDocuments('meeting', meetingId, []);

    if (filesToDelete.length > 0) {
      await Promise.allSettled(filesToDelete.map((path) => deleteFile(path)));
    }
  };

  const handleDesignationChange = (val) => {
    setDesignation(val);
    // clear officer input when designation changes so user can type a name
    setOfficer("");
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
        <p className="text-sm text-gray-500 mt-0.5">Upload meeting documents and record attendees.</p>
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
        <form onSubmit={handleAddMeeting} className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-3 gap-3">
            <input
              className="col-span-2 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
              placeholder="Meeting title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              type="date"
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <select
              value={designation}
              onChange={(e) => handleDesignationChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white"
            >
              {OFFICERS.map((o) => (
                <option key={o.designation} value={o.designation}>{o.designation}</option>
              ))}
            </select>

            <input
              type="text"
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              placeholder="Officer name"
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white"
            />

            <div className="flex items-center gap-3">
              <label
                className="flex-1 cursor-pointer border-2 border-dashed border-yellow-200 rounded-2xl p-3 flex items-center gap-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Upload size={18} className="text-yellow-600" />
                </div>
                <div className="text-sm text-gray-600">Attach documents</div>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,application/*"
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              Save Meeting
            </button>
            <button
              type="button"
              onClick={() => { setTitle(""); setDate(""); setOfficer(""); fileInputRef.current.value = null; }}
              className="bg-white border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-xl"
            >
              Reset
            </button>
          </div>
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
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-800">{m.title}</h3>
                    <p className="text-xs text-gray-400">{m.date}</p>
                    <span className="ml-auto text-xs text-gray-500">{m.designation} • {m.officer}</span>
                    {canManageDocuments && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete meeting "${m.title}"?`)) {
                            handleDeleteMeeting(m.id);
                          }
                        }}
                        className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"
                        title="Delete meeting"
                      >
                        <X size={14} /> Delete
                      </button>
                    )}
                  </div>

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
