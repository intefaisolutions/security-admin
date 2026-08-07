import { useState, useEffect, useMemo } from "react";
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getPlans,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import SocietySelect from "../components/SocietySelect";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import { getErrorMessage } from "../utils/getErrorMessage";
import {
  normalizePlanLimits,
  formatPlanLabel,
  buildPlanPayload,
} from "../utils/planUtils";

const ITEMS_PER_PAGE = 8;

const ACCESS_OPTIONS = [
  { key: "residents", label: "Residents" },
  { key: "guards", label: "Security Guards" },
  { key: "visitors", label: "Visitors" },
  { key: "services", label: "Local Services" },
  { key: "news", label: "Community News" },
  { key: "alerts", label: "Emergency Alerts" },
  { key: "familyMembers", label: "Family Members" },
];

const ROLE_OPTIONS = [
  { key: "admin", label: "Admin (System Admin)" },
  { key: "sub_admin", label: "Sub Admin (Restricted Access)" },
  { key: "secretary", label: "Society Secretary" },
];

const PLAN_CYCLE_OPTIONS = [
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

const Admins = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const canManageAdmins = isSuperAdmin || user?.role === "admin";
  const userSocietyId =
    typeof user?.society === "object"
      ? user?.society?._id || user?.society?.id || ""
      : user?.society || "";
  const isAdminUser = user?.role === "admin";
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formSociety, setFormSociety] = useState("");
  const [formRole, setFormRole] = useState("sub_admin");
  const [formPermissions, setFormPermissions] = useState([]);
  const [formPlanCycle, setFormPlanCycle] = useState("monthly");
  const [formPlanId, setFormPlanId] = useState("");
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAdminsList = async () => {
    if (!canManageAdmins) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdmins();
      const adminList = Array.isArray(data) ? data : [];
      setAdmins(
        isSuperAdmin
          ? adminList
          : adminList.filter((adminItem) => {
              const adminSocietyId =
                typeof adminItem.society === "object"
                  ? adminItem.society?._id || adminItem.society?.id || ""
                  : adminItem.society || "";
              return (
                ["sub_admin", "secretary"].includes(adminItem.role) &&
                adminSocietyId &&
                adminSocietyId === userSocietyId
              );
            }),
      );
    } catch (err) {
      console.error("Failed to load admins:", err);
      setError(getErrorMessage(err, "Failed to load admin accounts list."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminsList();
  }, [isSuperAdmin]);

  // Fetch available subscription plans (super admin only)
  useEffect(() => {
    if (!isSuperAdmin) return;
    let isCancelled = false;
    const fetchPlans = async () => {
      setPlansLoading(true);
      try {
        const data = await getPlans();
        if (!isCancelled) setPlans(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load subscription plans:", err);
      } finally {
        if (!isCancelled) setPlansLoading(false);
      }
    };
    fetchPlans();
    return () => {
      isCancelled = true;
    };
  }, [isSuperAdmin]);

  // Client-side search filter
  const filteredAdmins = useMemo(() => {
    if (!debouncedSearch.trim()) return admins;
    const term = debouncedSearch.toLowerCase().trim();
    return admins.filter((admin) => {
      const name = admin.name || "";
      const phone = admin.phone || "";
      const societyName =
        typeof admin.society === "object"
          ? admin.society?.name || ""
          : admin.society || "";
      return (
        name.toLowerCase().includes(term) ||
        phone.toLowerCase().includes(term) ||
        societyName.toLowerCase().includes(term)
      );
    });
  }, [admins, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE);
  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdmins.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAdmins, currentPage]);

  const handleOpenCreate = () => {
    if (!canCreateSubAdmin) {
      setFormError(
        `Sub-admin creation limit reached. Your plan allows ${planLimits.maxSubAdmins} sub-admin${planLimits.maxSubAdmins === 1 ? "" : "s"}.`,
      );
      return;
    }

    setEditingAdmin(null);
    setFormName("");
    setFormPhone("");
    setFormPassword("");
    setFormRole(isSuperAdmin ? "admin" : "secretary");
    setFormPermissions(
      isSuperAdmin
        ? []
        : Array.isArray(user?.permissions)
          ? user.permissions
          : [],
    );
    setFormPlanCycle("monthly");
    setFormPlanId("");
    setFormSociety(isSuperAdmin ? "" : userSocietyId);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (admin) => {
    setEditingAdmin(admin);
    setFormName(admin.name || "");
    setFormPhone(admin.phone || "");
    setFormPassword("");
    setFormRole(admin.role || "sub_admin");
    setFormPermissions(
      Array.isArray(admin.permissions) ? admin.permissions : [],
    );
    setFormPlanCycle(admin.plan?.billingCycle || admin.plan?.type || "monthly");
    setFormPlanId(
      admin.plan?.planId || admin.plan?._id || admin.plan?.id || "",
    );
    setFormSociety(
      typeof admin.society === "object"
        ? admin.society?._id || admin.society?.id || ""
        : admin.society || "",
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const togglePermission = (permissionKey) => {
    setFormPermissions((prevPermissions) => {
      if (prevPermissions.includes(permissionKey)) {
        return prevPermissions.filter((key) => key !== permissionKey);
      }
      return [...prevPermissions, permissionKey];
    });
  };

  const planLimits = normalizePlanLimits(user);
  const currentSubAdminCount = useMemo(
    () => admins.filter((adminItem) => adminItem.role === "sub_admin").length,
    [admins],
  );
  const canCreateSubAdmin =
    isSuperAdmin || currentSubAdminCount < planLimits.maxSubAdmins;

  const selectedSocietySecretary = useMemo(() => {
    if (!formSociety) return null;

    return admins.find((adminItem) => {
      const adminSocietyId =
        typeof adminItem.society === "object"
          ? adminItem.society?._id || adminItem.society?.id || ""
          : adminItem.society || "";
      const adminId = adminItem._id || adminItem.id;
      const currentId = editingAdmin?._id || editingAdmin?.id;
      return (
        adminItem.role === "secretary" &&
        adminSocietyId === formSociety &&
        adminId !== currentId
      );
    });
  }, [admins, formSociety, editingAdmin]);

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError("Please enter name and phone number.");
      return;
    }

    if (!editingAdmin && !formPassword.trim()) {
      setFormError("Password is required when creating a new admin.");
      return;
    }

    if (formPassword.trim() && formPassword.trim().length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (!formSociety) {
      setFormError("Please select a society for this admin account.");
      return;
    }

    if (!canCreateSubAdmin && formRole === "sub_admin" && !editingAdmin) {
      setFormError(
        `Sub-admin creation limit reached. Your plan allows ${planLimits.maxSubAdmins} sub-admin${planLimits.maxSubAdmins === 1 ? "" : "s"}.`,
      );
      return;
    }

    if (formRole === "secretary" && selectedSocietySecretary) {
      setFormError(
        "This society already has a secretary. Choose a different society or change the role.",
      );
      return;
    }

    setFormError(null);
    setIsSaving(true);

    // Build the plan payload if a plan is selected (super admin assigns a plan)
    const selectedPlan = isSuperAdmin
      ? plans.find((p) => (p._id || p.id) === formPlanId) || null
      : null;
    const planPayload = isSuperAdmin
      ? buildPlanPayload(selectedPlan, formPlanCycle)
      : undefined;

    if (isSuperAdmin && !planPayload) {
      setIsSaving(false);
      setFormError("Please select a subscription plan for this admin account.");
      return;
    }

    try {
      if (editingAdmin) {
        const updateData = {
          name: formName.trim(),
          phone: formPhone.trim(),
          society: formSociety,
          role: formRole,
          permissions: formPermissions,
        };
        if (formPassword.trim()) {
          updateData.password = formPassword.trim();
        }
        if (isSuperAdmin && planPayload) {
          updateData.plan = planPayload;
        }

        await updateAdmin(editingAdmin._id || editingAdmin.id, updateData);
      } else {
        await createAdmin({
          name: formName.trim(),
          phone: formPhone.trim(),
          password: formPassword.trim(),
          society: formSociety,
          role: formRole,
          permissions: formPermissions,
          ...(isSuperAdmin && planPayload ? { plan: planPayload } : {}),
        });
      }

      setIsModalOpen(false);
      await fetchAdminsList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingAdmin
            ? "Failed to update admin account."
            : "Failed to create admin account.",
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
      await deleteAdmin(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchAdminsList();
    } catch (err) {
      console.error("Failed to delete admin:", err);
      alert(getErrorMessage(err, "Failed to delete admin account."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canManageAdmins) {
    return (
      <div className="page-container">
        <div className="card-box empty-state-box">
          <h3>Access Restricted</h3>
          <p className="text-muted">
            You must be logged in as a Super Admin or Admin to manage
            administrator accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Accounts Management</h1>
          <p className="page-description">
            Create, update, and manage society administrator accounts
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchAdminsList}
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
            <span>Add Admin</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search admins by name, phone, or society..."
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
          <LoadingSpinner text="Loading admin accounts directory..." />
        </div>
      ) : paginatedAdmins.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Admins Found</h3>
          <p className="text-muted">
            {searchTerm
              ? "No admins matched your search filters."
              : "There are currently no registered admin accounts."}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Admin Name</th>
                  <th>Phone Number</th>
                  <th>Assigned Society</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAdmins.map((item) => {
                  const id = item._id || item.id;
                  const name = item.name || "N/A";
                  const phone = item.phone || "N/A";
                  const societyName =
                    typeof item.society === "object"
                      ? item.society?.name || "Society"
                      : item.society || "N/A";
                  const isVerified = item.isVerified !== false;
                  const permissions = Array.isArray(item.permissions)
                    ? item.permissions
                    : [];
                  const permissionLabels =
                    permissions.length > 0
                      ? ACCESS_OPTIONS.filter((opt) =>
                          permissions.includes(opt.key),
                        )
                          .map((opt) => opt.label)
                          .join(", ")
                      : item.role === "admin" || item.role === "super_admin"
                        ? "All Access"
                        : "";

                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <div className="user-name-cell">
                          <div className="mini-avatar avatar-blue">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{name}</span>
                        </div>
                      </td>
                      <td>{phone}</td>
                      <td>
                        <span className="badge-category">{societyName}</span>
                      </td>
                      <td>
                        {item.role === "super_admin"
                          ? "Super Admin"
                          : item.role === "sub_admin"
                            ? "Sub Admin"
                            : "Admin"}
                      </td>
                      <td>
                        {item.plan?.billingCycle
                          ? formatPlanLabel(normalizePlanLimits(item))
                          : "None"}
                      </td>
                      <td>{permissionLabels || "No access assigned"}</td>
                      <td>
                        <StatusBadge
                          status={isVerified ? "Active" : "Pending"}
                        />
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
            totalItems={filteredAdmins.length}
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
                {editingAdmin
                  ? "Edit Admin Account"
                  : "Create New Admin Account"}
              </h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAdmin}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger mb-4">
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group mb-4">
                  <label htmlFor="adminName">Full Name</label>
                  <input
                    id="adminName"
                    type="text"
                    placeholder="Enter admin name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="adminPhone">Phone Number</label>
                  <input
                    id="adminPhone"
                    type="text"
                    placeholder="Enter phone number"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="adminPassword">
                    Password{" "}
                    {editingAdmin && (
                      <span className="text-muted" style={{ fontWeight: 400 }}>
                        (leave blank to keep current)
                      </span>
                    )}
                  </label>
                  <input
                    id="adminPassword"
                    type="password"
                    placeholder={
                      editingAdmin
                        ? "New password (optional)"
                        : "Enter password (min 6 chars)"
                    }
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={!editingAdmin}
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="adminRole">Account Type</label>
                  <select
                    id="adminRole"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "var(--bg-dark)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                    }}
                  >
                    {ROLE_OPTIONS.map((option) => {
                      if (option.key === "admin" && !isSuperAdmin) return null;
                      if (
                        option.key === "sub_admin" &&
                        user?.role === "admin" &&
                        !canCreateSubAdmin
                      ) {
                        return (
                          <option key={option.key} value={option.key} disabled>
                            {option.label} (limit reached)
                          </option>
                        );
                      }
                      return (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      );
                    })}
                  </select>
                  {formRole === "secretary" && selectedSocietySecretary && (
                    <p
                      className="text-danger"
                      style={{ fontSize: "0.85rem", marginTop: "8px" }}
                    >
                      This society already has a secretary assigned. You can
                      only have one secretary per society.
                    </p>
                  )}
                </div>

                {isSuperAdmin && (
                  <>
                    <div className="form-group mb-4">
                      <label htmlFor="adminPlan">Subscription Plan</label>
                      <select
                        id="adminPlan"
                        value={formPlanId}
                        onChange={(e) => setFormPlanId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          backgroundColor: "var(--bg-dark)",
                          color: "var(--text-main)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                        }}
                      >
                        <option value="">
                          {plansLoading
                            ? "Loading plans..."
                            : "Select a plan..."}
                        </option>
                        {plans
                          .filter((p) => (p.status || "active") !== "inactive")
                          .map((p) => {
                            const pid = p._id || p.id;
                            const pname =
                              p.name || p.planName || p.title || "Plan";
                            const monthly =
                              p.monthlyPrice !== undefined &&
                              p.monthlyPrice !== null
                                ? `$${Number(p.monthlyPrice).toFixed(2)}/mo`
                                : "";
                            const yearly =
                              p.yearlyPrice !== undefined &&
                              p.yearlyPrice !== null
                                ? `$${Number(p.yearlyPrice).toFixed(2)}/yr`
                                : "";
                            return (
                              <option key={pid} value={pid}>
                                {pname} {monthly ? `• ${monthly}` : ""}{" "}
                                {yearly ? `• ${yearly}` : ""}
                              </option>
                            );
                          })}
                      </select>
                      <p
                        className="text-muted"
                        style={{ fontSize: "0.85rem", marginTop: "8px" }}
                      >
                        Choose the plan tier for this admin's environment.
                      </p>
                    </div>

                    <div className="form-group mb-4">
                      <label htmlFor="adminPlanCycle">Billing Cycle</label>
                      <select
                        id="adminPlanCycle"
                        value={formPlanCycle}
                        onChange={(e) => setFormPlanCycle(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          backgroundColor: "var(--bg-dark)",
                          color: "var(--text-main)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                        }}
                      >
                        {PLAN_CYCLE_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formPlanId && (
                      <div
                        className="form-group mb-4"
                        style={{
                          backgroundColor: "var(--bg-dark)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          padding: "12px",
                        }}
                      >
                        <label style={{ fontSize: "0.8rem" }}>
                          Plan Limits Preview
                        </label>
                        <p
                          className="text-muted"
                          style={{
                            fontSize: "0.85rem",
                            marginTop: "4px",
                          }}
                        >
                          {(() => {
                            const sel = plans.find(
                              (pl) => (pl._id || pl.id) === formPlanId,
                            );
                            const lim = sel?.limits || sel || {};
                            const fmt = (v) =>
                              v === undefined || v === null || v === ""
                                ? "Unl"
                                : Number(v);
                            return `Sub-Admins: ${fmt(
                              lim.maxSubAdmins,
                            )} • Societies: ${fmt(
                              lim.maxSocieties,
                            )} • Guards: ${fmt(
                              lim.maxGuards,
                            )} • Services: ${fmt(
                              lim.maxServices,
                            )} • Residents: ${fmt(lim.maxResidents)}`;
                          })()}
                        </p>
                      </div>
                    )}
                  </>
                )}
                <div className="form-group mb-4">
                  <label>Access Permissions</label>
                  <p
                    className="text-muted"
                    style={{
                      fontSize: "0.85rem",
                      marginTop: "0",
                      marginBottom: "10px",
                    }}
                  >
                    {isSuperAdmin
                      ? "Select the sections this account can manage."
                      : "Select the permissions this sub-admin may use. You can only grant access that you yourself have."}
                  </p>
                  <div
                    className="permissions-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {ACCESS_OPTIONS.map((option) => {
                      const allowedByCurrentUser =
                        isSuperAdmin ||
                        user?.role === "admin" ||
                        (Array.isArray(user?.permissions)
                          ? user.permissions.includes(option.key)
                          : false);
                      return (
                        <label
                          key={option.key}
                          className="checkbox-card"
                          style={{
                            opacity: allowedByCurrentUser ? 1 : 0.5,
                            cursor: allowedByCurrentUser
                              ? "pointer"
                              : "not-allowed",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formPermissions.includes(option.key)}
                            onChange={() =>
                              allowedByCurrentUser &&
                              togglePermission(option.key)
                            }
                            disabled={!allowedByCurrentUser}
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <SocietySelect
                  id="adminSociety"
                  value={formSociety}
                  onChange={setFormSociety}
                  required
                  disabled={!isSuperAdmin}
                />
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
                    ? editingAdmin
                      ? "Updating..."
                      : "Creating..."
                    : editingAdmin
                      ? "Update Admin"
                      : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Admin Account"
        message={`Are you sure you want to remove admin account "${deleteTarget?.name || "this admin"}"?`}
        confirmText="Delete Admin"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Admins;
