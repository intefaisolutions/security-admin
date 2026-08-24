import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getVisitors,
  createVisitor,
  updateVisitor,
  deleteVisitor,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import SocietySelect from "../components/SocietySelect";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import { getErrorMessage } from "../utils/getErrorMessage";

const ITEMS_PER_PAGE = 8;

const ROLE_OPTIONS = []; // Removed role options as visitors do not have roles.

const Visitors = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const userSocietyId =
    typeof user?.society === "object"
      ? user?.society?._id || user?.society?.id || ""
      : user?.society || "";

  const [visitors, setVisitors] = useState([]);
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

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [society, setSociety] = useState(userSocietyId || "");
  const [expectedDate, setExpectedDate] = useState("");
  const [expectedTime, setExpectedTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVisitorsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const responseData = await getVisitors();
      const visitorsArray = Array.isArray(responseData?.data) ? responseData.data : (Array.isArray(responseData) ? responseData : []);
      setVisitors(visitorsArray);
    } catch (err) {
      console.error("Failed to load visitors:", err);
      setError(getErrorMessage(err, "Failed to load visitors directory."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitorsList();
  }, []);

  const filteredVisitors = useMemo(() => {
    if (!debouncedSearch.trim()) return visitors;
    const term = debouncedSearch.toLowerCase().trim();
    return visitors.filter((v) => {
      const n = v.name || v.visitorName || "";
      const p = v.phone || v.mobile || "";
      const purp = v.purpose || "";
      const flat = v.flatNumber || v.flat || "";
      const soc =
        typeof v.society === "object" ? v.society?.name || "" : v.society || "";
      return (
        n.toLowerCase().includes(term) ||
        p.toLowerCase().includes(term) ||
        purp.toLowerCase().includes(term) ||
        String(flat).toLowerCase().includes(term) ||
        soc.toLowerCase().includes(term)
      );
    });
  }, [visitors, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredVisitors.length / ITEMS_PER_PAGE);
  const paginatedVisitors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVisitors.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVisitors, currentPage]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName("");
    setPurpose("");
    setFlatNumber("");
    setSociety(userSocietyId || "");
    setExpectedDate("");
    setExpectedTime("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name || item.visitorName || "");
    setPurpose(item.purpose || "");
    setFlatNumber(item.flatNumber || item.flat || "");
    setSociety(
      typeof item.society === "object"
        ? item.society?._id || item.society?.id || ""
        : item.society || userSocietyId || "",
    );
    
    // Convert date object to YYYY-MM-DD if expectedDate exists
    let formattedDate = "";
    if (item.expectedDate) {
      try {
        const d = new Date(item.expectedDate);
        formattedDate = d.toISOString().split("T")[0];
      } catch (e) {}
    }
    
    setExpectedDate(formattedDate);
    setExpectedTime(item.expectedTime || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Visitor name is required.");
      return;
    }
    if (!society) {
      setFormError("Please select a society.");
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        purpose: purpose.trim(),
        flatNumber: flatNumber.trim(),
        expectedDate: expectedDate || undefined,
        expectedTime: expectedTime || undefined,
        society,
      };

      if (editingItem) {
        await updateVisitor(editingItem._id || editingItem.id, payload);
      } else {
        await createVisitor(payload);
      }

      setIsModalOpen(false);
      await fetchVisitorsList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingItem
            ? "Failed to update visitor."
            : "Failed to create visitor entry.",
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
      await deleteVisitor(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchVisitorsList();
    } catch (err) {
      alert(getErrorMessage(err, "Failed to delete visitor entry."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Visitor Management</h1>
          <p className="page-description">
            Log, verify, and track guest & delivery check-ins
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchVisitorsList}
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
            <span>Add Visitor</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search visitors by name, phone, purpose, or flat..."
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
          <LoadingSpinner text="Loading visitor logs..." />
        </div>
      ) : paginatedVisitors.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Visitors Recorded</h3>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Visitor Name</th>
                  <th>Visiting Flat</th>
                  <th>Purpose</th>
                  <th>Expected Date & Time</th>
                  {isSuperAdmin && <th>Society</th>}
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVisitors.map((item) => {
                  const id = item._id || item.id;
                  const vName = item.name || item.visitorName || "N/A";
                  const vPhone = item.phone || item.mobile || "N/A";
                  const vFlat = item.flatNumber || item.flat || "N/A";
                  const vPurpose = item.purpose || "Guest";
                  const societyName =
                    typeof item.society === "object"
                      ? item.society?.name || "Society"
                      : item.society || "N/A";
                  const status = item.status || "Checked In";
                  const vRoles = Array.isArray(item.roles) ? item.roles : [];

                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <span className="font-semibold">{vName}</span>
                      </td>
                      <td>
                        <span className="badge-unit">{vFlat}</span>
                      </td>
                      <td>
                        <span className="badge-category">{vPurpose}</span>
                      </td>
                      <td>
                        {item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : "N/A"}{" "}
                        {item.expectedTime || ""}
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
            totalItems={filteredVisitors.length}
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
                {editingItem ? "Edit Visitor Details" : "Add New Visitor"}
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
                {(!userSocietyId || isSuperAdmin) && (
                  <SocietySelect
                    value={society}
                    onChange={setSociety}
                    required
                  />
                )}
                
                <div className="form-group mb-4">
                  <label>Visitor Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Visiting Flat / Unit Number</label>
                  <input
                    type="text"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    placeholder="e.g. 301"
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Purpose of Visit</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Delivery / Guest"
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Expected Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Expected Time (Optional)</label>
                  <input
                    type="time"
                    value={expectedTime}
                    onChange={(e) => setExpectedTime(e.target.value)}
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
                      ? "Update Visitor"
                      : "Create Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Visitor Log"
        message={`Are you sure you want to delete visitor log for "${deleteTarget?.name || "this visitor"}"?`}
        confirmText="Delete"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Visitors;
