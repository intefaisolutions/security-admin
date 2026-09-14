import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getResidents,
  getResidents as getResidentsList,
  createResident,
  updateResident,
  deleteResident,
  getResidentById,
  getGuards,
  createGuard,
  updateGuard,
  deleteGuard,
  getGuardById,
  getServices,
  getServiceById,
  createServiceProvider,
  updateService,
  deleteService,
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getFamilyMembersForResident,
  getSocieties,
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

const TABS = [
  { key: "all", label: "All Users" },
  { key: "residents", label: "Residents" },
  { key: "guards", label: "Guards" },
  { key: "services", label: "Service Providers" },
  { key: "family", label: "Family Members" },
];

const Users = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [residents, setResidents] = useState([]);
  const [guards, setGuards] = useState([]);
  const [services, setServices] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUserType, setModalUserType] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formAge, setFormAge] = useState("");
  const [formFlatNumber, setFormFlatNumber] = useState("");
  const [formBlock, setFormBlock] = useState("");
  const [formTower, setFormTower] = useState("");
  const [formSociety, setFormSociety] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formRelation, setFormRelation] = useState("");
  const [formResident, setFormResident] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [detailItem, setDetailItem] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [availableResidents, setAvailableResidents] = useState([]);

  const fetchAllUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resData, guardData, serviceData, familyData] = await Promise.allSettled([
        getResidentsList(), getGuards(), getServices(), getFamilyMembers(),
      ]);
      setResidents(resData.status === "fulfilled" && Array.isArray(resData.value) ? resData.value : []);
      setGuards(guardData.status === "fulfilled" && Array.isArray(guardData.value) ? guardData.value : []);
      setServices(serviceData.status === "fulfilled" && Array.isArray(serviceData.value) ? serviceData.value : []);
      setFamilyMembers(familyData.status === "fulfilled" && Array.isArray(familyData.value) ? familyData.value : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load users."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllUsers(); }, []);

  useEffect(() => {
    if (isModalOpen && modalUserType === "family") {
      getResidentsList().then((data) => {
        if (Array.isArray(data)) setAvailableResidents(data);
      }).catch(() => {});
    }
  }, [isModalOpen, modalUserType]);

  const tabCounts = useMemo(() => ({
    all: residents.length + guards.length + services.length + familyMembers.length,
    residents: residents.length,
    guards: guards.length,
    services: services.length,
    family: familyMembers.length,
  }), [residents, guards, services, familyMembers]);

  const filteredData = useMemo(() => {
    let data;
    switch (activeTab) {
      case "residents": data = residents.map((i) => ({ ...i, userType: "resident" })); break;
      case "guards": data = guards.map((i) => ({ ...i, userType: "guard" })); break;
      case "services": data = services.map((i) => ({ ...i, userType: "service" })); break;
      case "family": data = familyMembers.map((i) => ({ ...i, userType: "family" })); break;
      default:
        data = [
          ...residents.map((i) => ({ ...i, userType: "resident" })),
          ...guards.map((i) => ({ ...i, userType: "guard" })),
          ...services.map((i) => ({ ...i, userType: "service" })),
          ...familyMembers.map((i) => ({ ...i, userType: "family" })),
        ];
    }
    if (!debouncedSearch.trim()) return data;
    const term = debouncedSearch.toLowerCase().trim();
    return data.filter((item) => {
      const nm = item.name || item.fullName || "";
      const ph = item.phone || item.mobile || "";
      const extra = [item.employeeId, item.empId, item.flatNumber, item.flat, item.category, item.relation, item.relationship].filter(Boolean).map((s) => String(s).toLowerCase());
      return nm.toLowerCase().includes(term) || ph.toLowerCase().includes(term) || extra.some((v) => v.includes(term));
    });
  }, [activeTab, residents, guards, services, familyMembers, debouncedSearch]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, activeTab]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const resetForm = () => {
    setFormName(""); setFormPhone(""); setFormEmail(""); setFormPassword("");
    setFormAge(""); setFormFlatNumber(""); setFormBlock(""); setFormTower("");
    setFormSociety(""); setFormEmployeeId(""); setFormCategory("");
    setFormRelation(""); setFormResident(""); setShowPassword(false);
  };

  const handleOpenCreate = (type) => {
    setModalUserType(type); setEditingUser(null); resetForm(); setFormError(null); setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setModalUserType(item.userType); setEditingUser(item);
    setFormName(item.name || item.fullName || "");
    setFormPhone(item.phone || item.mobile || "");
    setFormEmail(item.email || ""); setFormPassword("");
    setFormAge(item.age || "");
    setFormFlatNumber(item.flatNumber || item.flat || "");
    setFormBlock(item.block || ""); setFormTower(item.tower || "");
    setFormEmployeeId(item.employeeId || item.empId || "");
    setFormCategory(item.category || item.serviceType || item.service || "");
    setFormRelation(item.relation || item.relationship || "");
    setFormResident(typeof item.resident === "object" ? (item.resident?._id || item.resident?.id || "") : (item.resident || ""));
    setFormSociety(typeof item.society === "object" ? (item.society?._id || item.society?.id || "") : (item.society || ""));
    setShowPassword(false); setFormError(null); setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) { setFormError("Name is required."); return; }
    if (formPhone.trim() && !/^\d{10}$/.test(formPhone.trim())) { setFormError("Phone number must be exactly 10 digits."); return; }

    let payload = {};
    switch (modalUserType) {
      case "resident": {
        if (!formPhone.trim()) { setFormError("Phone number is required."); return; }
        if (isSuperAdmin && !formSociety) { setFormError("Please select a society."); return; }
        if (!editingUser && !formPassword.trim()) { setFormError("Password is required when creating a new resident."); return; }
        if (formPassword.trim() && formPassword.trim().length < 6) { setFormError("Password must be at least 6 characters."); return; }
        payload = { name: formName.trim(), phone: formPhone.trim(), flatNumber: formFlatNumber.trim(), block: formBlock.trim(), tower: formTower.trim() };
        if (formAge && !isNaN(Number(formAge))) payload.age = Number(formAge);
        if (formEmail.trim()) payload.email = formEmail.trim();
        if (formPassword.trim()) payload.password = formPassword.trim();
        if (isSuperAdmin && formSociety) payload.society = formSociety;
        break;
      }
      case "guard": {
        if (!formEmployeeId.trim()) { setFormError("Employee ID is required."); return; }
        if (isSuperAdmin && !formSociety) { setFormError("Please select a society."); return; }
        if (!editingUser && !formPassword.trim()) { setFormError("Password is required when creating a new guard."); return; }
        if (formPassword.trim() && formPassword.trim().length < 6) { setFormError("Password must be at least 6 characters."); return; }
        payload = { name: formName.trim(), employeeId: formEmployeeId.trim(), phone: formPhone.trim() };
        if (formPassword.trim()) payload.password = formPassword.trim();
        if (isSuperAdmin && formSociety) payload.society = formSociety;
        break;
      }
      case "service": {
        if (!formCategory.trim()) { setFormError("Category is required."); return; }
        if (!formPhone.trim()) { setFormError("Phone number is required."); return; }
        if (isSuperAdmin && !formSociety) { setFormError("Please select a society."); return; }
        payload = { name: formName.trim(), category: formCategory.trim(), phone: formPhone.trim() };
        if (isSuperAdmin && formSociety) payload.society = formSociety;
        break;
      }
      case "family": {
        if (!formRelation.trim()) { setFormError("Relation is required."); return; }
        if (isSuperAdmin && !formSociety) { setFormError("Please select a society."); return; }
        payload = { name: formName.trim(), relation: formRelation.trim(), phone: formPhone.trim() };
        if (formAge && !isNaN(Number(formAge))) payload.age = Number(formAge);
        if (formFlatNumber.trim()) payload.flatNumber = formFlatNumber.trim();
        if (isSuperAdmin && formSociety) payload.society = formSociety;
        if (formResident) payload.resident = formResident;
        break;
      }
    }

    setFormError(null); setIsSaving(true);
    try {
      const id = editingUser?._id || editingUser?.id;
      switch (modalUserType) {
        case "resident": if (editingUser) await updateResident(id, payload); else await createResident(payload); break;
        case "guard": if (editingUser) await updateGuard(id, payload); else await createGuard(payload); break;
        case "service": if (editingUser) await updateService(id, payload); else await createServiceProvider(payload); break;
        case "family": if (editingUser) await updateFamilyMember(id, payload); else await createFamilyMember(payload); break;
      }
      setIsModalOpen(false); await fetchAllUsers();
    } catch (err) {
      setFormError(getErrorMessage(err, editingUser ? "Failed to update." : "Failed to create."));
    } finally { setIsSaving(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const id = deleteTarget._id || deleteTarget.id;
      switch (deleteTarget.userType) {
        case "resident": await deleteResident(id); break;
        case "guard": await deleteGuard(id); break;
        case "service": await deleteService(id); break;
        case "family": await deleteFamilyMember(id); break;
      }
      setDeleteTarget(null); await fetchAllUsers();
    } catch (err) { console.error("Failed to delete:", err); } finally { setIsDeleting(false); }
  };

  const handleOpenDetail = async (id, rowData) => {
    setIsDetailOpen(true); setIsDetailLoading(true); setDetailError(null);
    try {
      let detail = rowData;
      switch (rowData.userType) {
        case "resident": {
          const res = await getResidentById(id);
          const famData = await getFamilyMembersForResident(id);
          const famList = Array.isArray(famData) ? famData : [];
          detail = {
            name: res?.name || res?.fullName || "N/A", phone: res?.phone || res?.mobile || "N/A",
            email: res?.email || "N/A", age: res?.age || "N/A",
            flatNumber: res?.flatNumber || res?.flat || "N/A", block: res?.block || "N/A", tower: res?.tower || "N/A",
            society: typeof res?.society === "object" ? res.society?.name || "Society" : res?.society || "N/A",
            status: res?.status || "Active",
            familyMembersCount: famList.length,
            familyMembers: famList.map((f) => ({
              name: f.name || f.fullName || "N/A", relation: f.relation || f.relationship || "Family",
              age: f.age || "N/A", phone: f.phone || f.mobile || "",
            })),
          };
          break;
        }
        case "guard": {
          const guard = await getGuardById(id);
          detail = {
            name: guard?.name || guard?.fullName || "N/A", phone: guard?.phone || guard?.mobile || "N/A",
            employeeId: guard?.employeeId || guard?.empId || "N/A",
            society: typeof guard?.society === "object" ? guard.society?.name || "Society" : guard?.society || "N/A",
            status: guard?.status || "Active",
          };
          break;
        }
        case "service": {
          const svc = await getServiceById(id);
          detail = {
            name: svc?.name || svc?.fullName || svc?.providerName || "N/A",
            category: svc?.category || svc?.serviceType || svc?.service || "N/A",
            phone: svc?.phone || svc?.mobile || "N/A",
            society: typeof svc?.society === "object" ? svc.society?.name || "Society" : svc?.society || "N/A",
            status: svc?.status || "Active",
          };
          break;
        }
        case "family": {
          detail = {
            name: rowData.name || rowData.fullName || "N/A",
            relation: rowData.relation || rowData.relationship || "Family",
            age: rowData.age || "N/A", phone: rowData.phone || rowData.mobile || "N/A",
            flatNumber: rowData.flatNumber || rowData.flat || "N/A",
            society: typeof rowData.society === "object" ? rowData.society?.name || "Society" : rowData.society || "N/A",
            resident: typeof rowData.resident === "object" ? rowData.resident?.name || "N/A" : rowData.resident || "N/A",
          };
          break;
        }
      }
      setDetailItem(detail);
    } catch (err) {
      console.error("Failed to fetch detail:", err);
      setDetailError(getErrorMessage(err, "Could not load details."));
      setDetailItem(rowData);
    } finally { setIsDetailLoading(false); }
  };

  const getTypeBadgeStyle = (userType) => {
    switch (userType) {
      case "resident": return { backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" };
      case "guard": return { backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
      case "service": return { backgroundColor: "rgba(168, 85, 247, 0.15)", color: "#a855f7" };
      case "family": return { backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" };
      default: return {};
    }
  };

  const getTypeLabel = (userType) => {
    switch (userType) {
      case "resident": return "Resident";
      case "guard": return "Guard";
      case "service": return "Service";
      case "family": return "Family";
      default: return "User";
    }
  };

  const getAvatarClass = (userType) => {
    switch (userType) {
      case "guard": return "avatar-emerald";
      case "service": return "avatar-purple";
      case "family": return "avatar-blue";
      default: return "";
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users Management</h1>
          <p className="page-description">
            Manage residents, guards, service providers, and family members
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchAllUsers}
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
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L.5 16" />
            </svg>
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenCreate("resident")}>
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div
        className="tabs-container"
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchTerm(""); }}
            style={{
              padding: "8px 16px",
              background: activeTab === tab.key ? "var(--primary-color)" : "transparent",
              color: activeTab === tab.key ? "#fff" : "var(--text-main)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {tab.label}
            <span
              style={{
                background: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "var(--bg-dark)",
                color: activeTab === tab.key ? "#fff" : "var(--text-secondary)",
                padding: "1px 8px",
                borderRadius: "10px",
                fontSize: "0.75rem",
                fontWeight: "600",
              }}
            >
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder={`Search ${activeTab === "all" ? "users" : TABS.find((t) => t.key === activeTab)?.label?.toLowerCase()} by name, phone...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="search-clear-btn" onClick={() => setSearchTerm("")}>
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
          <LoadingSpinner text="Loading users directory..." />
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Users Found</h3>
          <p className="text-muted">
            {searchTerm
              ? "No users matched your search filters."
              : "There are currently no users in this category."}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Phone</th>
                  {activeTab === "residents" && <th>Flat / Tower</th>}
                  {activeTab === "guards" && <th>Employee ID</th>}
                  {activeTab === "services" && <th>Category</th>}
                  {activeTab === "family" && <th>Relation</th>}
                  {(activeTab === "residents" || activeTab === "guards" || activeTab === "services") && <th>Status</th>}
                  {isSuperAdmin && activeTab === "family" && <th>Resident</th>}
                  {isSuperAdmin && <th>Society</th>}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => {
                  const id = item._id || item.id;
                  const name = item.name || item.fullName || "N/A";
                  const phone = item.phone || item.mobile || "N/A";
                  const ut = item.userType;
                  const avatarCls = getAvatarClass(ut);
                  const badgeStyle = getTypeBadgeStyle(ut);
                  const canEditDelete = ut !== "family" || isSuperAdmin;

                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <div className="user-name-cell">
                          <div className={`mini-avatar ${avatarCls}`}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-category" style={badgeStyle}>
                          {getTypeLabel(ut)}
                        </span>
                      </td>
                      <td>{phone}</td>
                      {activeTab === "residents" && (
                        <td>
                          <span className="badge-unit">
                            {(item.flatNumber || item.flat || item.flatNo || "N/A")} {item.block ? `/ ${item.block}` : ""} {item.tower ? `/ ${item.tower}` : ""}
                          </span>
                        </td>
                      )}
                      {activeTab === "guards" && (
                        <td>
                          <span className="badge-unit">{item.employeeId || item.empId || "N/A"}</span>
                        </td>
                      )}
                      {activeTab === "services" && (
                        <td>
                          <span className="badge-category">{item.category || item.serviceType || item.service || "N/A"}</span>
                        </td>
                      )}
                      {activeTab === "family" && (
                        <td>
                          <span className="badge-unit">{item.relation || item.relationship || "N/A"}</span>
                        </td>
                      )}
                      {(activeTab === "residents" || activeTab === "guards" || activeTab === "services") && (
                        <td>
                          <StatusBadge status={item.status || "Active"} />
                        </td>
                      )}
                      {isSuperAdmin && activeTab === "family" && (
                        <td>
                          <span className="badge-category">
                            {typeof item.resident === "object" ? item.resident?.name || "N/A" : item.resident || "N/A"}
                          </span>
                        </td>
                      )}
                      {isSuperAdmin && (
                        <td>
                          <span className="badge-category">
                            {typeof item.society === "object" ? item.society?.name || "Society" : item.society || "N/A"}
                          </span>
                        </td>
                      )}
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="icon-action-btn icon-action-btn-view"
                            onClick={() => handleOpenDetail(id, item)}
                            title="View"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          {canEditDelete && (
                            <>
                              <button
                                className="icon-action-btn icon-action-btn-edit"
                                onClick={() => handleOpenEdit(item)}
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button
                                className="icon-action-btn icon-action-btn-delete"
                                onClick={() => setDeleteTarget(item)}
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
            totalItems={filteredData.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3>
                {editingUser
                  ? `Edit ${getTypeLabel(modalUserType)}`
                  : `Add New ${getTypeLabel(modalUserType)}`}
              </h3>
              <button className="icon-btn-close" onClick={() => setIsModalOpen(false)}>
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
                {isSuperAdmin && (
                  <SocietySelect
                    value={formSociety}
                    onChange={setFormSociety}
                    required
                  />
                )}
                {modalUserType === "resident" && (
                  <>
                    <div className="form-group mb-4">
                      <label htmlFor="userName">Full Name</label>
                      <input id="userName" type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userPhone">Phone Number</label>
                      <input id="userPhone" type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userEmail">Email (Optional)</label>
                      <input id="userEmail" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userPassword">
                        Password {editingUser && <span className="text-muted" style={{ fontWeight: 400 }}>(leave blank to keep current)</span>}
                      </label>
                      <div className="input-with-icon">
                        <input id="userPassword" type={showPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} required={!editingUser} style={{ paddingRight: "40px", width: "100%" }} />
                        <button type="button" className="input-password-toggle password-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userAge">Age (Optional)</label>
                      <input id="userAge" type="number" value={formAge} onChange={(e) => setFormAge(e.target.value)} />
                    </div>
                    <div className="dashboard-content-grid" style={{ gap: "12px" }}>
                      <div className="form-group">
                        <label htmlFor="userFlat">Flat Number</label>
                        <input id="userFlat" type="text" value={formFlatNumber} onChange={(e) => setFormFlatNumber(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label htmlFor="userBlock">Block</label>
                        <input id="userBlock" type="text" value={formBlock} onChange={(e) => setFormBlock(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="userTower">Tower / Wing</label>
                      <input id="userTower" type="text" value={formTower} onChange={(e) => setFormTower(e.target.value)} />
                    </div>
                  </>
                )}
                {modalUserType === "guard" && (
                  <>
                    <div className="form-group mb-4">
                      <label htmlFor="userName">Guard Name</label>
                      <input id="userName" type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userEmpId">Employee ID</label>
                      <input id="userEmpId" type="text" value={formEmployeeId} onChange={(e) => setFormEmployeeId(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userPhone">Phone Number (Optional)</label>
                      <input id="userPhone" type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userPassword">
                        Password {editingUser && <span className="text-muted" style={{ fontWeight: 400 }}>(leave blank to keep current)</span>}
                      </label>
                      <div className="input-with-icon">
                        <input id="userPassword" type={showPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} required={!editingUser} style={{ paddingRight: "40px", width: "100%" }} />
                        <button type="button" className="input-password-toggle password-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {modalUserType === "service" && (
                  <>
                    <div className="form-group mb-4">
                      <label htmlFor="userName">Provider Name</label>
                      <input id="userName" type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userCategory">Service Category</label>
                      <input id="userCategory" type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userPhone">Phone Number</label>
                      <input id="userPhone" type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
                    </div>
                  </>
                )}
                {modalUserType === "family" && (
                  <>
                    <div className="form-group mb-4">
                      <label>Resident (Optional)</label>
                      <select value={formResident} onChange={(e) => setFormResident(e.target.value)}>
                        <option value="">Select Resident</option>
                        {availableResidents.map((res) => (
                          <option key={res._id || res.id} value={res._id || res.id}>
                            {res.name} - {res.flatNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userName">Full Name</label>
                      <input id="userName" type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userRelation">Relationship</label>
                      <input id="userRelation" type="text" value={formRelation} onChange={(e) => setFormRelation(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userAge">Age (Optional)</label>
                      <input id="userAge" type="number" value={formAge} onChange={(e) => setFormAge(e.target.value)} />
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="userPhone">Phone Number (Optional)</label>
                      <input id="userPhone" type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="userFlat">Flat / Unit Number</label>
                      <input id="userFlat" type="text" value={formFlatNumber} onChange={(e) => setFormFlatNumber(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving
                    ? "Saving..."
                    : editingUser
                      ? `Update ${getTypeLabel(modalUserType)}`
                      : `Add ${getTypeLabel(modalUserType)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete ${getTypeLabel(deleteTarget?.userType || "user")} "${deleteTarget?.name || deleteTarget?.fullName || "this user"}"?`}
        confirmText="Delete"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DetailModal
        isOpen={isDetailOpen}
        title={`${getTypeLabel(modalUserType || "user")} Details`}
        data={detailItem}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};

export default Users;
