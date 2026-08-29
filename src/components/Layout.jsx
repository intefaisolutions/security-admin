import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateAdmin, updateProfilePhoto, getResidents, getGuards, getVisitors, getAdmins } from "../api/admin";
import { getErrorMessage } from "../utils/getErrorMessage";
import NotificationPopup from "./NotificationPopup";
import { useDebounce } from "../hooks/useDebounce";
import LoadingSpinner from "./LoadingSpinner";
import { useEffect, useRef } from "react";

const Layout = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Account menu state
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchDropdownRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setSearchResults(null);
        setIsSearchExpanded(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSearchResults(null);
        setIsSearchExpanded(false);
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const performSearch = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setSearchResults(null);
        return;
      }
      setIsSearching(true);
      const results = {};
      try {
        const navItems = [
          { label: "Dashboard", path: "/dashboard", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
          { label: "Admins", path: "/admins", roles: ["super_admin", "super_sub_admin"], icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg> },
          { label: "Residents", path: "/residents", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
          { label: "Family Members", path: "/family-members", roles: ["super_admin"], icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
          { label: "Emergency Alerts", path: "/alerts", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
          { label: "Security Guards", path: "/guards", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
          { label: "Visitors", path: "/visitors", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> },
          { label: "Community News", path: "/news", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" /></svg> },
          { label: "Local Services", path: "/services", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> },
          { label: "Societies", path: "/societies", roles: ["super_admin", "admin"], icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
          { label: "Plans", path: "/plans", roles: ["super_admin", "admin"], icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
          { label: "Wallets", path: "/wallets", roles: ["super_admin"], icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></svg> },
          { label: "Profile", action: "PROFILE", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
          { label: "Settings", path: "/settings", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
          { label: "Logout", action: "LOGOUT", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> },
        ];
        
        const matchedNavItems = navItems.filter(item => 
          (!item.roles || item.roles.includes(user?.role)) && 
          item.label.toLowerCase().includes(debouncedSearch.toLowerCase())
        );

        if (matchedNavItems.length > 0) {
          results["Pages & Actions"] = matchedNavItems;
        }

        const promises = [];
        promises.push(
          getResidents({ search: debouncedSearch, limit: 5 }, { signal })
            .then(res => { if(res?.length) results.Residents = res; })
            .catch((err) => { if (err?.name !== 'CanceledError') console.error(err); })
        );
        promises.push(
          getGuards({ search: debouncedSearch, limit: 5 }, { signal })
            .then(res => { if(res?.length) results.Guards = res; })
            .catch((err) => { if (err?.name !== 'CanceledError') console.error(err); })
        );
        promises.push(
          getVisitors({ search: debouncedSearch, limit: 5 }, { signal })
            .then(res => { if(res?.length) results.Visitors = res; })
            .catch((err) => { if (err?.name !== 'CanceledError') console.error(err); })
        );
        
        if (user?.role === "super_admin") {
          promises.push(
            getAdmins({ search: debouncedSearch, limit: 5 }, { signal })
              .then(res => { if(res?.length) results.Admins = res; })
              .catch((err) => { if (err?.name !== 'CanceledError') console.error(err); })
          );
        }
        await Promise.allSettled(promises);
        if (!signal.aborted) {
          setSearchResults(results);
        }
      } catch (err) {
        if (!signal.aborted) console.error("Search error", err);
      } finally {
        if (!signal.aborted) setIsSearching(false);
      }
    };
    performSearch();
    return () => { abortController.abort(); };
  }, [debouncedSearch, user?.role]);

  const handleSearchResultClick = (path, term) => {
    setSearchResults(null);
    setSearchQuery("");
    setIsSearchExpanded(false);
    navigate(`${path}?search=${encodeURIComponent(term)}`);
  };

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setProfileError(null);

    try {
      const result = await updateProfilePhoto(file);
      if (result && result.photoUrl) {
        updateUser({ photoUrl: result.photoUrl });
        setProfileSuccess("Profile photo updated successfully!");
      }
    } catch (err) {
      setProfileError(getErrorMessage(err, "Failed to upload photo."));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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
              <span className="brand-title">Societie Security</span>
              <span className="brand-subtitle">
                {user?.role === "super_admin"
                  ? "Super Admin Portal"
                  : "Admin Portal"}
              </span>
            </div>
          </div>
        </div>

        <div className="topbar-center" style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 20px" }}>
          <div 
            ref={searchDropdownRef}
            className={`search-box ${isSearchExpanded ? 'expanded' : ''}`}
            style={{ 
              maxWidth: "400px", 
              width: "100%", 
              position: "relative",
              margin: 0
            }}
          >
            <svg
              className="search-icon"
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
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Global Search (Residents, Guards, Visitors...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%" }}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
              >
                &times;
              </button>
            )}

            {/* Dropdown Results */}
            {searchQuery.length >= 2 && (
              <div 
                className="search-dropdown card"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  maxHeight: "400px",
                  overflowY: "auto",
                  zIndex: 9999,
                  padding: "8px 0",
                  backgroundColor: "var(--bg-card)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)"
                }}
              >
                {isSearching ? (
                  <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
                    <LoadingSpinner size="sm" />
                  </div>
                ) : searchResults && Object.keys(searchResults).length > 0 ? (
                  Object.entries(searchResults).map(([type, items]) => (
                    <div key={type} style={{ paddingBottom: "8px", borderBottom: "1px solid var(--border-color)", marginBottom: "8px" }}>
                      <div style={{ padding: "4px 16px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {type}
                      </div>
                      {type === "Pages & Actions" ? items.map((item, idx) => (
                        <div 
                          key={`nav-${idx}`}
                          onClick={() => {
                            setSearchResults(null);
                            setSearchQuery("");
                            setIsSearchExpanded(false);
                            if (item.action === "PROFILE") {
                              handleOpenProfileModal();
                            } else if (item.action === "LOGOUT") {
                              handleLogout();
                            } else if (item.path) {
                              navigate(item.path);
                            }
                          }}
                          style={{
                            padding: "8px 16px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-dark)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ color: "var(--text-muted)", display: "flex" }}>{item.icon}</span>
                          <span style={{ fontWeight: 500, color: "var(--text-main)" }}>{item.label}</span>
                        </div>
                      )) : items.map(item => (
                        <div 
                          key={item._id || item.id}
                          onClick={() => handleSearchResultClick(`/${type.toLowerCase()}`, item.name || item.fullName || item.employeeId)}
                          style={{
                            padding: "8px 16px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-dark)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ fontWeight: 500, color: "var(--text-main)" }}>{item.name || item.fullName || `Visitor ${item._id.substring(item._id.length - 4)}`}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {item.phone || item.mobile || item.employeeId || item.flatNumber || "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : searchResults ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    No results found for "{searchQuery}"
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="topbar-right">
          {window.innerWidth <= 768 && !isSearchExpanded && (
            <button 
              className="mobile-toggle-btn"
              onClick={() => setIsSearchExpanded(true)}
              style={{ marginRight: "12px" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          )}
          <div 
            className="user-profile-summary" 
            ref={accountMenuRef}
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', position: 'relative' }}
          >
            <div className="avatar-circle">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                user?.name ? user.name.charAt(0).toUpperCase() : "A"
              )}
            </div>
            <div className="user-details" style={{ display: 'none', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.2' }}>{user?.name || "Super Admin"}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>
                {user?.role === "super_admin" ? "Super Admin" : "Admin"}
              </span>
            </div>
            <svg className="chevron-icon" style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <style>{`
              @media (min-width: 768px) {
                .user-profile-summary .user-details,
                .user-profile-summary .chevron-icon {
                  display: flex !important;
                }
              }
            `}</style>

            {isAccountMenuOpen && (
              <div 
                className="search-dropdown card"
                style={{
                  position: "absolute",
                  top: "calc(100% + 12px)",
                  right: 0,
                  minWidth: "220px",
                  zIndex: 9999,
                  padding: "8px 0",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "default",
                  backgroundColor: "var(--bg-card)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: "8px 16px", marginBottom: "4px" }}>
                  <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{user?.name || "Super Admin"}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{user?.role === "super_admin" ? "Super Admin" : "Admin"}</div>
                </div>
                <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "4px 0" }}></div>
                
                <div 
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    handleOpenProfileModal();
                  }}
                  style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", color: "var(--text-main)", transition: "background-color 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-dark)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  Profile
                </div>
                
                <div 
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    closeMobileMenu();
                    navigate("/settings");
                  }}
                  style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", color: "var(--text-main)", transition: "background-color 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-dark)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  Settings
                </div>
                
                <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "4px 0" }}></div>
                
                <div 
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    handleLogout();
                  }}
                  style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", color: "var(--error-color, #ef4444)", transition: "background-color 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  Logout
                </div>
              </div>
            )}
          </div>
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
                  <div style={{ textAlign: "center", marginBottom: "20px", position: "relative" }}>
                    <div
                      className="mini-avatar avatar-blue"
                      style={{
                        width: "80px",
                        height: "80px",
                        fontSize: "2rem",
                        margin: "0 auto",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      {isUploadingPhoto ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'var(--bg-light)' }}>
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : user?.photoUrl ? (
                        <img src={user.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        user?.name ? user.name.charAt(0).toUpperCase() : "A"
                      )}
                      
                      <label style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        color: "white",
                        fontSize: "0.75rem",
                        padding: "4px 0",
                        cursor: "pointer",
                        margin: 0,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                      }}>
                        {isUploadingPhoto ? "..." : "Change"}
                        <input type="file" style={{ display: "none" }} accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                      </label>
                    </div>
                  </div>
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
                        position: "relative"
                      }}
                    >
                      {user?.photoUrl ? (
                        <img src={user.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        user?.name ? user.name.charAt(0).toUpperCase() : "A"
                      )}
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

            <div className="nav-section-label">Users & Access</div>

            {(["super_admin", "super_sub_admin"].includes(user?.role)) && (
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

            {user?.role === "super_admin" && (
              <NavLink
                to="/super-sub-admins"
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
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Super Sub Admins</span>
              </NavLink>
            )}

            {(["super_admin", "super_sub_admin", "admin"].includes(user?.role)) && (
              <NavLink
                to="/sub-admins"
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
                <span>Sub Admins</span>
              </NavLink>
            )}

            {(["super_admin", "super_sub_admin"].includes(user?.role)) && (
              <NavLink
                to="/society-secretaries"
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
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Secretaries</span>
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

            {user?.role === "super_admin" && (
              <NavLink
                to="/family-members"
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
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Family Members</span>
              </NavLink>
            )}

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

            <div className="nav-section-label">Daily Operations</div>

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

            <div className="nav-section-label">Structure</div>

            {(["super_admin","admin"].includes(user?.role)) && (
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

            <div className="nav-section-label">Billing</div>

            {(["super_admin","admin"].includes(user?.role)) && (
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

            {user?.role === "super_admin" && (
              <NavLink
                to="/wallets"
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
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                </svg>
                <span>Wallets</span>
              </NavLink>
            )}
          </nav>
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

