// src/components/Meetings.jsx
import React, { useState, useEffect, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { OFFICERS } from "../data/officers";
import { isFirebaseConfigured , saveMeetingToFirestore, loadMeetingsFromFirestore } from "../firebase";
import { deleteFile, uploadFileToStorage, isSupabaseConfigured } from "../supabase";
import { useAuth } from "../contexts/AuthContext";
import { appendSectionDocument, buildUploadedDocument, formatTimestamp, getSectionDocuments, isAdminUser, removeSectionDocument } from "../utils/documentPersistence";

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

  const handleFiles = (files) => {
    const arr = Array.from(files).map((f) => ({
      id: `${Date.now()}-${f.name}`,
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f),
    }));
    return arr;
  };

  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const canManageDocuments = isAdminUser(user);

  useEffect(() => {
    const loadMeetings = async () => {
      if (isFirebaseConfigured) {
        try {
          const loaded = await loadMeetingsFromFirestore();
          const withPersistedDocs = loaded.map((meeting) => {
            const storedDocs = getSectionDocuments('meeting', meeting.id);
            const files = [...(meeting.files || []), ...storedDocs];
            const uniqueFiles = Array.from(new Map(files.map((file) => [file.id, file])).values());
            return { ...meeting, files: uniqueFiles };
          });
          setMeetings(withPersistedDocs);
          writeStoredMeetings(withPersistedDocs);
          return;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("loading meetings failed", err);
        }
      }

      const storedMeetings = readStoredMeetings();
      setMeetings(storedMeetings);
    };

    loadMeetings();
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

      if (isFirebaseConfigured) {
        try {
          const id = await saveMeetingToFirestore(meetingDoc);
          newMeeting = { ...newMeeting, id };
          const persistedDocs = uploaded.map((doc) => ({ ...doc }));
          persistedDocs.forEach((doc) => appendSectionDocument('meeting', id, doc));
          newMeeting.files = persistedDocs;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("saving meeting failed", err);
        }
      }

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
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId ? { ...m, files: m.files.filter((f) => f.id !== fileId) } : m
      )
    );
    removeSectionDocument('meeting', meetingId, fileId);
    const nextMeetings = meetings
      .map((meeting) => meeting.id === meetingId ? { ...meeting, files: meeting.files.filter((file) => file.id !== fileId) } : meeting)
      .filter((meeting) => meeting.id !== undefined);
    setMeetings(nextMeetings);
    writeStoredMeetings(nextMeetings);
    if (item?.path) {
      try {
        await deleteFile(item.path);
      } catch (error) {
        console.error('delete failed', error);
      }
    }
  };

  const handleDesignationChange = (val) => {
    setDesignation(val);
    // clear officer input when designation changes so user can type a name
    setOfficer("");
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-[#FFFBEA]/30 to-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4">
        <h1 className="text-2xl font-display font-bold text-gray-900">Meetings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload meeting documents and record attendees.</p>
        <div className="mt-3">
          {isFirebaseConfigured ? (
            <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Firebase: Connected</span>
          ) : (
            <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Firebase: Local (offline)</span>
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
              disabled={isFirebaseConfigured && !user}
              className={`bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors ${isFirebaseConfigured && !user ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isFirebaseConfigured && !user ? 'Sign in to save' : 'Save Meeting'}
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
                          <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600">Open ↗</a>
                          {canManageDocuments ? (
                            <button onClick={() => handleRemoveFile(m.id, f.id)} className="text-gray-300 hover:text-red-400 ml-2" title="Delete document">
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
    </div>
  );
}
