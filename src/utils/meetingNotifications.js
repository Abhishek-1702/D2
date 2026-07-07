import { getAuthorityOptions as getFinalAuthorityOptions } from "../data/officers";
import { readSharedJsonFile, writeSharedJsonFile } from "./documentPersistence";

const NOTIFICATION_EMAILS_PATH = "app-data/notification-emails.json";
const NOTIFICATION_EMAILS_STORAGE_KEY = "kesco_notification_emails_v1";

export function getAuthorityOptions() {
  return getFinalAuthorityOptions();
}

async function readNotificationEmailStore() {
  const shared = await readSharedJsonFile(NOTIFICATION_EMAILS_PATH);
  if (shared && typeof shared === "object") {
    return shared;
  }

  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_EMAILS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to read notification email store", error);
    return {};
  }
}

async function writeNotificationEmailStore(values) {
  const payload = values && typeof values === "object" ? values : {};
  try {
    await writeSharedJsonFile(NOTIFICATION_EMAILS_PATH, payload);
  } catch (error) {
    console.error("Failed to write shared notification email store", error);
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(NOTIFICATION_EMAILS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to write local notification email store", error);
    }
  }

  return payload;
}

export async function readNotificationEmailConfig() {
  return readNotificationEmailStore();
}

export async function writeNotificationEmailConfig(values) {
  return writeNotificationEmailStore(values);
}

export async function setNotificationEmailForDesignation(designation, email) {
  const cleanedDesignation = (designation || "").trim();
  const cleanedEmail = (email || "").trim();
  if (!cleanedDesignation) return {};

  const current = await readNotificationEmailStore();
  const next = {
    ...current,
    [cleanedDesignation]: cleanedEmail,
  };
  return writeNotificationEmailStore(next);
}

export function buildMeetingNotificationText(meeting, recipient) {
  const recipientText = Array.isArray(recipient)
    ? recipient.filter(Boolean).join(", ")
    : (recipient || "selected official");

  const lines = [
    `Meeting notification: ${meeting.authorityName || meeting.title || "Scheduled meeting"}`,
    `Date: ${meeting.date || "TBD"}`,
    `Time: ${meeting.time || "TBD"}`,
    `Venue: ${meeting.venue || "TBD"}`,
    `Link: ${meeting.meetingLink || "Not provided"}`,
    `Recipient: ${recipientText}`,
  ];
  return lines.join("\n");
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (window.Notification.permission === "granted") {
    return "granted";
  }

  if (window.Notification.permission === "denied") {
    return "denied";
  }

  const permission = await window.Notification.requestPermission();
  return permission;
}

export function sendBrowserMeetingNotification(meeting, recipient) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (window.Notification.permission !== "granted") {
    return false;
  }

  const title = `Meeting scheduled: ${meeting.authorityName || meeting.title || "Meeting"}`;
  const body = `${meeting.date || "TBD"} • ${meeting.time || "TBD"}\n${meeting.venue || "Venue TBD"}`;

  new window.Notification(title, { body });
  return true;
}

export function buildMeetingEmailLink(meeting, recipient, emailConfig = null) {
  const resolvedRecipients = Array.isArray(recipient)
    ? recipient.filter(Boolean)
    : (recipient ? String(recipient).split(",").map((item) => item.trim()).filter(Boolean) : []);

  const emailList = resolvedRecipients
    .map((designation) => {
      if (!emailConfig) return "";
      const value = emailConfig[designation];
      return typeof value === "string" ? value.trim() : "";
    })
    .filter(Boolean);

  if (emailList.length === 0) {
    return null;
  }

  const subject = encodeURIComponent(`Meeting notification: ${meeting.authorityName || meeting.title || "Scheduled meeting"}`);
  const body = encodeURIComponent(`Hello,\n\n${buildMeetingNotificationText(meeting, resolvedRecipients)}\n\nRegards,\nKESCO Portal`);
  return `mailto:${emailList.join(",")}?subject=${subject}&body=${body}`;
}
