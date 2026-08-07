import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateAdmin } from "../api/admin";
import { getErrorMessage } from "../utils/getErrorMessage";
import NotificationPopup from "./NotificationPopup";

const Layout = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleOpenProfileModal = () => {
    setProfileName(user?.name || "");
    setProfilePhone(user?.phone || "");
    setIsEditingProfile(false);
    setProfileError(null);
    setProfileSuccess(null);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim() || !profilePhone.trim()) {
      setProfileError("Name and phone number cannot be blank.");
      return;
    }

    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);

    try {
      const payload = {
        name: profileName.trim(),
        phone: profilePhone.trim(),
      };

      const userId = user?._id || user?.id;
      if (userId) {
        await updateAdmin(userId, payload);
      }

      updateUser(payload);
      setProfileSuccess("Profile updated successfully!");
      setIsEditingProfile(false);
    } catch (err) {
      setProfileError(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="app-layout">
      {/* Toast Notification Container for Real-time Socket Events */}
      <NotificationPopup />

      {/* Top Bar Navigation */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="mobile-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
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
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="brand-logo">
            <div className="logo-shield">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-title">IntefAI Security</span>
              <span className="brand-subtitle">
                {user?.role === "super_admin"
                  ? "Super Admin Portal"
                  : "Admin Portal"}
              </span>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <div
            className="user-profile-summary"
            onClick={handleOpenProfileModal}
            style={{ cursor: "pointer" }}
            title="Click to view/edit your profile"
          >
            <div className="avatar-circle">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name || "Super Admin"}</span>
              <span className="user-role">
                {user?.role === "super_admin" ? "Super Admin" : "Admin"}
              </span>
            </div>
          </div>

          <button
            className="btn btn-outline-logout"
            onClick={handleLogout}
            title="Logout"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Super Admin Profile View / Edit Modal */}
      {isProfileModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px", width: "92%" }}
          >
            <div className="modal-header">
              <h3>{isEditingProfile ? "Edit Profile" : "My Profile"}</h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsProfileModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ padding: "24px" }}>
              {profileError && (
                <div className="alert alert-danger mb-4">
                  <span>{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div
                  className="alert alert-warning mb-4"
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    borderColor: "rgba(16, 185, 129, 0.4)",
                    color: "#6ee7b7",
                  }}
                >
                  <span>{profileSuccess}</span>
                </div>
              )}

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile}>
                  <div className="form-group mb-4">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        backgroundColor: "var(--bg-dark)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        color: "var(--text-main)",
                      }}
                    />
                  </div>
                  <div className="form-group mb-4">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        backgroundColor: "var(--bg-dark)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        color: "var(--text-main)",
                      }}
                    />
                  </div>
                  <div
                    className="action-buttons-group"
                    style={{ marginTop: "20px" }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsEditingProfile(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <div
                      className="mini-avatar avatar-blue"
                      style={{
                        width: "64px",
                        height: "64px",
                        fontSize: "1.8rem",
                        margin: "0 auto 12px auto",
                      }}
                    >
                      {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                    </div>
                    <h3 style={{ marginBottom: "2px", fontSize: "1.25rem" }}>
                      {user?.name || "Super Admin"}
                    </h3>
                    <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                      {user?.phone || "N/A"}
                    </p>
                  </div>

                  <div className="info-list" style={{ textAlign: "left" }}>
                    <div className="info-row">
                      <span className="info-label">Account Role:</span>
                      <span className="info-val font-semibold text-primary">
                        {user?.role === "super_admin"
                          ? "Super Admin (System Owner)"
                          : "Admin"}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Phone Number:</span>
                      <span className="info-val">{user?.phone || "N/A"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Verification Status:</span>
                      <span className="info-val text-success">
                        Verified Active
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Assigned Society:</span>
                      <span className="info-val">
                        {typeof user?.society === "object"
                          ? user?.society?.name
                          : user?.society || "All System Societies"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!isEditingProfile && (
              <div className="modal-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Edit Profile</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  Close Profile
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="main-wrapper">
        {/* Mobile Backdrop overlay */}
        {isMobileMenuOpen && (
          <div className="sidebar-backdrop" onClick={closeMobileMenu}></div>
        )}

        {/* Sidebar Navigation */}
        <aside className={`sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-section-title">MAIN NAVIGATION</div>
          <nav className="nav-menu">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Dashboard</span>
            </NavLink>

            {user?.role === "super_admin" && (
              <NavLink
                to="/societies"
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                onClick={closeMobileMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Societies</span>
              </NavLink>
            )}

            <NavLink
              to="/residents"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Residents</span>
            </NavLink>

            <NavLink
              to="/guards"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Security Guards</span>
            </NavLink>

            <NavLink
              to="/visitors"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              <span>Visitors</span>
            </NavLink>

            <NavLink
              to="/services"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <span>Local Services</span>
            </NavLink>

            {user?.role === "super_admin" && (
              <NavLink
                to="/plans"
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                onClick={closeMobileMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <span>Plans</span>
              </NavLink>
            )}

            <NavLink
              to="/alerts"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Emergency Alerts</span>
            </NavLink>

            <NavLink
              to="/news"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
              </svg>
              <span>Community News</span>
            </NavLink>

            {(user?.role === "super_admin" || user?.role === "admin") && (
              <NavLink
                to="/admins"
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                onClick={closeMobileMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <polyline points="16 11 18 13 22 9" />
                </svg>
                <span>Admins</span>
              </NavLink>
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="system-status-indicator">
              <span className="online-dot"></span>
              <span className="status-label">System Active</span>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
