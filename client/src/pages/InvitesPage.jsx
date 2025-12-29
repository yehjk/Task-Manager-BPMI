// /client/src/pages/InvitesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/api-client.js";
import { useBoardStore } from "../store/board-store.js";
import { useToast } from "../components/ToastProvider.jsx";

export function InvitesPage() {
  const { showToast } = useToast();
  const { boards, loadBoards } = useBoardStore();

  const [tab, setTab] = useState("incoming");
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [error, setError] = useState("");

  const boardNameById = useMemo(() => {
    const m = new Map();
    for (const b of boards) m.set(b.id, b.name);
    return m;
  }, [boards]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      if (!boards.length) await loadBoards();

      const list = await apiClient.get(`/invites?type=${encodeURIComponent(tab)}&status=all`);
      setInvites(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const accept = async (inviteId) => {
    try {
      await apiClient.post(`/invites/${inviteId}/accept`, {});
      showToast("Invite accepted", { variant: "success" });
      await load();
    } catch (e) {
      showToast(e.message || "Accept failed", { variant: "danger" });
    }
  };

  const revoke = async (inviteId) => {
    try {
      await apiClient.post(`/invites/${inviteId}/revoke`, {});
      showToast("Invite revoked", { variant: "info" });
      await load();
    } catch (e) {
      showToast(e.message || "Revoke failed", { variant: "danger" });
    }
  };

  const badge = (status) => {
    if (status === "pending") return "bg-warning text-dark";
    if (status === "accepted") return "bg-success";
    if (status === "revoked") return "bg-secondary";
    return "bg-light text-dark";
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <h4 className="mb-0">Invitations</h4>
          <div className="btn-group btn-group-sm ms-2">
            <button
              className={"btn " + (tab === "incoming" ? "btn-primary" : "btn-outline-primary")}
              onClick={() => setTab("incoming")}
            >
              Incoming
            </button>
            <button
              className={"btn " + (tab === "outgoing" ? "btn-primary" : "btn-outline-primary")}
              onClick={() => setTab("outgoing")}
            >
              Outgoing
            </button>
          </div>
        </div>

        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
          <i className="mdi mdi-refresh me-1" />
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small">{error}</div>}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      ) : invites.length === 0 ? (
        <div className="alert alert-info">No invites.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {invites.map((i) => {
            const boardName = boardNameById.get(i.boardId) || i.boardId;

            return (
              <div key={i.id} className="card shadow-sm">
                <div className="card-body d-flex justify-content-between align-items-center gap-3">
                  <div>
                    <div className="fw-semibold d-flex align-items-center gap-2">
                      <span>{i.email}</span>
                      <span className={"badge " + badge(i.status)}>{i.status}</span>
                    </div>

                    <div className="small text-muted mt-1">
                      Board: <span className="fw-semibold">{boardName}</span>
                    </div>

                    <div className="small text-muted">
                      From: <code>{i.invitedByEmail}</code>
                    </div>

                    <div className="small text-muted">
                      Created: {i.createdAt ? new Date(i.createdAt).toLocaleString() : "—"}
                      {i.acceptedAt ? ` • Accepted: ${new Date(i.acceptedAt).toLocaleString()}` : ""}
                      {i.revokedAt ? ` • Revoked: ${new Date(i.revokedAt).toLocaleString()}` : ""}
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    {tab === "incoming" && i.status === "pending" && (
                      <button className="btn btn-primary btn-sm" onClick={() => accept(i.id)}>
                        Accept
                      </button>
                    )}

                    {tab === "outgoing" && i.status === "pending" && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => revoke(i.id)}>
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
