import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getResidents,
  getResidentById,
  createResident,
  updateResident,
  deleteResident,
  getFamilyMembers,
  getFamilyMembersForResident,
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

const Residents = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [residents, setResidents] = useState([]);
  const [familyMembersList, setFamilyMembersList] = useState([]);
  const planLimits = normalizePlanLimits(user);
  const currentResidentCount = residents.length;
  const canCreateResident =
    isSuperAdmin || currentResidentCount < planLimits.maxResidents;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const [formPhone, setFormPhone] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formFlatNumber, setFormFlatNumber] = useState("");
  const [formBlock, setFormBlock] = useState("");
  const [formTower, setFormTower] = useState("");
  const [formSociety, setFormSociety] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchResidentsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resData, famData] = await Promise.allSettled([
        getResidents(),
        getFamilyMembers(),
      ]);

      setResidents(
        resData.status === "fulfilled" && Array.isArray(resData.value)
          ? resData.value
          : [],
      );
      setFamilyMembersList(
        famData.status === "fulfilled" && Array.isArray(famData.value)
          ? famData.value
          : [],
      );
    } catch (err) {
      console.error("Failed to load residents:", err);
      setError(getErrorMessage(err, "Failed to load residents list."));
    } finally {
      setIsLoading(false);
    }
  };

  const getFamilyCount = (residentItem, famList) => {
    if (typeof residentItem.familyCount === "number")
      return residentItem.familyCount;
    if (Array.isArray(residentItem.familyMembers))
      return residentItem.familyMembers.length;
    if (Array.isArray(residentItem.family)) return residentItem.family.length;

    const resId = String(residentItem._id || residentItem.id || "");
    const resFlat = String(residentItem.flatNumber || residentItem.flat || "")
      .trim()
      .toLowerCase();
    const resSocietyId =
      typeof residentItem.society === "object"
        ? String(residentItem.society?._id || residentItem.society?.id || "")
        : String(residentItem.society || "");

    if (!Array.isArray(famList) || famList.length === 0) return 0;

    return famList.filter((fam) => {
      const famResId =
        typeof fam.resident === "object"
          ? String(fam.resident?._id || fam.resident?.id || "")
          : String(fam.resident || fam.residentId || "");
      if (resId && famResId && famResId === resId) return true;

      const famFlat = String(fam.flatNumber || fam.flat || "")
        .trim()
        .toLowerCase();
      const famSocietyId =
        typeof fam.society === "object"
          ? String(fam.society?._id || fam.society?.id || "")
          : String(fam.society || "");

      if (resFlat && famFlat && resFlat === famFlat) {
        if (!resSocietyId || !famSocietyId || resSocietyId === famSocietyId)
          return true;
      }
      return false;
    }).length;
  };

  const getResidentFamilyList = (residentObj, famList) => {
    const resId = String(residentObj._id || residentObj.id || "");
    const resFlat = String(residentObj.flatNumber || residentObj.flat || "")
      .trim()
      .toLowerCase();
    const resSocietyId =
      typeof residentObj.society === "object"
        ? String(residentObj.society?._id || residentObj.society?.id || "")
        : String(residentObj.society || "");

    if (!Array.isArray(famList) || famList.length === 0) return [];

    return famList.filter((fam) => {
      const famResId =
        typeof fam.resident === "object"
          ? String(fam.resident?._id || fam.resident?.id || "")
          : String(fam.resident || fam.residentId || "");
      if (resId && famResId && famResId === resId) return true;

      const famFlat = String(fam.flatNumber || fam.flat || "")
        .trim()
        .toLowerCase();
      const famSocietyId =
        typeof fam.society === "object"
          ? String(fam.society?._id || fam.society?.id || "")
          : String(fam.society || "");

      if (resFlat && famFlat && resFlat === famFlat) {
        if (!resSocietyId || !famSocietyId || resSocietyId === famSocietyId)
          return true;
      }
      return false;
    });
  };

  useEffect(() => {
    fetchResidentsList();
  }, []);

  // Filter residents client-side by debounced search
  const filteredResidents = useMemo(() => {
    if (!debouncedSearch.trim()) return residents;
    const term = debouncedSearch.toLowerCase().trim();
    return residents.filter((res) => {
      const name = res.name || res.fullName || "";
      const phone = res.phone || res.mobile || "";
      const email = res.email || "";
      const flat =
        res.flatNumber ||
        res.flat ||
        res.flatNo ||
        res.unit ||
        res.houseNo ||
        "";
      const societyName =
        typeof res.society === "object"
          ? res.society?.name || ""
          : res.society || "";
      return (
        name.toLowerCase().includes(term) ||
        phone.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        String(flat).toLowerCase().includes(term) ||
        societyName.toLowerCase().includes(term)
      );
    });
  }, [residents, debouncedSearch]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredResidents.length / ITEMS_PER_PAGE);
  const paginatedResidents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredResidents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredResidents, currentPage]);

  // Open Create Modal
  const handleOpenCreate = () => {
    if (!canCreateResident) {
      setFormError(
        `Resident creation limit reached. Your plan allows ${planLimits.maxResidents === Infinity ? "Unlimited" : planLimits.maxResidents} residents.`,
      );
      return;
    }

    setEditingItem(null);
    setFormName("");
    setFormPhone("");
    setFormAge("");
    setFormPassword("");
    setFormFlatNumber("");
    setFormBlock("");
    setFormTower("");
    setFormSociety("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormName(item.name || item.fullName || "");
    setFormPhone(item.phone || item.mobile || "");
    setFormAge(item.age || "");
    setFormPassword("");
    setFormFlatNumber(item.flatNumber || item.flat || item.flatNo || "");
    setFormBlock(item.block || "");
    setFormTower(item.tower || "");
    setFormSociety(
      typeof item.society === "object"
        ? item.society?._id || item.society?.id || ""
        : item.society || "",
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Create or Edit Resident
  const handleSaveResident = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError("Please fill in name and phone number.");
      return;
    }
    if (!/^\d{10}$/.test(formPhone.trim())) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }

    if (!editingItem && !formPassword.trim()) {
      setFormError("Password is required when creating a new resident.");
      return;
    }

    if (formPassword.trim() && formPassword.trim().length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (isSuperAdmin && !formSociety) {
      setFormError("Please select a society for this resident.");
      return;
    }
    if (!isSuperAdmin && !canCreateResident && !editingItem) {
      setFormError(
        `Resident creation limit reached. Your plan allows ${planLimits.maxResidents === Infinity ? "Unlimited" : planLimits.maxResidents} residents.`,
      );
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim(),
        flatNumber: formFlatNumber.trim(),
        block: formBlock.trim(),
        tower: formTower.trim(),
      };
      if (formAge && !isNaN(Number(formAge))) payload.age = Number(formAge);
      if (formPassword.trim()) payload.password = formPassword.trim();
      if (isSuperAdmin && formSociety) payload.society = formSociety;

      if (editingItem) {
        await updateResident(editingItem._id || editingItem.id, payload);
      } else {
        await createResident(payload);
      }

      setIsModalOpen(false);
      await fetchResidentsList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingItem
            ? "Failed to update resident."
            : "Failed to create resident.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Detail View
  const handleOpenDetail = async (id, rowData) => {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const [fullDetail, residentFamData] = await Promise.allSettled([
        getResidentById(id),
        getFamilyMembersForResident(id),
      ]);

      const resObj =
        fullDetail.status === "fulfilled" && fullDetail.value
          ? fullDetail.value
          : rowData;
      let residentFamList = [];
      if (
        residentFamData.status === "fulfilled" &&
        Array.isArray(residentFamData.value)
      ) {
        residentFamList = residentFamData.value;
      } else {
        residentFamList = getResidentFamilyList(resObj, familyMembersList);
      }

      const cleanProfile = {
        name: resObj.name || resObj.fullName || "N/A",
        phone: resObj.phone || resObj.mobile || "N/A",
        age: resObj.age || "N/A",
        flatNumber: resObj.flatNumber || resObj.flat || "N/A",
        block: resObj.block || "N/A",
        tower: resObj.tower || "N/A",
        society:
          typeof resObj.society === "object"
            ? resObj.society?.name
            : resObj.society || "N/A",
        status: resObj.status || "Active",
        familyMembersCount: residentFamList.length,
        familyMembers: residentFamList.map((fam) => ({
          name: fam.name || fam.fullName || "N/A",
          relation: fam.relation || fam.relationship || "Family",
          age: fam.age || "N/A",
          phone: fam.phone || fam.mobile || "",
        })),
      };

      setDetailItem(cleanProfile);
    } catch (err) {
      console.error("Failed to fetch resident detail:", err);
      setDetailError(
        getErrorMessage(err, "Could not load full resident profile."),
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteResident(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchResidentsList();
    } catch (err) {
      console.error("Failed to delete resident:", err);
      alert(getErrorMessage(err, "Failed to delete resident record."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Residents Management</h1>
          <p className="page-description">
            View, search, and manage registered society residents
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchResidentsList}
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
            <span>Add Resident</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search residents by name, phone, flat..."
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

      {/* Table Content Area */}
      {error && (
        <div className="alert alert-danger my-4">
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card-box flex-center p-8">
          <LoadingSpinner text="Loading residents directory..." />
        </div>
      ) : paginatedResidents.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Residents Found</h3>
          <p className="text-muted">
            {searchTerm
              ? "No residents matched your search filters."
              : "There are currently no registered residents."}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resident Name</th>
                  <th>Phone</th>
                  <th>Flat / Unit</th>
                  <th>Family Members</th>
                  {isSuperAdmin && <th>Society</th>}
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResidents.map((item) => {
                  const id = item._id || item.id;
                  const name = item.name || item.fullName || "N/A";
                  const phone = item.phone || item.mobile || "N/A";
                  const flat =
                    item.flatNumber ||
                    item.flat ||
                    item.flatNo ||
                    item.unit ||
                    item.houseNo ||
                    "N/A";
                  const societyName =
                    typeof item.society === "object"
                      ? item.society?.name || "Society"
                      : item.society || "N/A";
                  const status = item.status || "Active";
                  const familyCount = getFamilyCount(item, familyMembersList);

                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <div className="user-name-cell">
                          <div className="mini-avatar">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{name}</span>
                        </div>
                      </td>
                      <td>{phone}</td>
                      <td>
                        <span className="badge-unit">{flat}</span>
                      </td>
                      <td>
                        <span
                          className="badge-category"
                          style={{
                            backgroundColor: "rgba(59, 130, 246, 0.15)",
                            color: "#3b82f6",
                          }}
                        >
                          {familyCount} Member{familyCount === 1 ? "" : "s"}
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
            totalItems={filteredResidents.length}
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
                {editingItem ? "Edit Resident Profile" : "Add New Resident"}
              </h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveResident}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger mb-4">
                    <span>{formError}</span>
                  </div>
                )}

                {isSuperAdmin && (
                  <SocietySelect
                    id="resSociety"
                    value={formSociety}
                    onChange={setFormSociety}
                    required
                  />
                )}

                <div className="form-group mb-4">
                  <label htmlFor="resName">Full Name</label>
                  <input
                    id="resName"
                    type="text"
                    placeholder="Enter resident full name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="resPhone">Phone Number</label>
                  <input
                    id="resPhone"
                    type="text"
                    placeholder="Enter phone number"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="resAge">Age (Optional)</label>
                  <input
                    id="resAge"
                    type="number"
                    placeholder="e.g. 35"
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="resPassword">
                    Password{" "}
                    {editingItem && (
                      <span className="text-muted" style={{ fontWeight: 400 }}>
                        (leave blank to keep current)
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="residentPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        editingItem ? "New password (optional)" : "Enter password"
                      }
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      style={{ paddingRight: '40px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
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

                <div className="dashboard-content-grid" style={{ gap: "12px" }}>
                  <div className="form-group">
                    <label htmlFor="resFlat">Flat Number</label>
                    <input
                      id="resFlat"
                      type="text"
                      placeholder="e.g. 402"
                      value={formFlatNumber}
                      onChange={(e) => setFormFlatNumber(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="resTower">Tower / Wing</label>
                    <input
                      id="resTower"
                      type="text"
                      placeholder="e.g. Tower B"
                      value={formTower}
                      onChange={(e) => setFormTower(e.target.value)}
                    />
                  </div>
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
                      ? "Update Resident"
                      : "Create Resident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Resident Record"
        message={`Are you sure you want to delete resident "${deleteTarget?.name || deleteTarget?.fullName || "this resident"}"?`}
        confirmText="Delete Resident"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Detail View Modal */}
      <DetailModal
        isOpen={isDetailOpen}
        title="Resident Profile Details"
        data={detailItem}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};

export default Residents;
