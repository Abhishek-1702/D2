import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { readRequests, updateRequestStatus } from "../utils/accessRequests";

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

  const handleApprove = async (email) => {
    await updateRequestStatus(email, "approved");
    await refresh();
    // eslint-disable-next-line no-alert
    alert(`${email} approved`);
  };

  const handleReject = async (email) => {
    await updateRequestStatus(email, "rejected");
    await refresh();
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
