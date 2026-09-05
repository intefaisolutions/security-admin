import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  getAdmins,
  createAdmin,
  createSuperSubAdmin,
  createSubAdmin,
  createSecretary,
  updateAdmin,
  updateAdminPlan,
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

const PLAN_CYCLE_OPTIONS = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

const SubAdmins = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isSuperSubAdmin = user?.role === "super_sub_admin";
  const canManageAdmins = [
    "super_admin",
    "super_sub_admin",
    "admin",
    "sub_admin",
  ].includes(user?.role);
  const canManageThisType = [
    "super_admin",
    "super_sub_admin",
    "admin",
  ].includes(user?.role);
  const userSocietyId =
    typeof user?.society === "object"
      ? user?.society?._id || user?.society?.id || ""
      : user?.society || "";
  const isAdminUser = user?.role === "admin";
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const planLimits = normalizePlanLimits(user);
  const currentSubAdminCount = useMemo(
    () => admins.filter((adminItem) => adminItem.role === "sub_admin").length,
    [admins],
  );
  const canCreateSubAdmin =
    user?.role === "admin"
      ? planLimits.maxSubAdmins > currentSubAdminCount ||
        !planLimits.maxSubAdmins
      : true;

  // Search & Pagination
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch !== null) {
      setSearchTerm(querySearch);
    }
  }, [searchParams]);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formAssignedAdmin, setFormAssignedAdmin] = useState("");
  const [licenseModalData, setLicenseModalData] = useState(null);
  const [formSocieties, setFormSocieties] = useState([]);
  const [formRole, setFormRole] = useState("sub_admin");
  const [formPermissions, setFormPermissions] = useState([]);
  const [formPlanCycle, setFormPlanCycle] = useState("monthly");
  const [formPlanId, setFormPlanId] = useState("");
  const [formCanViewAllSocietiesSOS, setFormCanViewAllSocietiesSOS] =
    useState(false);
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
      setAdmins(adminList.filter((a) => a.role === "sub_admin"));
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
        Array.isArray(admin.societies) && admin.societies.length > 0
          ? admin.societies
              .map((s) => (typeof s === "object" ? s?.name : s))
              .join(", ")
          : typeof admin.society === "object"
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

  const handleOpenDetail = (admin) => {
    setDetailItem(admin);
    setIsDetailOpen(true);
  };

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
    setFormEmail("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormAssignedAdmin("");
    setFormRole("sub_admin");
    setFormPermissions(
      isSuperAdmin
        ? []
        : Array.isArray(user?.permissions)
          ? user.permissions
          : [],
    );
    setFormPlanCycle("monthly");
    setFormPlanId("");
    setFormCanViewAllSocietiesSOS(false);
    setFormSocieties(isSuperAdmin ? [] : userSocietyId ? [userSocietyId] : []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (admin) => {
    setEditingAdmin(admin);
    setFormName(admin.name || "");
    setFormPhone(admin.phone || "");
    setFormEmail(admin.email || "");
    setFormPassword("");
    setFormRole(admin.role || "sub_admin");
    setFormPermissions(
      Array.isArray(admin.permissions) ? admin.permissions : [],
    );
    setFormPlanCycle(admin.plan?.billingCycle || admin.plan?.type || "monthly");
    setFormPlanId(
      admin.plan?.planId || admin.plan?._id || admin.plan?.id || "",
    );
    const adminSocieties = admin.societies && admin.societies.length > 0
      ? admin.societies.map((s) => s._id || s.id)
      : admin.society 
        ? [typeof admin.society === "object" ? admin.society._id || admin.society.id : admin.society]
        : [];
    setFormSocieties(adminSocieties);
    setFormCanViewAllSocietiesSOS(admin.canViewAllSocietiesSOS || false);
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

  const selectedSocietySecretary = useMemo(() => {
    if (!formSocieties || formSocieties.length === 0) return null;

    return admins.find((adminItem) => {
      const adminSocietyId =
        typeof adminItem.society === "object"
          ? adminItem.society?._id || adminItem.society?.id || ""
          : adminItem.society || "";
      const adminId = adminItem._id || adminItem.id;
      const currentId = editingAdmin?._id || editingAdmin?.id;
      return (
        adminItem.role === "secretary" &&
        formSocieties.includes(adminSocietyId) &&
        adminId !== currentId
      );
    });
  }, [admins, formSocieties, editingAdmin]);

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    if (!formPhone.trim()) {
      setFormError("Please enter a phone number.");
      return;
    }
    if (!/^\d{10}$/.test(formPhone.trim())) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }

    if (!formName.trim()) {
      setFormError("Please enter the admin's name.");
      return;
    }

    if (formRole === "admin" && !formEmail.trim()) {
      setFormError("Please enter an email address for System Admins.");
      return;
    }
    if (
      formRole === "admin" &&
      formEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())
    ) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (formRole !== "admin" && !editingAdmin) {
      if (!formPassword) {
        setFormError("Password is required for Sub Admins and Secretaries.");
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
    }
    if (
      (isSuperAdmin || isSuperSubAdmin) &&
      formRole !== "admin" &&
      formRole !== "super_sub_admin" &&
      !editingAdmin &&
      !formAssignedAdmin
    ) {
      setFormError("Please assign an Admin to this account.");
      return;
    }

    if (editingAdmin) {
      if (formPassword.trim() && formPassword.trim().length < 6) {
        setFormError("Password must be at least 6 characters long.");
        return;
      }
    }

    if (
      formRole !== "admin" &&
      formRole !== "super_sub_admin" &&
      (!formSocieties || formSocieties.length === 0)
    ) {
      setFormError("Please select at least one society for this admin account.");
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
    const resolvedPlanCycle = formRole === "admin" ? "monthly" : formPlanCycle;
    const planPayload = isSuperAdmin
      ? buildPlanPayload(selectedPlan, resolvedPlanCycle)
      : undefined;

    if (isSuperAdmin && formRole !== "super_sub_admin" && !planPayload) {
      setIsSaving(false);
      setFormError("Please select a subscription plan for this admin account.");
      return;
    }

    try {
      if (editingAdmin) {
        const updateData = {
          name: formName.trim(),
          phone: formPhone.trim(),
          ...(formRole !== "admin" && { societies: formSocieties, society: formSocieties[0] }),
          role: formRole,
          permissions: formRole === "admin" ? [] : formPermissions,
          canViewAllSocietiesSOS: formCanViewAllSocietiesSOS,
        };
        if (formPassword.trim()) {
          updateData.password = formPassword.trim();
        }

        await updateAdmin(editingAdmin._id || editingAdmin.id, updateData);
        if (isSuperAdmin && planPayload && planPayload.planId) {
          await updateAdminPlan(
            editingAdmin._id || editingAdmin.id,
            planPayload.planId,
          );
        }
        setIsModalOpen(false);
      } else {
        let response;
        if (formRole === "admin") {
          response = await createAdmin({
            name: formName.trim(),
            phone: formPhone.trim(),
            email: formEmail.trim(),
            role: formRole,
            permissions: [],
            canViewAllSocietiesSOS: formCanViewAllSocietiesSOS,
            ...(isSuperAdmin && planPayload
              ? { plan: planPayload.planId }
              : {}),
          });

          setLicenseModalData({
            key: response.licenseKey || "Check console/SMS",
            email: formEmail.trim(),
          });
        } else if (formRole === "super_sub_admin") {
          response = await createSuperSubAdmin({
            name: formName.trim(),
            phone: formPhone.trim(),
            email: formEmail.trim(),
            password: formPassword,
            permissions: formPermissions,
            societies: formSocieties,
            society: formSocieties[0],
          });
          alert("Super Sub Admin created successfully.");
        } else if (formRole === "sub_admin") {
          response = await createSubAdmin({
            name: formName.trim(),
            phone: formPhone.trim(),
            email: formEmail.trim(),
            password: formPassword,
            permissions: formPermissions,
            assignedAdminId: (isSuperAdmin || isSuperSubAdmin) ? formAssignedAdmin : undefined,
            societies: formSocieties,
            society: formSocieties[0],
          });
          setLicenseModalData({
            emailSent: response.emailSent,
            email: formEmail.trim(),
          });
        } else if (formRole === "secretary") {
          response = await createSecretary({
            name: formName.trim(),
            phone: formPhone.trim(),
            password: formPassword,
            assignedAdminId: isSuperAdmin ? formAssignedAdmin : undefined,
            societies: formSocieties,
            society: formSocieties[0],
          });
          alert("Society Secretary created successfully.");
        }

        setIsModalOpen(false);
      }

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
          <h1 className="page-title">Sub Admins Management</h1>
          <p className="page-description">
            Create, update, and manage Sub Admin accounts
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
          {canManageThisType && (
            <button
              className="btn btn-primary"
              onClick={handleOpenCreate}
              disabled={!canCreateSubAdmin}
              title={!canCreateSubAdmin ? "Limit reached" : ""}
            >
              <span>Add Sub Admin</span>
            </button>
          )}
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
                    Array.isArray(item.societies) && item.societies.length > 0
                      ? item.societies
                          .map((s) => (typeof s === "object" ? s?.name : s))
                          .join(", ")
                      : typeof item.society === "object"
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
                            className="icon-action-btn icon-action-btn-view"
                            onClick={() => handleOpenDetail(item)}
                            title="View Details"
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
                          {canManageThisType && (
                            <>
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
                            </>
                          )}
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
                    onChange={(e) =>
                      setFormPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    required
                  />
                </div>
                <div className="form-group mb-4">
                  <label htmlFor="adminEmail">Email Address</label>
                  <input
                    id="adminEmail"
                    type="email"
                    placeholder="Enter email address"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    onBlur={(e) => {
                      if (
                        e.target.value &&
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                          e.target.value.trim(),
                        )
                      ) {
                        setFormError("Please enter a valid email address.");
                      } else {
                        setFormError(null);
                      }
                    }}
                  />
                </div>

                {(editingAdmin || formRole !== "admin") && (
                  <div className="form-group mb-4">
                    <label htmlFor="adminPassword">
                      Password{" "}
                      {editingAdmin ? (
                        <span
                          className="text-muted"
                          style={{ fontWeight: 400 }}
                        >
                          (leave blank to keep current)
                        </span>
                      ) : (
                        <span className="text-danger">*</span>
                      )}
                    </label>
                    <div className="input-with-icon">
                      <input
                        id="adminPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder={
                          editingAdmin
                            ? "New password (optional)"
                            : "Enter password"
                        }
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        style={{ paddingRight: '40px', width: '100%' }}
                      />
                      <button
                        type="button"
                        className="input-password-toggle password-eye-btn" onClick={() => setShowPassword(!showPassword)}
                        
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {!editingAdmin && formRole !== "admin" && (
                  <div className="form-group mb-4">
                    <label htmlFor="adminConfirmPassword">
                      Confirm Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-with-icon">
                      <input
                        id="adminConfirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        style={{ paddingRight: '40px', width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        
                      >
                        {showConfirmPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {(isSuperAdmin || isSuperSubAdmin) &&
                  !editingAdmin &&
                  formRole !== "admin" &&
                  formRole !== "super_sub_admin" && (
                    <div className="form-group mb-4">
                      <label htmlFor="assignAdminSelect">
                        Assign Admin <span className="text-danger">*</span>
                      </label>
                      <select
                        id="assignAdminSelect"
                        value={formAssignedAdmin}
                        onChange={(e) => setFormAssignedAdmin(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          backgroundColor: "var(--bg-dark)",
                          color: "var(--text-main)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                        }}
                      >
                        <option value="">Select an Admin...</option>
                        {admins
                          .filter(
                            (a) => a.role === "admin" || a.role === "ADMIN",
                          )
                          .map((a) => (
                            <option key={a._id || a.id} value={a._id || a.id}>
                              {a.name} ({a.phone})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                {isSuperAdmin && formRole !== "super_sub_admin" && (
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
                          .filter(
                            (p) =>
                              p.monthlyPrice !== undefined &&
                              p.monthlyPrice !== null,
                          )
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

                    {formRole !== "admin" && (
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
                    )}

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
                {formRole !== "admin" && (
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
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(130px, 1fr))",
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

                        const isSelected = formPermissions.includes(option.key);

                        return (
                          <div
                            key={option.key}
                            onClick={() =>
                              allowedByCurrentUser &&
                              togglePermission(option.key)
                            }
                            style={{
                              border: isSelected
                                ? "2px solid var(--primary-color)"
                                : "1px solid var(--border-color)",
                              borderRadius: "8px",
                              padding: "12px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              backgroundColor: isSelected
                                ? "rgba(14, 165, 233, 0.1)"
                                : "var(--bg-dark)",
                              cursor: allowedByCurrentUser
                                ? "pointer"
                                : "not-allowed",
                              opacity: allowedByCurrentUser ? 1 : 0.5,
                              transition: "all 0.2s ease",
                              textAlign: "center",
                              userSelect: "none",
                            }}
                          >
                            <div
                              style={{
                                color: isSelected
                                  ? "var(--primary-color)"
                                  : "var(--text-muted)",
                              }}
                            >
                              {isSelected ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                </svg>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: isSelected ? "600" : "400",
                                color: isSelected
                                  ? "var(--text-main)"
                                  : "var(--text-muted)",
                              }}
                            >
                              {option.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formRole !== "admin" && formRole !== "super_sub_admin" && (
                  <SocietySelect
                    id="adminSociety"
                    value={formRole === "secretary" ? (formSocieties[0] || "") : formSocieties}
                    onChange={(val) => {
                      if (formRole === "secretary") {
                        setFormSocieties(val ? [val] : []);
                      } else {
                        setFormSocieties(val);
                      }
                    }}
                    required
                    disabled={!isSuperAdmin}
                    isMulti={formRole === "sub_admin"}
                  />
                )}
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

      {/* Detail View Modal */}
      {isDetailOpen && detailItem && (
        <div className="modal-backdrop" onClick={() => setIsDetailOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "94%" }}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="info-icon-badge">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <h3>
                  {detailItem.role === "super_admin"
                    ? "Super Admin Account Details"
                    : detailItem.role === "super_sub_admin"
                      ? "Super Sub Admin Account Details"
                      : detailItem.role === "sub_admin"
                        ? "Sub Admin Account Details"
                        : detailItem.role === "secretary"
                          ? "Secretary Account Details"
                          : "Admin Account Details"}
                </h3>
              </div>
              <button
                className="icon-btn-close"
                onClick={() => setIsDetailOpen(false)}
                title="Close"
              >
                &times;
              </button>
            </div>

            <div
              className="modal-body"
              style={{
                maxHeight: "75vh",
                overflowY: "auto",
                padding: "20px 24px",
              }}
            >
              {isSuperAdmin && detailItem.licenseKey && (
                <div
                  style={{
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                    border: "1px dashed var(--primary)",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  <span
                    className="detail-label"
                    style={{
                      display: "block",
                      color: "var(--primary)",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    License Activation Key
                  </span>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#fff",
                      marginTop: "6px",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {detailItem.licenseKey}
                  </div>
                </div>
              )}

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Admin Name</span>
                  <span className="detail-value">
                    {detailItem.name || "Pending Sign Up"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Phone Number</span>
                  <span className="detail-value">
                    {detailItem.phone || "N/A"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Assigned Society</span>
                  <span className="detail-value">
                    {Array.isArray(detailItem.societies) && detailItem.societies.length > 0
                      ? detailItem.societies
                          .map((s) => (typeof s === "object" ? s?.name : s))
                          .join(", ")
                      : typeof detailItem.society === "object"
                      ? detailItem.society?.name || "N/A"
                      : detailItem.society || "N/A"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Role</span>
                  <span className="detail-value">
                    {detailItem.role === "super_admin"
                      ? "Super Admin"
                      : detailItem.role === "super_sub_admin"
                        ? "Super Sub Admin"
                        : detailItem.role === "admin"
                          ? "Admin"
                          : detailItem.role === "sub_admin"
                            ? "Sub Admin"
                            : "Secretary"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Verification Status</span>
                  <span className="detail-value">
                    <StatusBadge
                      status={
                        detailItem.isVerified !== false ? "Active" : "Pending"
                      }
                    />
                  </span>
                </div>

                {detailItem.plan && (
                  <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                    <span className="detail-label">Subscription Plan</span>
                    <span
                      className="detail-value"
                      style={{ display: "block", marginTop: "4px" }}
                    >
                      <strong>{detailItem.plan.name || "Custom"}</strong> (
                      {detailItem.plan.billingCycle || "monthly"})
                    </span>
                    <span
                      className="text-muted"
                      style={{
                        fontSize: "0.85rem",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Limits: Sub-Admins:{" "}
                      {detailItem.plan.limits?.maxSubAdmins || "Unl"} •
                      Societies: {detailItem.plan.limits?.maxSocieties || "Unl"}{" "}
                      • Guards: {detailItem.plan.limits?.maxGuards || "Unl"} •
                      Services: {detailItem.plan.limits?.maxServices || "Unl"} •
                      Residents: {detailItem.plan.limits?.maxResidents || "Unl"}
                    </span>
                  </div>
                )}

                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Access Permissions</span>
                  <span
                    className="detail-value"
                    style={{ display: "block", marginTop: "4px" }}
                  >
                    {Array.isArray(detailItem.permissions) &&
                    detailItem.permissions.length > 0
                      ? ACCESS_OPTIONS.filter((opt) =>
                          detailItem.permissions.includes(opt.key),
                        )
                          .map((opt) => opt.label)
                          .join(", ")
                      : detailItem.role === "admin" ||
                          detailItem.role === "super_admin"
                        ? "All Access"
                        : "No permissions assigned"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDetailOpen(false)}
              >
                Close
              </button>
            </div>
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

      {licenseModalData && (
        <div className="modal-backdrop" onClick={() => setLicenseModalData(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px", textAlign: "center", position: "relative" }}
          >
            <button
              className="modal-close-btn"
              
              onClick={() => setLicenseModalData(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  background: "#d1fae5",
                  color: "#10b981",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2
                style={{
                  marginBottom: "8px",
                  color: "#111827",
                  fontSize: "1.25rem",
                }}
              >
                Credentials Generated Successfully
              </h2>

              <div
                style={{
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "16px",
                }}
              >
                <p style={{ color: "#4b5563", fontSize: "0.95rem" }}>
                  The account has been created.
                </p>
              </div>

              <p
                style={{
                  color: "#10b981",
                  fontSize: "0.85rem",
                  marginBottom: "24px",
                }}
              >
                {licenseModalData.emailSent
                  ? `Email sent to ${licenseModalData.email} with login credentials.`
                  : `Failed to send email to ${licenseModalData.email}. Please provide credentials manually.`}
              </p>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "10px" }}
                  onClick={() => setLicenseModalData(null)}
                >
                  Close
                </button>
              </div>
              <button
                style={{
                  marginTop: "16px",
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
                onClick={() => setLicenseModalData(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdmins;
