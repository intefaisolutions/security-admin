import { useState, useEffect, useMemo } from "react";
import { getNews, createNews, updateNews, deleteNews } from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import SocietySelect from "../components/SocietySelect";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";
import { getErrorMessage } from "../utils/getErrorMessage";

const ITEMS_PER_PAGE = 8;

const News = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General Notice");
  const [society, setSociety] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNewsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getNews();
      setNewsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load community news:", err);
      setError(getErrorMessage(err, "Failed to load community announcements."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsList();
  }, []);

  const filteredNews = useMemo(() => {
    if (!debouncedSearch.trim()) return newsList;
    const term = debouncedSearch.toLowerCase().trim();
    return newsList.filter((n) => {
      const t = n.title || "";
      const c = n.content || n.description || "";
      const cat = n.category || "";
      const soc =
        typeof n.society === "object" ? n.society?.name || "" : n.society || "";
      return (
        t.toLowerCase().includes(term) ||
        c.toLowerCase().includes(term) ||
        cat.toLowerCase().includes(term) ||
        soc.toLowerCase().includes(term)
      );
    });
  }, [newsList, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);
  const paginatedNews = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNews.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNews, currentPage]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setTitle("");
    setContent("");
    setCategory("General Notice");
    setSociety("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setTitle(item.title || "");
    setContent(item.content || item.description || "");
    setCategory(item.category || "General Notice");
    setSociety(
      typeof item.society === "object"
        ? item.society?._id || item.society?.id || ""
        : item.society || "",
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError("Announcement title and content are required.");
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
        title: title.trim(),
        body: content.trim(),
        category: category.trim(),
      };
      if (isSuperAdmin && society) payload.society = society;

      if (editingItem) {
        await updateNews(editingItem._id || editingItem.id, payload);
      } else {
        await createNews(payload);
      }

      setIsModalOpen(false);
      await fetchNewsList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingItem
            ? "Failed to update news."
            : "Failed to publish news item.",
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
      await deleteNews(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchNewsList();
    } catch (err) {
      alert(getErrorMessage(err, "Failed to delete news article."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Community News & Circulars</h1>
          <p className="page-description">
            Publish announcements, maintenance updates, and society notices
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchNewsList}
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
            <span>Add News</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search news by title, category, or content..."
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
          <LoadingSpinner text="Loading community news..." />
        </div>
      ) : paginatedNews.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No News Published</h3>
        </div>
      ) : (
        <>
          <div className="table-responsive card-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  {isSuperAdmin && <th>Society</th>}
                  <th>Published Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNews.map((item) => {
                  const id = item._id || item.id;
                  const itemTitle = item.title || "Untitled Notice";
                  const itemCat = item.category || "General";
                  const societyName =
                    typeof item.society === "object"
                      ? item.society?.name || "Society"
                      : item.society || "N/A";

                  return (
                    <tr key={id} className="table-row-hover">
                      <td>
                        <span className="font-semibold">{itemTitle}</span>
                      </td>
                      <td>
                        <span className="badge-category">{itemCat}</span>
                      </td>
                      {isSuperAdmin && (
                        <td>
                          <span className="badge-category">{societyName}</span>
                        </td>
                      )}
                      <td>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "Recent"}
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
            totalItems={filteredNews.length}
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
                {editingItem ? "Edit News Article" : "Add Community News"}
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
                  <label>Title Selection</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value !== "CUSTOM") {
                        setTitle(e.target.value);
                      }
                    }}
                    value={
                      [
                        "General Society Notice",
                        "Scheduled Water Supply Maintenance",
                        "Elevator Maintenance & Servicing",
                        "Power Outage & Generator Servicing",
                        "Pest Control Drive Schedule",
                        "Society Maintenance Fee Due Notice",
                        "Annual General Body Meeting (AGM)",
                        "Festival Celebration Announcement",
                        "Security & Visitor Protocol Update",
                      ].includes(title)
                        ? title
                        : "CUSTOM"
                    }
                  >
                    <option value="General Society Notice">
                      General Society Notice
                    </option>
                    <option value="Scheduled Water Supply Maintenance">
                      Scheduled Water Supply Maintenance
                    </option>
                    <option value="Elevator Maintenance & Servicing">
                      Elevator Maintenance & Servicing
                    </option>
                    <option value="Power Outage & Generator Servicing">
                      Power Outage & Generator Servicing
                    </option>
                    <option value="Pest Control Drive Schedule">
                      Pest Control Drive Schedule
                    </option>
                    <option value="Society Maintenance Fee Due Notice">
                      Society Maintenance Fee Due Notice
                    </option>
                    <option value="Annual General Body Meeting (AGM)">
                      Annual General Body Meeting (AGM)
                    </option>
                    <option value="Festival Celebration Announcement">
                      Festival Celebration Announcement
                    </option>
                    <option value="Security & Visitor Protocol Update">
                      Security & Visitor Protocol Update
                    </option>
                    <option value="CUSTOM">Custom Title...</option>
                  </select>
                </div>

                <div className="form-group mb-4">
                  <label>Title (Or Type Custom)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter or edit announcement title"
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="General Notice">General Notice</option>
                    <option value="Maintenance & Repair">
                      Maintenance & Repair
                    </option>
                    <option value="Security & Safety">Security & Safety</option>
                    <option value="Community Event">Community Event</option>
                    <option value="Billing & Accounts">
                      Billing & Accounts
                    </option>
                    <option value="Emergency Announcement">
                      Emergency Announcement
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group mb-4">
                  <label>Announcement Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    placeholder="Write detailed notice description..."
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
                    ? "Publishing..."
                    : editingItem
                      ? "Update News"
                      : "Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete News Article"
        message={`Are you sure you want to delete news article "${deleteTarget?.title}"?`}
        confirmText="Delete"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default News;
