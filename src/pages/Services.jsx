import { useState, useEffect, useMemo } from "react";
import {
  getServices,
  getServiceById,
  createServiceProvider,
  updateService,
  deleteService,
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

const Services = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const planLimits = normalizePlanLimits(user);
  const currentServiceCount = services.length;
  const canCreateService =
    isSuperAdmin || currentServiceCount < planLimits.maxServices;

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
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
  const [formCategory, setFormCategory] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSociety, setFormSociety] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchServicesList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load local services:", err);
      setError(getErrorMessage(err, "Failed to load local service providers."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesList();
  }, []);

  // Filter local services client-side by debounced search
  const filteredServices = useMemo(() => {
    if (!debouncedSearch.trim()) return services;
    const term = debouncedSearch.toLowerCase().trim();
    return services.filter((item) => {
      const name = item.name || item.fullName || item.providerName || "";
      const category = item.category || item.serviceType || item.service || "";
      const phone = item.phone || item.mobile || "";
      const societyName =
        typeof item.society === "object"
          ? item.society?.name || ""
          : item.society || "";
      return (
        name.toLowerCase().includes(term) ||
        category.toLowerCase().includes(term) ||
        phone.toLowerCase().includes(term) ||
        societyName.toLowerCase().includes(term)
      );
    });
  }, [services, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredServices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredServices, currentPage]);

  const handleOpenCreate = () => {
    if (!canCreateService) {
      setFormError(
        `Service provider limit reached. Your plan allows ${planLimits.maxServices === Infinity ? "Unlimited" : planLimits.maxServices} providers.`,
      );
      return;
    }

    setEditingItem(null);
    setFormName("");
    setFormCategory("");
    setFormPhone("");
    setFormSociety("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormName(item.name || item.fullName || item.providerName || "");
    setFormCategory(item.category || item.serviceType || item.service || "");
    setFormPhone(item.phone || item.mobile || "");
    setFormSociety(
      typeof item.society === "object"
        ? item.society?._id || item.society?.id || ""
        : item.society || "",
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formCategory.trim() || !formPhone.trim()) {
      setFormError("Please fill in provider name, category, and phone number.");
      return;
    }
    if (isSuperAdmin && !formSociety) {
      setFormError("Please select a society for this service provider.");
      return;
    }
    if (!isSuperAdmin && !canCreateService && !editingItem) {
      setFormError(
        `Service provider limit reached. Your plan allows ${planLimits.maxServices === Infinity ? "Unlimited" : planLimits.maxServices} providers.`,
      );
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        name: formName.trim(),
        category: formCategory.trim(),
        phone: formPhone.trim(),
      };
      if (isSuperAdmin && formSociety) payload.society = formSociety;

      if (editingItem) {
        await updateService(editingItem._id || editingItem.id, payload);
      } else {
        await createServiceProvider(payload);
      }

      setIsModalOpen(false);
      await fetchServicesList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingItem
            ? "Failed to update service provider."
            : "Failed to create local service provider.",
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
      const fullDetail = await getServiceById(id);
      if (fullDetail) {
        setDetailItem(fullDetail);
      }
    } catch (err) {
      console.error("Failed to fetch service detail:", err);
      setDetailError(
        getErrorMessage(err, "Could not load full service provider details."),
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteService(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchServicesList();
    } catch (err) {
      console.error("Failed to delete local service provider:", err);
      alert(getErrorMessage(err, "Failed to delete service provider record."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Local Service Providers</h1>
          <p className="page-description">
            Manage approved plumbers, electricians, maids, and maintenance
            services
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchServicesList}
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
            <span>Add Service</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by provider name, service category, or phone..."
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
          <LoadingSpinner text="Loading local services directory..." />
        </div>
      ) : paginatedServices.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Service Providers Found</h3>
          <p className="text-muted">
            {searchTerm
              ? "No service providers matched your search filters."
              : "There are currently no registered local services."}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider Name</th>
                  <th>Category / Service</th>
                  <th>Phone Number</th>
                  {isSuperAdmin && <th>Society</th>}
                  <th>Approval Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((item) => {
                  const id = item._id || item.id;
                  const name =
                    item.name || item.fullName || item.providerName || "N/A";
                  const category =
                    item.category ||
                    item.serviceType ||
                    item.service ||
                    "General Service";
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
                          <div className="mini-avatar avatar-purple">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-category">{category}</span>
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
                            className="btn btn-sm btn-outline"
                            onClick={() => handleOpenDetail(id, item)}
                          >
                            View
                          </button>
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
            totalItems={filteredServices.length}
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
                {editingItem
                  ? "Edit Service Provider"
                  : "Add Local Service Provider"}
              </h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveService}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger mb-4">
                    <span>{formError}</span>
                  </div>
                )}

                {isSuperAdmin && (
                  <SocietySelect
                    id="serviceSociety"
                    value={formSociety}
                    onChange={setFormSociety}
                    required
                  />
                )}

                <div className="form-group mb-4">
                  <label htmlFor="serviceName">Provider Name</label>
                  <input
                    id="serviceName"
                    type="text"
                    placeholder="Enter provider name or business"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="serviceCategorySelect">
                    Service Category Selection
                  </label>
                  <select
                    id="serviceCategorySelect"
                    onChange={(e) => {
                      if (e.target.value !== "CUSTOM") {
                        setFormCategory(e.target.value);
                      }
                    }}
                    value={
                      [
                        "Plumber",
                        "Electrician",
                        "Carpenter",
                        "Maid & Housekeeping",
                        "Pest Control",
                        "Milk & Newspaper Delivery",
                        "AC Maintenance & Repair",
                        "Gardener",
                        "Painter & Decorator",
                        "Laundry & Dry Cleaning",
                        "Security & CCTV Service",
                      ].includes(formCategory)
                        ? formCategory
                        : "CUSTOM"
                    }
                  >
                    <option value="Plumber">Plumber</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Maid & Housekeeping">
                      Maid & Housekeeping
                    </option>
                    <option value="Pest Control">Pest Control</option>
                    <option value="Milk & Newspaper Delivery">
                      Milk & Newspaper Delivery
                    </option>
                    <option value="AC Maintenance & Repair">
                      AC Maintenance & Repair
                    </option>
                    <option value="Gardener">Gardener</option>
                    <option value="Painter & Decorator">
                      Painter & Decorator
                    </option>
                    <option value="Laundry & Dry Cleaning">
                      Laundry & Dry Cleaning
                    </option>
                    <option value="Security & CCTV Service">
                      Security & CCTV Service
                    </option>
                    <option value="CUSTOM">Other / Custom Service...</option>
                  </select>
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="serviceCategory">
                    Category Name (Or Custom)
                  </label>
                  <input
                    id="serviceCategory"
                    type="text"
                    placeholder="Enter or select service category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="servicePhone">Phone Number</label>
                  <input
                    id="servicePhone"
                    type="text"
                    placeholder="Enter phone number"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    required
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
                      ? "Update Service"
                      : "Create Service Provider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Service Provider"
        message={`Are you sure you want to delete service provider "${deleteTarget?.name || deleteTarget?.providerName || "this provider"}"?`}
        confirmText="Delete Provider"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Detail View Modal */}
      <DetailModal
        isOpen={isDetailOpen}
        title="Service Provider Details"
        data={detailItem}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};

export default Services;
