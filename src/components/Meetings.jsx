// src/components/Meetings.jsx
import React, { useState, useEffect, useRef } from "react";
import { Upload, FileText, X, Eye } from "lucide-react";
import { AUTHORITY_HIERARCHY, getDesignationDisplayLabel, resolveMeetingDesignation } from "../data/officers";
import { deleteFile, uploadFileToStorage, isSupabaseConfigured } from "../supabase";
import { useAuth } from "../contexts/AuthContext";
import { appendSectionDocument, buildUploadedDocument, formatTimestamp, getSectionDocuments, getStoragePathFromUrl, isAdminUser, readSharedJsonFile, removeSectionDocument, saveSectionDocuments, writeSharedJsonFile } from "../utils/documentPersistence";
import { buildMeetingEmailLink, buildMeetingNotificationText, getAuthorityOptions, readNotificationEmailConfig, requestBrowserNotificationPermission, sendBrowserMeetingNotification, setNotificationEmailForDesignation, writeNotificationEmailConfig } from "../utils/meetingNotifications";

const MEETINGS_STORAGE_KEY = "kesco_meetings_v1";
const SCHEDULED_MEETINGS_STORAGE_KEY = "kesco_scheduled_meetings_v1";
const SCHEDULED_MEETINGS_SHARED_PATH = "app-data/scheduled-meetings.json";

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

function readStoredScheduledMeetings() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SCHEDULED_MEETINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read scheduled meetings", error);
    return [];
  }
}

function writeStoredScheduledMeetings(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCHEDULED_MEETINGS_STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("Failed to write scheduled meetings", error);
  }
}

async function readSharedScheduledMeetings() {
  try {
    const shared = await readSharedJsonFile(SCHEDULED_MEETINGS_SHARED_PATH);
    return Array.isArray(shared) ? shared : null;
  } catch (error) {
    console.error("Failed to read shared scheduled meetings", error);
    return null;
  }
}

async function writeSharedScheduledMeetings(list) {
  try {
    await writeSharedJsonFile(SCHEDULED_MEETINGS_SHARED_PATH, list);
    return true;
  } catch (error) {
    console.error("Failed to write shared scheduled meetings", error);
    return false;
  }
}

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [customDesignation, setCustomDesignation] = useState("");
  const [personName, setPersonName] = useState("");
  const [meetingConductedBy, setMeetingConductedBy] = useState("");
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    authorityName: "",
    meetingDate: "",
    meetingTime: "",
    venue: "",
    meetingLink: "",
    recipients: [],
  });
  const [notificationStatus, setNotificationStatus] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);
  const [showNotificationEmailEditor, setShowNotificationEmailEditor] = useState(false);
  const [notificationEmailConfig, setNotificationEmailConfig] = useState({});
  const [notificationEmailDrafts, setNotificationEmailDrafts] = useState({});
  const [notificationEmailEditorDesignation, setNotificationEmailEditorDesignation] = useState("");
  const [userProfile, setUserProfile] = useState({ name: "", designation: "" });
  const { user } = useAuth();
  const canManageDocuments = isAdminUser(user);
  const authorityOptions = getAuthorityOptions();

  function buildMeetingAuthorityOptions(nodes = AUTHORITY_HIERARCHY, depth = 0) {
    return nodes.flatMap((node) => {
      const prefix = depth > 0 ? "\u00A0".repeat(depth * 2) : "";
      const option = { label: `${prefix}${node.label}`, value: node.label };
      if (!Array.isArray(node.children) || node.children.length === 0) {
        return [option];
      }
      return [option, ...buildMeetingAuthorityOptions(node.children, depth + 1)];
    });
  }

  const meetingAuthorityOptions = buildMeetingAuthorityOptions();

  const persistMeetingsState = async (nextMeetings) => {
    try {
      writeStoredMeetings(nextMeetings);
      await writeSharedJsonFile('app-data/meetings-state.json', nextMeetings);
    } catch (error) {
      console.error('Failed to sync meetings state', error);
    }
  };

  const persistScheduledMeetingsState = async (nextList) => {
    try {
      writeStoredScheduledMeetings(nextList);
      await writeSharedScheduledMeetings(nextList);
    } catch (error) {
      console.error('Failed to sync scheduled meetings state', error);
    }
  };

  const refreshScheduledMeetings = async () => {
    try {
      const shared = await readSharedScheduledMeetings();
      if (Array.isArray(shared)) {
        setScheduledMeetings(shared);
        writeStoredScheduledMeetings(shared);
        setNotificationStatus('Scheduled meetings refreshed from shared storage.');
      } else {
        setNotificationStatus('No shared scheduled meetings were found.');
      }
    } catch (error) {
      console.error('Failed to refresh scheduled meetings', error);
      setNotificationStatus('Unable to refresh scheduled meetings.');
    }
  };

  useEffect(() => {
    setDate("");
    const localSchedules = readStoredScheduledMeetings();
    if (localSchedules.length) {
      setScheduledMeetings(localSchedules);
    }

    const loadSharedSchedule = async () => {
      const shared = await readSharedScheduledMeetings();
      if (Array.isArray(shared)) {
        setScheduledMeetings(shared);
        writeStoredScheduledMeetings(shared);
      }
    };

    const loadEmailConfig = async () => {
      const config = await readNotificationEmailConfig();
      setNotificationEmailConfig(config || {});
      setNotificationEmailDrafts(config || {});
    };

    loadEmailConfig();
    loadSharedSchedule();
    const interval = setInterval(loadSharedSchedule, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile({ name: "", designation: "" });
      return;
    }

    const readProfile = async () => {
      try {
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(`kesco_user_profile_v1:${user.uid}`) : null;
        const storedProfile = stored ? JSON.parse(stored) : null;
        const shared = await readSharedJsonFile("app-data/user-profiles.json");
        const sharedProfile = shared?.[user.uid] || null;
        const resolved = sharedProfile || storedProfile || {};
        setUserProfile({
          name: resolved.name || user.displayName || "",
          designation: resolved.designation || "",
        });
      } catch (error) {
        console.error("Failed to load profile for meetings", error);
      }
    };

    readProfile();
  }, [user]);


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
    const interval = setInterval(loadMeetingsState, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (!selectedPosition) return;
    if (selectedPosition === "other" && !customDesignation.trim()) return;
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

      const selectedDesignation = resolveMeetingDesignation(selectedPosition === "other" ? customDesignation.trim() : selectedPosition);
      const now = new Date();
      const meetingDoc = {
        title: meetingTitle.trim(),
        date: date || now.toISOString().slice(0, 10),
        time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        designation: selectedDesignation,
        officer: getDesignationDisplayLabel(personName, selectedDesignation),
        conductedBy: meetingConductedBy.trim(),
        profileName: userProfile.name || "",
        profileDesignation: userProfile.designation || "",
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

      newMeeting.files = newMeeting.files.map((doc) => ({ ...doc, sectionType: 'meeting', sectionId: newMeeting.id }));
      newMeeting.files.forEach((doc) => appendSectionDocument('meeting', newMeeting.id, doc));
      const nextMeetings = [newMeeting, ...meetings];
      setMeetings(nextMeetings);
      await persistMeetingsState(nextMeetings);

      setMeetingTitle("");
      setDate("");
      setNote("");
      setPersonName("");
      setMeetingConductedBy("");
      setSelectedPosition("");
      setCustomDesignation("");
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
    setSelectedPosition("");
    setCustomDesignation("");
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleDeleteScheduledMeeting = async (meetingId) => {
    if (!canManageDocuments) return;
    const nextList = scheduledMeetings.filter((item) => item.id !== meetingId);
    setScheduledMeetings(nextList);
    await persistScheduledMeetingsState(nextList);
    setNotificationStatus("Scheduled meeting removed.");
  };

  const handleScheduleMeeting = async (event) => {
    event.preventDefault();
    if (!user) {
      alert("Sign in to schedule meetings.");
      return;
    }

    const recipientList = Array.isArray(scheduleForm.recipients) ? scheduleForm.recipients.filter(Boolean) : [];
    const nextSchedule = {
      id: `${Date.now()}`,
      authorityName: scheduleForm.authorityName.trim(),
      date: scheduleForm.meetingDate,
      time: scheduleForm.meetingTime,
      venue: scheduleForm.venue.trim(),
      meetingLink: scheduleForm.meetingLink.trim(),
      recipients: recipientList,
      recipient: recipientList.join(", "),
      createdAt: new Date().toISOString(),
      createdBy: { uid: user.uid, email: user.email },
    };

    const nextList = [nextSchedule, ...scheduledMeetings];
    setScheduledMeetings(nextList);
    await persistScheduledMeetingsState(nextList);
    setScheduleForm({ authorityName: "", meetingDate: "", meetingTime: "", venue: "", meetingLink: "", recipients: [] });
    setScheduleModalOpen(false);
    setNotificationStatus("Meeting saved and synced across devices.");
  };

  const handleSendNotification = async (meeting) => {
    if (!meeting) return;
    setSendingNotification(true);
    setNotificationStatus("");
    try {
      const permission = await requestBrowserNotificationPermission();
      const recipientList = Array.isArray(meeting.recipients) && meeting.recipients.length > 0 ? meeting.recipients : (meeting.recipient ? meeting.recipient.split(",") : []);
      const browserSent = sendBrowserMeetingNotification(meeting, recipientList);
      const missingEmails = recipientList.filter((designation) => !notificationEmailConfig[designation]);
      if (missingEmails.length > 0) {
        setNotificationStatus("Add email addresses for the selected designations before sending notifications.");
        setShowNotificationEmailEditor(true);
        setNotificationEmailEditorDesignation(missingEmails[0]);
        return;
      }
      const mailLink = buildMeetingEmailLink(meeting, recipientList, notificationEmailConfig);
      if (browserSent || mailLink) {
        setNotificationStatus(`Notification prepared${permission === "granted" ? " and sent to browser" : ""}${mailLink ? " and email draft opened" : ""}.`);
        if (mailLink) {
          window.location.href = mailLink;
        }
      } else {
        setNotificationStatus("Browser notification permission denied and no mail setup was found.");
      }
    } catch (error) {
      console.error("Failed to send meeting notification", error);
      setNotificationStatus("Notification failed. Please try again.");
    } finally {
      setSendingNotification(false);
    }
  };

  const handleToggleRecipient = (designation) => {
    const nextRecipients = scheduleForm.recipients.includes(designation)
      ? scheduleForm.recipients.filter((item) => item !== designation)
      : [...scheduleForm.recipients, designation];
    setScheduleForm({ ...scheduleForm, recipients: nextRecipients });
  };

  const handleDesignationChange = (value) => {
    setSelectedPosition(value);
    if (value !== "other") {
      setCustomDesignation("");
    }
  };

  const handleSaveNotificationEmails = async () => {
    if (!canManageDocuments) return;
    const nextConfig = { ...notificationEmailConfig, ...notificationEmailDrafts };
    const saved = await writeNotificationEmailConfig(nextConfig);
    setNotificationEmailConfig(saved);
    setNotificationEmailDrafts(saved);
    setShowNotificationEmailEditor(false);
    setNotificationStatus("Notification email addresses saved.");
  };

  const handleSetEmailDraft = (designation, value) => {
    setNotificationEmailDrafts((prev) => ({ ...prev, [designation]: value }));
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
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Meeting records</h2>
            <p className="text-sm text-gray-500">Save meeting details and schedule follow-up notifications.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <button
                type="button"
                onClick={() => setScheduleModalOpen(true)}
                className="rounded-xl bg-[#1f498c] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
              >
                Schedule Meeting
              </button>
            ) : null}
            <button
              type="button"
              onClick={refreshScheduledMeetings}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Refresh scheduled meetings
            </button>
          </div>
        </div>

        <form onSubmit={handleAddMeeting} className="space-y-4 max-w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Authority position</label>
            <div className="flex flex-col gap-3 md:flex-row">
              <select
                value={selectedPosition}
                onChange={(e) => handleDesignationChange(e.target.value)}
                className="min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800"
              >
                <option value="">Choose designation</option>
                {meetingAuthorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
                <option value="other">Others</option>
              </select>
              {selectedPosition === "other" ? (
                <input
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  placeholder="Enter designation"
                  className="min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800"
                />
              ) : null}
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
                    value={date || ""}
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

        {notificationStatus ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notificationStatus}
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          {scheduledMeetings.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Scheduled meetings</h3>
              {scheduledMeetings.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.authorityName}</p>
                      <p className="text-xs text-gray-500">{item.date} • {item.time || "Time TBD"}</p>
                      <p className="mt-1 text-sm text-gray-600">Venue: {item.venue || "TBD"}</p>
                      {item.meetingLink ? <a href={item.meetingLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-blue-600">Open meeting link</a> : null}
                      {item.recipient ? <p className="mt-1 text-xs text-gray-500">Recipients: {item.recipient}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageDocuments ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteScheduledMeeting(item.id)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          title="Remove scheduled meeting"
                        >
                          <span className="flex items-center gap-1">
                            <X size={14} /> Remove
                          </span>
                        </button>
                      ) : null}
                      {user ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotificationEmailEditor(true);
                              setNotificationEmailEditorDesignation("");
                              setNotificationEmailDrafts(notificationEmailConfig);
                            }}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Manage email addresses
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendNotification(item)}
                            disabled={sendingNotification}
                            className="rounded-xl border border-[#1f498c] px-3 py-2 text-sm font-semibold text-[#1f498c] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {sendingNotification ? "Sending..." : "Send notification"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
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
                  {(m.profileName || m.conductedBy) ? (
                    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-gray-700">
                      <div className="font-semibold text-gray-900">{m.profileName || m.conductedBy}</div>
                      {m.profileDesignation ? <div className="text-xs text-gray-500">{m.profileDesignation}</div> : null}
                    </div>
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

      {scheduleModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Schedule meeting</h3>
                <p className="text-sm text-gray-500">Create a meeting schedule and notify the selected authority.</p>
              </div>
              <button type="button" onClick={() => setScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleScheduleMeeting} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Authority name</label>
                  <input value={scheduleForm.authorityName} onChange={(event) => setScheduleForm({ ...scheduleForm, authorityName: event.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="e.g. Managing Director" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Date</label>
                  <input type="date" value={scheduleForm.meetingDate} onChange={(event) => setScheduleForm({ ...scheduleForm, meetingDate: event.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Time</label>
                  <input type="time" value={scheduleForm.meetingTime} onChange={(event) => setScheduleForm({ ...scheduleForm, meetingTime: event.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Venue</label>
                  <input value={scheduleForm.venue} onChange={(event) => setScheduleForm({ ...scheduleForm, venue: event.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Conference room / online" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Meeting link</label>
                <input value={scheduleForm.meetingLink} onChange={(event) => setScheduleForm({ ...scheduleForm, meetingLink: event.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Notify officials</label>
                <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-gray-200 p-3 text-sm">
                  {authorityOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 hover:border-gray-200">
                      <input
                        type="checkbox"
                        checked={scheduleForm.recipients.includes(option.value)}
                        onChange={() => handleToggleRecipient(option.value)}
                        className="h-3 w-3 min-h-0 min-w-0 rounded border-gray-300 accent-[#1f498c] focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">Select one or more officials for the notification.</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setScheduleModalOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#1f498c] px-4 py-2 text-sm font-semibold text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showNotificationEmailEditor ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-email-title"
          onClick={() => setShowNotificationEmailEditor(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-8"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="notification-email-title" className="text-xl font-semibold text-gray-900">Notification email addresses</h3>
                <p className="text-sm text-gray-500">Save email addresses for each designation. Admin only.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationEmailEditor(false)}
                aria-label="Close notification email editor"
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {authorityOptions.map((option) => (
                <div key={option.value} className="rounded-2xl border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-gray-700">{option.label}</label>
                    <span className="text-xs text-gray-400">{notificationEmailDrafts[option.value] ? 'Saved' : 'Pending'}</span>
                  </div>
                  <input
                    value={notificationEmailDrafts[option.value] || ""}
                    onChange={(event) => handleSetEmailDraft(option.value, event.target.value)}
                    placeholder="name@domain.com"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowNotificationEmailEditor(false)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotificationEmails}
                className="w-full rounded-xl bg-[#1f498c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163c72] sm:w-auto"
              >
                Save emails
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
