import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { readRequests, readCachedRequests, updateRequestStatus, clearAllRequests } from "../utils/accessRequests";
import { readSharedJsonFile, writeSharedJsonFile } from "../utils/documentPersistence";
import { isFirebaseConfigured, createFirebaseUser } from "../firebase";
import { registerAuthorityOption } from "../data/officers";

export default function AccessRequests({ onBack }) {
  const { user } = useAuth();
  const OWNER_EMAIL = process.env.REACT_APP_OWNER_EMAIL || null;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);

  const refresh = async () => {
    try {
      const items = await readRequests();
      setRequests(items || []);
    } catch (error) {
      console.error('Failed to refresh access requests', error);
    }
  };

  useEffect(() => {
    const cached = readCachedRequests();
    if (cached.length) {
      setRequests(cached);
    }

    const load = async () => {
      setLoading(true);
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handleRefresh = (event) => {
      if (event?.detail?.requests) {
        setRequests(event.detail.requests);
        return;
      }
      if (event?.type === 'storage') {
        const cached = readCachedRequests();
        setRequests(cached);
        return;
      }
      refresh();
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('kesco-access-requests-updated', handleRefresh);
    const interval = setInterval(refresh, 10000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('kesco-access-requests-updated', handleRefresh);
    };
  }, []);

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
    if (!request || processingRequest) return;
    setProcessingRequest(email);

    const tempPassword = `Temp@${Math.random().toString(36).slice(-8)}1`;
    const requestedDesignation = (request.designation || request.rawDesignation || "").trim();
    if (requestedDesignation) {
      registerAuthorityOption(requestedDesignation);
    }
    let firebaseUserCreated = false;

    try {
      if (isFirebaseConfigured) {
        try {
          await createFirebaseUser(request.email, tempPassword);
          firebaseUserCreated = true;
        } catch (error) {
          if (error?.code === 'EMAIL_EXISTS' || error?.code === 'auth/email-already-in-use') {
            console.warn('Firebase user already exists for approved request', request.email);
            firebaseUserCreated = true;
          } else {
            throw error;
          }
        }
      }

      await updateRequestStatus(email, "approved");
      setRequests((prev) => prev.map((r) => (r.email === email ? { ...r, status: 'approved' } : r)));
      await saveUserProfileMetadata(email, {
        mustChangePassword: true,
        tempPasswordCreatedAt: new Date().toISOString(),
        displayName: request.name,
        firebaseUserCreated,
      });

      const subject = "Access granted to KESCO dashboard";
      const body = `Hello ${request.name},\n\nYour access request has been approved. Use the following temporary password to sign in:\n\nEmail: ${request.email}\nPassword: ${tempPassword}\n\nAfter signing in, you will be prompted to change your password.\n\nIf you did not request access, please ignore this message.`;
      window.location.href = buildEmailLink(request.email, subject, body);
    } catch (error) {
      console.error('Approve failed', error);
      // eslint-disable-next-line no-alert
      alert(`Unable to approve request: ${error?.message || error}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (email) => {
    const request = requests.find((r) => r.email === email);
    if (!request || processingRequest) return;
    setProcessingRequest(email);

    try {
      await updateRequestStatus(email, "rejected");
      setRequests((prev) => prev.map((r) => (r.email === email ? { ...r, status: 'rejected' } : r)));

      const subject = "Access request declined";
      const body = `Hello ${request.name},\n\nYour request for access has been declined. If you believe this is a mistake, please contact the admin.\n\nRegards,\nKESCO Portal`;
      window.location.href = buildEmailLink(request.email, subject, body);
    } catch (error) {
      console.error('Reject failed', error);
      // eslint-disable-next-line no-alert
      alert(`Unable to reject request: ${error?.message || error}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  if (!user || !OWNER_EMAIL || user.email !== OWNER_EMAIL) {
    return (
      <div className="px-8 py-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">Access denied.</div>
      </div>
    );
  }

  const handleClearAll = async () => {
    if (!window.confirm('Clear all access requests?')) return;
    await clearAllRequests();
    setRequests([]);
  };

  return (
    <div className="px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Access requests</h1>
          <p className="text-sm text-gray-500">Manage pending requests and grant or reject access from the admin portal.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={refresh} className="px-3 py-2 rounded border text-sm btn-press">Refresh</button>
          <button onClick={handleClearAll} className="px-3 py-2 rounded border bg-red-50 text-sm text-red-700 btn-press">Clear all</button>
          {onBack ? (
            <button onClick={onBack} className="px-3 py-2 rounded border text-sm btn-press">Back</button>
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
                {r.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleApprove(r.email)}
                      disabled={Boolean(processingRequest)}
                      className={`px-3 py-1 rounded text-sm font-semibold btn-press ${processingRequest ? 'cursor-not-allowed opacity-60' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                      {processingRequest === r.email ? 'Approving...' : 'Grant'}
                    </button>
                    <button
                      onClick={() => handleReject(r.email)}
                      disabled={Boolean(processingRequest)}
                      className={`px-3 py-1 rounded text-sm btn-press ${processingRequest ? 'cursor-not-allowed opacity-60 bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {processingRequest === r.email ? 'Rejecting...' : 'Reject'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
