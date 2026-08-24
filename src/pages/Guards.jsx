import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getGuards,
  getGuardById,
  createGuard,
  updateGuard,
  deleteGuard,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { normalizePlanLimits, formatPlanLabel } from "../utils/planUtils";
import { useDebounce } from "../hooks/useDebounce";
import SocietySelect from "../components/SocietySelect";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import DetailModal from "../components/DetailModal";
import { getErrorMessage } from "../utils/getErrorMessage";

const ITEMS_PER_PAGE = 8;

const Guards = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [guards, setGuards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const planLimits = normalizePlanLimits(user);
  const currentGuardCount = guards.length;
  const canCreateGuard =
    isSuperAdmin || currentGuardCount < planLimits.maxGuards;

  // Search & Pagination
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  
  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch !== null) {
      setSearchTerm(querySearch);
    }
  }, [searchParams]);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail Modal state
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form Modal state (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formName, setFormName] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formSociety, setFormSociety] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchGuardsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getGuards();
      setGuards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load guards:", err);
      setError(getErrorMessage(err, "Failed to load security guards roster."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardsList();
  }, []);

  // Filter guards client-side by debounced search query
  const filteredGuards = useMemo(() => {
    if (!debouncedSearch.trim()) return guards;
    const term = debouncedSearch.toLowerCase().trim();
    return guards.filter((guard) => {
      const name = guard.name || guard.fullName || "";
      const empId = guard.employeeId || guard.empId || "";
      const phone = guard.phone || guard.mobile || "";
      const societyName =
        typeof guard.society === "object"
          ? guard.society?.name || ""
          : guard.society || "";
      return (
        name.toLowerCase().includes(term) ||
        String(empId).toLowerCase().includes(term) ||
        phone.toLowerCase().includes(term) ||
        societyName.toLowerCase().includes(term)
      );
    });
  }, [guards, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredGuards.length / ITEMS_PER_PAGE);
  const paginatedGuards = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGuards.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGuards, currentPage]);

  const handleOpenCreate = () => {
    if (!canCreateGuard) {
      setFormError(
        `Guard creation limit reached. Your plan allows ${planLimits.maxGuards === Infinity ? "Unlimited" : planLimits.maxGuards} guards.`,
      );
      return;
    }

    setEditingItem(null);
    setFormName("");
    setFormEmployeeId("");
    setFormPhone("");
    setFormPassword("");
    setFormSociety("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormName(item.name || item.fullName || "");
    setFormEmployeeId(item.employeeId || item.empId || "");
    setFormPhone(item.phone || item.mobile || "");
    setFormPassword("");
    setFormSociety(
      typeof item.society === "object"
        ? item.society?._id || item.society?.id || ""
        : item.society || "",
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveGuard = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmployeeId.trim()) {
      setFormError("Please fill in guard name and employee ID.");
      return;
    }

    if (!editingItem && !formPassword.trim()) {
      setFormError("Password is required when creating a new guard.");
      return;
    }

    if (formPassword.trim() && formPassword.trim().length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (isSuperAdmin && !formSociety) {
      setFormError("Please select a society for this guard.");
      return;
    }
    if (!isSuperAdmin && !canCreateGuard && !editingItem) {
      setFormError(
        `Guard creation limit reached. Your plan allows ${planLimits.maxGuards === Infinity ? "Unlimited" : planLimits.maxGuards} guards.`,
      );
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        name: formName.trim(),
        employeeId: formEmployeeId.trim(),
        phone: formPhone.trim(),
      };
      if (formPassword.trim()) payload.password = formPassword.trim();
      if (isSuperAdmin && formSociety) payload.society = formSociety;

      if (editingItem) {
        await updateGuard(editingItem._id || editingItem.id, payload);
      } else {
        await createGuard(payload);
      }

      setIsModalOpen(false);
      await fetchGuardsList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingItem
            ? "Failed to update guard."
            : "Failed to create security guard.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDetail = async (id, rowData) => {
    setIsDetailOpen(true);
    setDetailItem(rowData);
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const fullDetail = await getGuardById(id);
      if (fullDetail) {
        setDetailItem(fullDetail);
      }
    } catch (err) {
      console.error("Failed to fetch guard detail:", err);
      setDetailError(
        getErrorMessage(err, "Could not load full security guard profile."),
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteGuard(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchGuardsList();
    } catch (err) {
      console.error("Failed to delete security guard:", err);
      alert(getErrorMessage(err, "Failed to delete security guard record."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Guards Roster</h1>
          <p className="page-description">
            Monitor and manage security personnel deployment and shifts
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchGuardsList}
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
            <span>Add Guard</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search guards by name, employee ID, phone..."
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
        <div className="alert alert-danger my-4">
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card-box flex-center p-8">
          <LoadingSpinner text="Loading security personnel roster..." />
        </div>
      ) : paginatedGuards.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Guards Found</h3>
          <p className="text-muted">
            {searchTerm
              ? "No guards matched your search filters."
              : "There are currently no security guards registered."}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guard Name</th>
                  <th>Employee ID</th>
                  <th>Phone Number</th>
                  {isSuperAdmin && <th>Society</th>}
                  <th>Duty Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGuards.map((item) => {
                  const id = item._id || item.id;
                  const name = item.name || item.fullName || "N/A";
                  const empId = item.employeeId || item.empId || "N/A";
                  const phone = item.phone || item.mobile || "N/A";
                  const societyName =
                    typeof item.society === "object"
                      ? item.society?.name || "Society"
                      : item.society || "N/A";
                  const status = item.status || "Active";

                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <div className="user-name-cell">
                          <div className="mini-avatar avatar-emerald">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-unit">{empId}</span>
                      </td>
                      <td>{phone}</td>
                      {isSuperAdmin && (
                        <td>
                          <span className="badge-category">{societyName}</span>
                        </td>
                      )}
                      <td>
                        <StatusBadge status={status} />
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
                            className="icon-action-btn icon-action-btn-edit"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit"
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
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
            totalItems={filteredGuards.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      )}

      {/* Form Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="modal-header">
              <h3>
                {editingItem ? "Edit Security Guard" : "Add New Security Guard"}
              </h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveGuard}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger mb-4">
                    <span>{formError}</span>
                  </div>
                )}

                {isSuperAdmin && (
                  <SocietySelect
                    id="guardSociety"
                    value={formSociety}
                    onChange={setFormSociety}
                    required
                  />
                )}

                <div className="form-group mb-4">
                  <label htmlFor="guardName">Guard Name</label>
                  <input
                    id="guardName"
                    type="text"
                    placeholder="Enter guard full name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="guardEmpId">Employee ID</label>
                  <input
                    id="guardEmpId"
                    type="text"
                    placeholder="e.g. SEC-1042"
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="guardPhone">Phone Number (Optional)</label>
                  <input
                    id="guardPhone"
                    type="text"
                    placeholder="Enter phone number"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="guardPassword">
                    Password{" "}
                    {editingItem && (
                      <span className="text-muted" style={{ fontWeight: 400 }}>
                        (leave blank to keep current)
                      </span>
                    )}
                  </label>
                  <input
                    id="guardPassword"
                    type="password"
                    placeholder={
                      editingItem
                        ? "New password (optional)"
                        : "Create login password (min 6 chars)"
                    }
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={!editingItem}
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
                      ? "Update Guard"
                      : "Create Guard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Guard Record"
        message={`Are you sure you want to delete security guard "${deleteTarget?.name || deleteTarget?.fullName || "this guard"}"?`}
        confirmText="Delete Guard"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Detail View Modal */}
      <DetailModal
        isOpen={isDetailOpen}
        title="Guard Personnel Profile"
        data={detailItem}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};

export default Guards;
