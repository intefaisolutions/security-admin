import { useState, useEffect, useMemo } from "react";
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getResidents,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import SocietySelect from "../components/SocietySelect";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";
import DetailModal from "../components/DetailModal";
import { getErrorMessage } from "../utils/getErrorMessage";

const ITEMS_PER_PAGE = 8;

const FamilyMembers = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const canCreateFamilyMember = isSuperAdmin;

  const [members, setMembers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [society, setSociety] = useState("");
  const [resident, setResident] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail View State
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchMembersList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [membersData, residentsData] = await Promise.allSettled([
        getFamilyMembers(),
        getResidents(),
      ]);
      setMembers(
        membersData.status === "fulfilled" && Array.isArray(membersData.value)
          ? membersData.value
          : [],
      );
      setResidents(
        residentsData.status === "fulfilled" && Array.isArray(residentsData.value)
          ? residentsData.value
          : [],
      );
    } catch (err) {
      console.error("Failed to load family members:", err);
      setError(getErrorMessage(err, "Failed to load family members roster."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersList();
  }, []);

  const filteredMembers = useMemo(() => {
    if (!debouncedSearch.trim()) return members;
    const term = debouncedSearch.toLowerCase().trim();
    return members.filter((m) => {
      const n = m.name || m.fullName || "";
      const r = m.relation || m.relationship || "";
      const p = m.phone || m.mobile || "";
      const flat = m.flatNumber || m.flat || "";
      const soc =
        typeof m.society === "object" ? m.society?.name || "" : m.society || "";
      return (
        n.toLowerCase().includes(term) ||
        r.toLowerCase().includes(term) ||
        p.toLowerCase().includes(term) ||
        String(flat).toLowerCase().includes(term) ||
        soc.toLowerCase().includes(term)
      );
    });
  }, [members, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName("");
    setRelation("");
    setAge("");
    setPhone("");
    setFlatNumber("");
    setSociety("");
    setResident("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name || item.fullName || "");
    setRelation(item.relation || item.relationship || "");
    setAge(item.age || "");
    setPhone(item.phone || item.mobile || "");
    setFlatNumber(item.flatNumber || item.flat || "");
    setSociety(
      typeof item.society === "object"
        ? item.society?._id || item.society?.id || ""
        : item.society || "",
    );
    setResident(
      typeof item.resident === "object"
        ? item.resident?._id || item.resident?.id || ""
        : item.resident || "",
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (item) => {
    const cleanProfile = {
      name: item.name || item.fullName || "N/A",
      relation: item.relation || item.relationship || "Family",
      age: item.age || "N/A",
      phone: item.phone || item.mobile || "N/A",
      flatNumber: item.flatNumber || item.flat || "N/A",
      society:
        typeof item.society === "object"
          ? item.society?.name || "Society"
          : item.society || "N/A",
      resident:
        typeof item.resident === "object"
          ? item.resident?.name || "N/A"
          : item.resident || "N/A",
    };
    setDetailItem(cleanProfile);
    setIsDetailOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canCreateFamilyMember) {
      setFormError("You do not have permission to modify family members.");
      return;
    }
    if (!name.trim() || !relation.trim()) {
      setFormError("Member name and relationship are required.");
      return;
    }
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }
    if (isSuperAdmin && !society) {
      setFormError("Please select a society.");
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        relation: relation.trim(),
        phone: phone.trim(),
        flatNumber: flatNumber.trim(),
      };
      if (age && !isNaN(Number(age))) payload.age = Number(age);
      if (isSuperAdmin && society) payload.society = society;
      if (resident) payload.resident = resident;

      if (editingItem) {
        await updateFamilyMember(editingItem._id || editingItem.id, payload);
      } else {
        await createFamilyMember(payload);
      }

      setIsModalOpen(false);
      await fetchMembersList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingItem
            ? "Failed to update family member."
            : "Failed to add family member.",
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
      await deleteFamilyMember(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchMembersList();
    } catch (err) {
      alert(getErrorMessage(err, "Failed to delete family member record."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Family Member Management</h1>
          <p className="page-description">
            Manage resident family members, dependants, and emergency contacts
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchMembersList}
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
          {canCreateFamilyMember && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <span>Add Family Member</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search family members by name, relation, phone, flat..."
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
          <LoadingSpinner text="Loading family members list..." />
        </div>
      ) : paginatedMembers.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Family Members Found</h3>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Relationship</th>
                  <th>Age</th>
                  <th>Flat / Unit</th>
                  <th>Resident</th>
                  <th>Phone Number</th>
                  {isSuperAdmin && <th>Society</th>}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((item) => {
                  const id = item._id || item.id;
                  const mName = item.name || item.fullName || "N/A";
                  const mRel = item.relation || item.relationship || "Family";
                  const mAge = item.age || "N/A";
                  const mPhone = item.phone || item.mobile || "N/A";
                  const mFlat = item.flatNumber || item.flat || "N/A";
                  const societyName =
                    typeof item.society === "object"
                      ? item.society?.name || "Society"
                      : item.society || "N/A";
                  const residentName =
                    typeof item.resident === "object"
                      ? item.resident?.name || "N/A"
                      : item.resident || "N/A";

                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <span className="font-semibold">{mName}</span>
                      </td>
                      <td>
                        <span className="badge-unit">{mRel}</span>
                      </td>
                      <td>
                        <span className="badge-unit">{mAge}</span>
                      </td>
                      <td>
                        <span className="badge-unit">{mFlat}</span>
                      </td>
                      <td>
                        <span className="badge-category">{residentName}</span>
                      </td>
                      <td>{mPhone}</td>
                      {isSuperAdmin && (
                        <td>
                          <span className="badge-category">{societyName}</span>
                        </td>
                      )}
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="icon-action-btn icon-action-btn-view"
                            onClick={() => handleOpenDetail(item)}
                            title="View Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          {canCreateFamilyMember && (
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
            totalItems={filteredMembers.length}
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
                {editingItem ? "Edit Family Member" : "Add Family Member"}
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
                {isSuperAdmin && (
                  <SocietySelect
                    value={society}
                    onChange={setSociety}
                    required
                  />
                )}
                <div className="form-group mb-4">
                  <label>Resident (Optional)</label>
                  <select
                    value={resident}
                    onChange={(e) => setResident(e.target.value)}
                  >
                    <option value="">Select Resident</option>
                    {residents.map((res) => (
                      <option key={res._id || res.id} value={res._id || res.id}>
                        {res.name} - {res.flatNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-4">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Relationship (e.g. Spouse, Child, Parent)</label>
                  <input
                    type="text"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Age (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Flat / Unit Number</label>
                  <input
                    type="text"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    placeholder="e.g. 102"
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                      ? "Update Member"
                      : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Family Member"
        message={`Are you sure you want to remove family member "${deleteTarget?.name}"?`}
        confirmText="Delete"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Detail View Modal */}
      <DetailModal
        isOpen={isDetailOpen}
        title="Family Member Details"
        data={detailItem}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};

export default FamilyMembers;
