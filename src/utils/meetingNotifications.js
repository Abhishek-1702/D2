import { AUTHORITY_HIERARCHY } from "../data/officers";

export function flattenAuthorityOptions(nodes = [], parentPath = []) {
  return nodes.flatMap((node) => {
    const currentPath = [...parentPath, node.label];
    const entries = [{ label: currentPath.join(" > "), value: currentPath.join(" > ") }];
    if (Array.isArray(node.children) && node.children.length > 0) {
      entries.push(...flattenAuthorityOptions(node.children, currentPath));
    }
    return entries;
  });
}

export function getAuthorityOptions() {
  return flattenAuthorityOptions(AUTHORITY_HIERARCHY);
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

export function buildMeetingEmailLink(meeting, recipient) {
  const notifyEmail = process.env.REACT_APP_MEETING_NOTIFY_EMAIL || process.env.REACT_APP_DEFAULT_NOTIFICATION_EMAIL || "";
  if (!notifyEmail) {
    return null;
  }

  const subject = encodeURIComponent(`Meeting notification: ${meeting.authorityName || meeting.title || "Scheduled meeting"}`);
  const body = encodeURIComponent(`Hello,\n\n${buildMeetingNotificationText(meeting, recipient)}\n\nRegards,\nKESCO Portal`);
  return `mailto:${notifyEmail}?subject=${subject}&body=${body}`;
}
