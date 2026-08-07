import { useState, useEffect, useMemo } from "react";
import {
  getSocieties,
  createSociety,
  updateSociety,
  deleteSociety,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import { normalizePlanLimits, formatPlanLabel } from "../utils/planUtils";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";
import { getErrorMessage } from "../utils/getErrorMessage";

const ITEMS_PER_PAGE = 8;

const Societies = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const canManageSocieties = isSuperAdmin || user?.role === "admin";

  const [societies, setSocieties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const planLimits = normalizePlanLimits(user);
  const currentSocietyCount = societies.length;
  const canCreateSociety =
    isSuperAdmin || currentSocietyCount < planLimits.maxSocieties;

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [towers, setTowers] = useState("");
  const [controlRoomPhone, setControlRoomPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSocietiesList = async () => {
    if (!canManageSocieties) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSocieties();
      setSocieties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load societies:", err);
      setError(getErrorMessage(err, "Failed to load societies list."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocietiesList();
  }, [isSuperAdmin]);

  // Filtered List
  const filteredSocieties = useMemo(() => {
    if (!debouncedSearch.trim()) return societies;
    const term = debouncedSearch.toLowerCase().trim();
    return societies.filter((s) => {
      const n = s.name || "";
      const a = s.address || "";
      const p = s.controlRoomPhone || s.phone || "";
      return (
        n.toLowerCase().includes(term) ||
        a.toLowerCase().includes(term) ||
        p.toLowerCase().includes(term)
      );
    });
  }, [societies, debouncedSearch]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Paginated List
  const totalPages = Math.ceil(filteredSocieties.length / ITEMS_PER_PAGE);
  const paginatedSocieties = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSocieties.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSocieties, currentPage]);

  const handleOpenCreate = () => {
    if (!canCreateSociety) {
      setFormError(
        `Society creation limit reached. Your plan allows ${planLimits.maxSocieties === Infinity ? "Unlimited" : planLimits.maxSocieties} societies.`,
      );
      return;
    }

    setEditingItem(null);
    setName("");
    setAddress("");
    setTowers("");
    setControlRoomPhone("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name || "");
    setAddress(item.address || "");
    setTowers(
      Array.isArray(item.towers) ? item.towers.join(", ") : item.towers || "",
    );
    setControlRoomPhone(item.controlRoomPhone || item.phone || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Society name is required.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        towers: towers
          ? towers
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        controlRoomPhone: controlRoomPhone.trim(),
      };

      if (editingItem) {
        await updateSociety(editingItem._id || editingItem.id, payload);
      } else {
        await createSociety(payload);
      }

      setIsModalOpen(false);
      await fetchSocietiesList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingItem
            ? "Failed to update society."
            : "Failed to create society.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSociety(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchSocietiesList();
    } catch (err) {
      console.error("Failed to delete society:", err);
      alert(getErrorMessage(err, "Failed to delete society."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canManageSocieties) {
    return (
      <div className="page-container">
        <div className="card-box empty-state-box">
          <h3>Access Restricted</h3>
          <p className="text-muted">
            Super Admin or Admin privileges required to manage societies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registered Societies</h1>
          <p className="page-description">
            Manage housing complexes, towers, and security control rooms
          </p>
          {!isSuperAdmin && (
            <p className="text-muted" style={{ marginTop: "6px" }}>
              Societies used:{" "}
              <strong>
                {currentSocietyCount}/
                {planLimits.maxSocieties === Infinity
                  ? "Unlimited"
                  : planLimits.maxSocieties}
              </strong>{" "}
              • Plan: <strong>{formatPlanLabel(planLimits)}</strong>
            </p>
          )}
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchSocietiesList}
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
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <span>Add Society</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search societies by name, address, or phone..."
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
          <LoadingSpinner text="Loading societies directory..." />
        </div>
      ) : paginatedSocieties.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Societies Found</h3>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Society Name</th>
                  <th>Address</th>
                  <th>Towers / Wings</th>
                  <th>Control Room Phone</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSocieties.map((item) => {
                  const id = item._id || item.id;
                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <span className="font-semibold">{item.name}</span>
                      </td>
                      <td>{item.address || "N/A"}</td>
                      <td>
                        {Array.isArray(item.towers) &&
                        item.towers.length > 0 ? (
                          <span className="badge-unit">
                            {item.towers.join(", ")}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td>{item.controlRoomPhone || item.phone || "N/A"}</td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleOpenEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(item)}
                          >
                            Delete
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
            totalItems={filteredSocieties.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="modal-header">
              <h3>
                {editingItem ? "Edit Society Details" : "Add New Society"}
              </h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger mb-4">
                    <span>{formError}</span>
                  </div>
                )}
                <div className="form-group mb-4">
                  <label>Society Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Towers (comma-separated, e.g. Tower A, Tower B)</label>
                  <input
                    type="text"
                    value={towers}
                    onChange={(e) => setTowers(e.target.value)}
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Control Room Phone</label>
                  <input
                    type="text"
                    value={controlRoomPhone}
                    onChange={(e) => setControlRoomPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingItem
                      ? "Update Society"
                      : "Create Society"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Society"
        message={`Are you sure you want to delete society "${deleteTarget?.name}"?`}
        confirmText="Delete"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Societies;
