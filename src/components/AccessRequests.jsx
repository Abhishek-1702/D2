import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { readRequests, updateRequestStatus } from "../utils/accessRequests";
import { readSharedJsonFile, writeSharedJsonFile } from "../utils/documentPersistence";

export default function AccessRequests({ onBack }) {
  const { user } = useAuth();
  const OWNER_EMAIL = process.env.REACT_APP_OWNER_EMAIL || null;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const items = await readRequests();
        setRequests(items || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refresh = async () => {
    const items = await readRequests();
    setRequests(items || []);
  };

  const buildEmailLink = (email, subject, body) => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  const saveUserProfileMetadata = async (email, metadata) => {
    const normalizedEmail = email.toLowerCase();
    const existingShared = await readSharedJsonFile("app-data/user-profiles.json");
    const nextShared = {
      ...(existingShared || {}),
      [normalizedEmail]: {
        ...(existingShared?.[normalizedEmail] || {}),
        ...metadata,
      },
    };
    await writeSharedJsonFile("app-data/user-profiles.json", nextShared);
    return nextShared;
  };

  const handleApprove = async (email) => {
    const request = requests.find((r) => r.email === email);
    if (!request) return;

    const tempPassword = `Temp@${Math.random().toString(36).slice(-8)}1`;
    await updateRequestStatus(email, "approved");
    await saveUserProfileMetadata(email, {
      mustChangePassword: true,
      tempPasswordCreatedAt: new Date().toISOString(),
      displayName: request.name,
    });
    await refresh();

    const subject = "Access granted to KESCO dashboard";
    const body = `Hello ${request.name},\n\nYour access request has been approved. Use the following temporary password to sign in:\n\nEmail: ${request.email}\nPassword: ${tempPassword}\n\nAfter signing in, you will be prompted to change your password.\n\nIf you did not request access, please ignore this message.`;
    window.location.href = buildEmailLink(request.email, subject, body);
  };

  const handleReject = async (email) => {
    const request = requests.find((r) => r.email === email);
    if (!request) return;

    await updateRequestStatus(email, "rejected");
    await refresh();

    const subject = "Access request declined";
    const body = `Hello ${request.name},\n\nYour request for access has been declined. If you believe this is a mistake, please contact the admin.\n\nRegards,\nKESCO Portal`;
    window.location.href = buildEmailLink(request.email, subject, body);
  };

  if (!user || !OWNER_EMAIL || user.email !== OWNER_EMAIL) {
    return (
      <div className="px-8 py-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">Access denied.</div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Access requests</h1>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="px-3 py-2 rounded border text-sm">Refresh</button>
          {onBack ? (
            <button onClick={onBack} className="px-3 py-2 rounded border text-sm">Back</button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="text-sm text-gray-500">No access requests.</div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="rounded-lg border p-3 bg-white flex items-center justify-between">
              <div>
                <div className="font-semibold">{r.name} — {r.email}</div>
                <div className="text-xs text-gray-500">{r.designation} • {r.office} • {r.mobile}</div>
                <div className="text-xs text-gray-400 mt-1">Requested: {new Date(r.createdAt).toLocaleString()}</div>
                <div className="text-xs mt-1">Status: <span className="font-medium">{r.status}</span></div>
              </div>
              <div className="flex gap-2">
                {r.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(r.email)} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Grant</button>
                    <button onClick={() => handleReject(r.email)} className="px-3 py-1 rounded bg-gray-100 text-sm">Reject</button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
