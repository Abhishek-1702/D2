import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { readRequests, readCachedRequests, updateRequestStatus, clearAllRequests, forceRemoteSync, deleteRequest, subscribeToAccessRequestChanges } from "../utils/accessRequests";
import { readSharedJsonFile, writeSharedJsonFile } from "../utils/documentPersistence";
import { isFirebaseConfigured, createFirebaseUser } from "../firebase";
import { registerAuthorityOption } from "../data/officers";
import { sendAutomatedEmail } from "../utils/emailSender";

const generateStrongPassword = () => {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const all = `${lower}${upper}${digits}${symbols}`;

  const ensure = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  let password = ensure.concat(Array.from({ length: 12 }, () => all[Math.floor(Math.random() * all.length)])).join("");
  password = password.split("").sort(() => 0.5 - Math.random()).join("");
  return password;
};

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
    let active = true;

    const refreshIfActive = async () => {
      if (!active) return;
      await refresh();
    };

    const handleRefresh = async (event) => {
      if (event?.detail?.requests) {
        setRequests(event.detail.requests);
        return;
      }

      if (event?.type === 'storage') {
        if (event.key && !['kesco_access_requests_v1', 'kesco_access_requests_sync_v1'].includes(event.key)) {
          return;
        }
      }

      await refreshIfActive();
    };

    const unsubscribeFromRemote = subscribeToAccessRequestChanges(() => {
      void refreshIfActive();
    });

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('kesco-access-requests-updated', handleRefresh);
    const interval = setInterval(refreshIfActive, 10000);
    return () => {
      active = false;
      clearInterval(interval);
      unsubscribeFromRemote();
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('kesco-access-requests-updated', handleRefresh);
    };
  }, []);

  const sendAccessDecisionEmail = async (email, subject, body, decisionType, recipientName) => {
    const result = await sendAutomatedEmail({
      to: email,
      subject,
      message: body,
      templateId: process.env.REACT_APP_EMAILJS_ACCESS_TEMPLATE_ID,
      templateParams: {
        to_email: email,
        subject,
        message: body,
        decision_type: decisionType,
        recipient_name: recipientName || email,
      },
    });

    if (result.ok) {
      return result;
    }

    return result;
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

    const tempPassword = generateStrongPassword();
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
      await refresh();
      await saveUserProfileMetadata(email, {
        mustChangePassword: true,
        tempPasswordCreatedAt: new Date().toISOString(),
        displayName: request.name,
        firebaseUserCreated,
      });

      const subject = "Access granted to KESCO dashboard";
      const body = `Hello ${request.name},\n\nYour access request has been approved. Use the following temporary password to sign in:\n\nEmail: ${request.email}\nPassword: ${tempPassword}\n\nAfter signing in, you will be prompted to change your password.\n\nIf you did not request access, please ignore this message.`;
      await sendAccessDecisionEmail(request.email, subject, body, "approved", request.name);
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
      await refresh();

      const subject = "Access request declined";
      const body = `Hello ${request.name},\n\nYour request for access has been declined. If you believe this is a mistake, please contact the admin.\n\nRegards,\nKESCO Portal`;
      await sendAccessDecisionEmail(request.email, subject, body, "rejected", request.name);
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
    await refresh();
  };

  const handleSyncNow = async () => {
    if (!window.confirm('Force sync now from remote?')) return;
    setLoading(true);
    try {
      const result = await forceRemoteSync();
      if (result && Array.isArray(result)) {
        setRequests(result);
        // eslint-disable-next-line no-alert
        alert(`Synced ${result.length} requests from remote.`);
      } else {
        // eslint-disable-next-line no-alert
        alert('Sync failed or returned no data. Check console for details.');
      }
    } catch (e) {
      console.error('Sync now failed', e);
      // eslint-disable-next-line no-alert
      alert(`Sync failed: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (identifier) => {
    if (!window.confirm('Remove this request permanently?')) return;
    setLoading(true);
    try {
      await deleteRequest(identifier);
      await refresh();
    } catch (e) {
      console.error('Delete request failed', e);
      // eslint-disable-next-line no-alert
      alert(`Unable to delete request: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
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
          <button onClick={handleSyncNow} className="px-3 py-2 rounded border bg-blue-50 text-sm text-blue-700 btn-press">Sync now</button>
          <button onClick={handleClearAll} className="px-3 py-2 rounded border bg-red-50 text-sm text-red-700 btn-press">Clear all</button>
          {onBack ? (
            <button onClick={onBack} className="px-3 py-2 rounded border text-sm btn-press">Back</button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : (
          <>
            {requests.length === 0 ? (
              <div className="text-sm text-gray-500">No access requests.</div>
            ) : null}

            <div className="space-y-3">
              {requests.filter((r) => r.status === 'pending').map((r) => (
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
              ))}
            </div>

            {requests.some((r) => r.status === 'approved') ? (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="mb-3 text-sm font-semibold text-blue-900">Approved requests</div>
                <div className="space-y-3">
                  {requests.filter((r) => r.status === 'approved').map((r) => (
                    <div key={r.id} className="rounded-lg border border-blue-100 bg-white p-3">
                      <div className="font-semibold text-blue-700">{r.name} — {r.email}</div>
                      <div className="text-xs text-gray-500">{r.designation} • {r.office} • {r.mobile}</div>
                      <div className="text-xs text-gray-400 mt-1">Requested: {new Date(r.createdAt).toLocaleString()}</div>
                      <div className="text-xs mt-1">Status: <span className="font-medium text-blue-700">{r.status}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {requests.some((r) => r.status === 'rejected') ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="mb-3 text-sm font-semibold text-red-900">Rejected requests</div>
                <div className="space-y-3">
                  {requests.filter((r) => r.status === 'rejected').map((r) => (
                    <div key={r.id} className="rounded-lg border border-red-100 bg-white p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-red-700">{r.name} — {r.email}</div>
                        <div className="text-xs text-gray-500">{r.designation} • {r.office} • {r.mobile}</div>
                        <div className="text-xs text-gray-400 mt-1">Requested: {new Date(r.createdAt).toLocaleString()}</div>
                      </div>
                      <div>
                        <button
                          onClick={() => handleDeleteRequest(r.email)}
                          className="text-red-500 px-2 py-1 rounded hover:bg-red-50"
                          aria-label="Delete request"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
