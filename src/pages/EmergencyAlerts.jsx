import { useState, useEffect, useMemo } from "react";
import {
  getAlerts,
  getAlertById,
  createAlert,
  deleteAlert,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import SocietySelect from "../components/SocietySelect";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import DetailModal from "../components/DetailModal";
import { getErrorMessage } from "../utils/getErrorMessage";

const ITEMS_PER_PAGE = 8;

const EmergencyAlerts = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("High");
  const [society, setSociety] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAlertsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load alerts:", err);
      setError(getErrorMessage(err, "Failed to load emergency alerts."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsList();
  }, []);

  const filteredAlerts = useMemo(() => {
    if (!debouncedSearch.trim()) return alerts;
    const term = debouncedSearch.toLowerCase().trim();
    return alerts.filter((item) => {
      const t = item.title || item.type || "";
      const d = item.description || item.message || "";
      const s =
        typeof item.society === "object"
          ? item.society?.name || ""
          : item.society || "";
      return (
        t.toLowerCase().includes(term) ||
        d.toLowerCase().includes(term) ||
        s.toLowerCase().includes(term)
      );
    });
  }, [alerts, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAlerts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAlerts, currentPage]);

  const handleOpenDetail = async (id, rowData) => {
    setIsDetailOpen(true);
    setDetailItem(rowData);
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const fullDetail = await getAlertById(id);
      if (fullDetail) setDetailItem(fullDetail);
    } catch (err) {
      setDetailError(getErrorMessage(err, "Could not load alert details."));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setCreateError("Alert title and description are required.");
      return;
    }
    if (isSuperAdmin && !society) {
      setCreateError("Please select a society for this alert.");
      return;
    }

    setCreateError(null);
    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        severity,
      };
      if (isSuperAdmin && society) payload.society = society;

      await createAlert(payload);
      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      await fetchAlertsList();
    } catch (err) {
      setCreateError(getErrorMessage(err, "Failed to create emergency alert."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAlert(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchAlertsList();
    } catch (err) {
      alert(getErrorMessage(err, "Failed to delete emergency alert."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Emergency Alerts</h1>
          <p className="page-description">
            Broadcast and monitor urgent security & medical alerts
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchAlertsList}
            disabled={isLoading}
            title="Refresh data"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isLoading ? "spinner-spin" : ""}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16" />
            </svg>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <span>Add Broadcast Alert</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search alerts by title, message, or society..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchTerm("")}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card-box flex-center p-8">
          <LoadingSpinner text="Loading emergency alerts..." />
        </div>
      ) : paginatedAlerts.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Emergency Alerts</h3>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert Title</th>
                  <th>Severity</th>
                  {isSuperAdmin && <th>Society</th>}
                  <th>Status</th>
                  <th>Date & Time</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAlerts.map((item) => {
                  const id = item._id || item.id;
                  const itemTitle = item.title || item.type || "Emergency";
                  const societyName =
                    typeof item.society === "object"
                      ? item.society?.name || "Society"
                      : item.society || "N/A";
                  const status = item.status || "Active";
                  const severityText = item.severity || "Critical";

                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <span className="font-semibold">{itemTitle}</span>
                      </td>
                      <td>
                        <span
                          className="badge-unit"
                          style={{
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                          }}
                        >
                          {severityText}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td>
                          <span className="badge-category">{societyName}</span>
                        </td>
                      )}
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "Recent"}
                      </td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="icon-action-btn icon-action-btn-view"
                            onClick={() => handleOpenDetail(id, item)}
                            title="View"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            className="icon-action-btn icon-action-btn-delete"
                            onClick={() => setDeleteTarget(item)}
                            title="Delete"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredAlerts.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="modal-header">
              <h3>Add Emergency Alert</h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsCreateOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {createError && (
                  <div className="alert alert-danger mb-4">
                    <span>{createError}</span>
                  </div>
                )}
                {isSuperAdmin && (
                  <SocietySelect
                    value={society}
                    onChange={setSociety}
                    required
                  />
                )}
                <div className="form-group mb-4">
                  <label>Quick Alert Type Preset</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value !== "CUSTOM") {
                        setTitle(e.target.value);
                      }
                    }}
                    value={
                      [
                        "Fire Emergency Alert",
                        "Medical Emergency SOS",
                        "Security Breach & Intruder Alert",
                        "Elevator / Lift Trapped Emergency",
                        "Gas Leakage Emergency",
                        "Water Pipeline Burst Alert",
                      ].includes(title)
                        ? title
                        : "CUSTOM"
                    }
                  >
                    <option value="Fire Emergency Alert">
                      Fire Emergency Alert
                    </option>
                    <option value="Medical Emergency SOS">
                      Medical Emergency SOS
                    </option>
                    <option value="Security Breach & Intruder Alert">
                      Security Breach & Intruder Alert
                    </option>
                    <option value="Elevator / Lift Trapped Emergency">
                      Elevator / Lift Trapped Emergency
                    </option>
                    <option value="Gas Leakage Emergency">
                      Gas Leakage Emergency
                    </option>
                    <option value="Water Pipeline Burst Alert">
                      Water Pipeline Burst Alert
                    </option>
                    <option value="CUSTOM">Custom Emergency Alert...</option>
                  </select>
                </div>

                <div className="form-group mb-4">
                  <label>Alert Title (Or Custom)</label>
                  <input
                    type="text"
                    placeholder="e.g. Fire Alarm / Security Breach"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label>Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>

                <div className="form-group mb-4">
                  <label>Alert Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide details about the emergency..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Broadcasting..." : "Send Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Emergency Alert"
        message="Are you sure you want to remove this alert record?"
        confirmText="Delete Alert"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DetailModal
        isOpen={isDetailOpen}
        title="Emergency Alert Details"
        data={detailItem}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};

export default EmergencyAlerts;
