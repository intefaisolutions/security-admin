import { useState, useEffect, useMemo } from "react";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import { getErrorMessage } from "../utils/getErrorMessage";

const ITEMS_PER_PAGE = 8;

const LIMIT_FIELDS = [
  { key: "maxSubAdmins", label: "Sub-Admins" },
  { key: "maxSocieties", label: "Societies" },
  { key: "maxGuards", label: "Security Guards" },
  { key: "maxServices", label: "Local Services" },
  { key: "maxResidents", label: "Residents" },
];

const STATUS_OPTIONS = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const formatLimit = (val) => {
  if (val === undefined || val === null || val === "") return "Unlimited";
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : "Unlimited";
};

const formatPrice = (val) => {
  if (val === undefined || val === null || val === "") return "N/A";
  const n = Number(val);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "N/A";
};

// Extract limits from a plan document (supports both flat and nested `limits` shape)
const extractLimits = (plan) => {
  const limits = plan?.limits || plan || {};
  return {
    maxSubAdmins: limits.maxSubAdmins ?? limits.subAdminLimit ?? null,
    maxSocieties: limits.maxSocieties ?? limits.societyLimit ?? null,
    maxGuards: limits.maxGuards ?? limits.guardLimit ?? null,
    maxServices: limits.maxServices ?? limits.serviceLimit ?? null,
    maxResidents: limits.maxResidents ?? limits.residentLimit ?? null,
  };
};

const Plans = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMonthlyPrice, setFormMonthlyPrice] = useState("");
  const [formYearlyPrice, setFormYearlyPrice] = useState("");
  const [formLimits, setFormLimits] = useState({
    maxSubAdmins: "",
    maxSocieties: "",
    maxGuards: "",
    maxServices: "",
    maxResidents: "",
  });
  const [formStatus, setFormStatus] = useState("active");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlansList = async () => {
    if (!isSuperAdmin) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load plans:", err);
      setError(getErrorMessage(err, "Failed to load subscription plans."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansList();
  }, [isSuperAdmin]);

  // Client-side search filter
  const filteredPlans = useMemo(() => {
    if (!debouncedSearch.trim()) return plans;
    const term = debouncedSearch.toLowerCase().trim();
    return plans.filter((plan) => {
      const name = plan.name || plan.planName || plan.title || "";
      const desc = plan.description || "";
      return (
        name.toLowerCase().includes(term) || desc.toLowerCase().includes(term)
      );
    });
  }, [plans, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredPlans.length / ITEMS_PER_PAGE);
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlans.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPlans, currentPage]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormName("");
    setFormDescription("");
    setFormMonthlyPrice("");
    setFormYearlyPrice("");
    setFormLimits({
      maxSubAdmins: "",
      maxSocieties: "",
      maxGuards: "",
      maxServices: "",
      maxResidents: "",
    });
    setFormStatus("active");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormName(plan.name || plan.planName || plan.title || "");
    setFormDescription(plan.description || "");
    setFormMonthlyPrice(
      plan.monthlyPrice !== undefined && plan.monthlyPrice !== null
        ? String(plan.monthlyPrice)
        : "",
    );
    setFormYearlyPrice(
      plan.yearlyPrice !== undefined && plan.yearlyPrice !== null
        ? String(plan.yearlyPrice)
        : "",
    );
    const limits = extractLimits(plan);
    setFormLimits({
      maxSubAdmins:
        limits.maxSubAdmins !== null ? String(limits.maxSubAdmins) : "",
      maxSocieties:
        limits.maxSocieties !== null ? String(limits.maxSocieties) : "",
      maxGuards: limits.maxGuards !== null ? String(limits.maxGuards) : "",
      maxServices:
        limits.maxServices !== null ? String(limits.maxServices) : "",
      maxResidents:
        limits.maxResidents !== null ? String(limits.maxResidents) : "",
    });
    setFormStatus(plan.status || "active");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleLimitChange = (key, value) => {
    setFormLimits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Plan name is required.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const buildLimits = () => {
        const limits = {};
        for (const field of LIMIT_FIELDS) {
          const raw = formLimits[field.key];
          if (raw !== "" && raw !== null && raw !== undefined) {
            limits[field.key] = Number(raw);
          }
        }
        return limits;
      };

      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        monthlyPrice:
          formMonthlyPrice !== "" ? Number(formMonthlyPrice) : undefined,
        yearlyPrice:
          formYearlyPrice !== "" ? Number(formYearlyPrice) : undefined,
        limits: buildLimits(),
        status: formStatus,
      };

      if (editingPlan) {
        await updatePlan(editingPlan._id || editingPlan.id, payload);
      } else {
        await createPlan(payload);
      }

      setIsModalOpen(false);
      await fetchPlansList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingPlan ? "Failed to update plan." : "Failed to create plan.",
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
      await deletePlan(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchPlansList();
    } catch (err) {
      console.error("Failed to delete plan:", err);
      alert(getErrorMessage(err, "Failed to delete plan."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="page-container">
        <div className="card-box empty-state-box">
          <h3>Access Restricted</h3>
          <p className="text-muted">
            Super Admin privileges are required to manage subscription plans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Plans</h1>
          <p className="page-description">
            Create and manage monthly / yearly plans with feature limits
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchPlansList}
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
            <span>Add Plan</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search plans by name or description..."
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
          <LoadingSpinner text="Loading subscription plans..." />
        </div>
      ) : paginatedPlans.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Plans Found</h3>
          <p className="text-muted">
            {searchTerm
              ? "No plans matched your search filters."
              : "There are currently no subscription plans. Create your first plan to get started."}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Monthly</th>
                  <th>Yearly</th>
                  <th>Limits (Sub/Soc/Guard/Svc/Res)</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlans.map((item) => {
                  const id = item._id || item.id;
                  const name = item.name || item.planName || item.title || "N/A";
                  const limits = extractLimits(item);
                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <div className="user-name-cell">
                          <div className="mini-avatar avatar-purple">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-category">
                          {formatPrice(item.monthlyPrice)} / mo
                        </span>
                      </td>
                      <td>
                        <span className="badge-category">
                          {formatPrice(item.yearlyPrice)} / yr
                        </span>
                      </td>
                      <td>
                        <span className="badge-unit" style={{ fontSize: "0.75rem" }}>
                          {formatLimit(limits.maxSubAdmins)} /{" "}
                          {formatLimit(limits.maxSocieties)} /{" "}
                          {formatLimit(limits.maxGuards)} /{" "}
                          {formatLimit(limits.maxServices)} /{" "}
                          {formatLimit(limits.maxResidents)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={item.status || "Active"} />
                      </td>
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
            totalItems={filteredPlans.length}
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
            style={{ maxWidth: "560px" }}
          >
            <div className="modal-header">
              <h3>{editingPlan ? "Edit Plan" : "Create New Plan"}</h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePlan}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger mb-4">
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group mb-4">
                  <label htmlFor="planName">Plan Name</label>
                  <input
                    id="planName"
                    type="text"
                    placeholder="e.g. Basic, Pro, Enterprise"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="planDescription">Description</label>
                  <textarea
                    id="planDescription"
                    rows={2}
                    placeholder="Short description of this plan"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="dashboard-content-grid" style={{ gap: "12px" }}>
                  <div className="form-group">
                    <label htmlFor="planMonthlyPrice">Monthly Price ($)</label>
                    <input
                      id="planMonthlyPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 49.99"
                      value={formMonthlyPrice}
                      onChange={(e) => setFormMonthlyPrice(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="planYearlyPrice">Yearly Price ($)</label>
                    <input
                      id="planYearlyPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 499.99"
                      value={formYearlyPrice}
                      onChange={(e) => setFormYearlyPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label>Resource Limits</label>
                  <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "0", marginBottom: "10px" }}>
                    Leave blank for unlimited. These limits apply to each admin
                    subscribed to this plan.
                  </p>
                  <div
                    className="permissions-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {LIMIT_FIELDS.map((field) => (
                      <div className="form-group" key={field.key}>
                        <label style={{ fontSize: "0.8rem" }}>{field.label}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Unlimited"
                          value={formLimits[field.key]}
                          onChange={(e) =>
                            handleLimitChange(field.key, e.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="planStatus">Status</label>
                  <select
                    id="planStatus"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "var(--bg-dark)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                    }}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                    ? editingPlan
                      ? "Updating..."
                      : "Creating..."
                    : editingPlan
                      ? "Update Plan"
                      : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Plan"
        message={`Are you sure you want to delete plan "${deleteTarget?.name || deleteTarget?.planName || "this plan"}"?`}
        confirmText="Delete Plan"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Plans;
