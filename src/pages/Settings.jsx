import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { updateAdmin, addAdminWalletFunds, deductAdminWalletFunds } from "../api/admin";
import { changePassword } from "../api/auth";
import { getErrorMessage } from "../utils/getErrorMessage";

const PREFERENCES_KEYS = {
  soundNotifications: "settings.soundNotifications",
  compactTables: "settings.compactTables",
  autoRefresh: "settings.autoRefresh",
};

const loadPreference = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
};

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "wallet", label: "Wallet" },
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
];

const THEME_OPTIONS = [
  {
    id: "dark",
    label: "Dark Mode",
    emoji: "🌙",
    desc: "Dark navy/indigo palette",
  },
  {
    id: "light",
    label: "Light Mode",
    emoji: "☀️",
    desc: "Clean white & light gray",
  },
  {
    id: "system",
    label: "System / Device Default",
    emoji: "🖥️",
    desc: "Auto-follows OS theme",
  },
];

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  // Tab state
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  // Preferences state
  const [soundNotifications, setSoundNotifications] = useState(() =>
    loadPreference(PREFERENCES_KEYS.soundNotifications, true),
  );
  const [compactTables, setCompactTables] = useState(() =>
    loadPreference(PREFERENCES_KEYS.compactTables, false),
  );
  const [autoRefresh, setAutoRefresh] = useState(() =>
    loadPreference(PREFERENCES_KEYS.autoRefresh, false),
  );

  // Wallet state
  const [walletAmount, setWalletAmount] = useState("");
  const [walletAction, setWalletAction] = useState("add"); // "add" or "deduct"
  const [isWalletProcessing, setIsWalletProcessing] = useState(false);
  const [walletError, setWalletError] = useState(null);
  const [walletSuccess, setWalletSuccess] = useState(null);

  useEffect(() => {
    setProfileName(user?.name || "");
    setProfilePhone(user?.phone || "");
  }, [user]);

  // Apply preference classes / behavior
  useEffect(() => {
    document.body.classList.toggle("pref-compact-tables", compactTables);
  }, [compactTables]);

  // Password strength scoring
  const getPasswordStrength = (value) => {
    if (!value) return { label: "", score: 0, color: "" };

    let score = 0;
    if (value.length >= 6) score += 1;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (score <= 2) return { label: "Weak", score, color: "var(--danger)" };
    if (score <= 3) return { label: "Fair", score, color: "var(--warning)" };
    if (score <= 4) return { label: "Good", score, color: "var(--info)" };
    return { label: "Strong", score, color: "var(--success)" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

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
    } catch (err) {
      setProfileError(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from your current password.",
      );
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password changed successfully!");
    } catch (err) {
      setPasswordError(
        getErrorMessage(
          err,
          "Failed to change password. Please check your current password.",
        ),
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const togglePreference = (key) => {
    const setterMap = {
      [PREFERENCES_KEYS.soundNotifications]: setSoundNotifications,
      [PREFERENCES_KEYS.compactTables]: setCompactTables,
      [PREFERENCES_KEYS.autoRefresh]: setAutoRefresh,
    };

    setterMap[key]((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // localStorage unavailable - ignore
      }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
  };

  const handleWalletTransaction = async (e) => {
    e.preventDefault();
    if (!walletAmount || isNaN(Number(walletAmount)) || Number(walletAmount) <= 0) {
      setWalletError("Please enter a valid amount.");
      return;
    }

    setWalletError(null);
    setWalletSuccess(null);
    setIsWalletProcessing(true);
    try {
      const amount = Number(walletAmount);
      const userId = user?._id || user?.id;
      
      if (walletAction === "add") {
        await addAdminWalletFunds(userId, amount);
      } else {
        await deductAdminWalletFunds(userId, amount);
      }
      
      // Update user context with new wallet balance
      const currentBalance = user?.wallet?.balance || 0;
      const newBalance = walletAction === "add" 
        ? currentBalance + amount 
        : currentBalance - amount;
      
      updateUser({
        ...user,
        wallet: {
          ...user.wallet,
          balance: newBalance
        }
      });
      
      setWalletSuccess(
        walletAction === "add" 
          ? `Successfully added ${amount} to your wallet!` 
          : `Successfully deducted ${amount} from your wallet!`
      );
      setWalletAmount("");
    } catch (err) {
      setWalletError(getErrorMessage(err, "Failed to process wallet transaction."));
    } finally {
      setIsWalletProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">
            Manage your profile, security, and application preferences
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Single centered panel showing only the active tab */}
      <div className="settings-panel">
        {activeTab === "profile" && (
          <div key="profile" className="settings-tab-content">
            <div className="card-box settings-card">
              <div className="card-box-header settings-card-header">
                <div className="settings-card-title">
                  <div className="settings-icon-badge icon-blue">
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
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <h3>Profile Settings</h3>
                    <p className="text-muted">
                      Update your account name and phone number
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="settings-form">
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
                      color: "var(--success)",
                    }}
                  >
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="form-group mb-4">
                  <label htmlFor="settingsName">Full Name</label>
                  <input
                    id="settingsName"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="settingsPhone">Phone Number</label>
                  <input
                    id="settingsPhone"
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    required
                  />
                </div>

                <div className="settings-form-footer">
                  <span className="text-muted settings-role-tag">
                    Role:{" "}
                    <span className="settings-role-badge">
                      {user?.role === "super_admin" ? "Super Admin" : "Admin"}
                    </span>
                  </span>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div key="wallet" className="settings-tab-content">
            <div className="card-box settings-card">
              <div className="card-box-header settings-card-header">
                <div className="settings-card-title">
                  <div className="settings-icon-badge icon-purple">
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
                  </div>
                  <div>
                    <h3>Wallet Management</h3>
                    <p className="text-muted">Manage your payment wallet balance</p>
                  </div>
                </div>
              </div>

              <div className="wallet-balance-card">
                <div className="wallet-balance-label">Current Balance</div>
                <div className="wallet-balance-amount">
                  {user?.wallet?.currency || "INR"}{" "}
                  {(user?.wallet?.balance || 0).toLocaleString()}
                </div>
              </div>

              <form onSubmit={handleWalletTransaction} className="settings-form">
                {walletError && (
                  <div className="alert alert-danger mb-4">
                    <span>{walletError}</span>
                  </div>
                )}
                {walletSuccess && (
                  <div
                    className="alert alert-warning mb-4"
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      borderColor: "rgba(16, 185, 129, 0.4)",
                      color: "var(--success)",
                    }}
                  >
                    <span>{walletSuccess}</span>
                  </div>
                )}

                <div className="form-group mb-4">
                  <label>Transaction Type</label>
                  <div className="wallet-action-buttons">
                    <button
                      type="button"
                      className={`wallet-action-btn ${walletAction === "add" ? "active" : ""}`}
                      onClick={() => setWalletAction("add")}
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
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add Funds
                    </button>
                    <button
                      type="button"
                      className={`wallet-action-btn ${walletAction === "deduct" ? "active" : ""}`}
                      onClick={() => setWalletAction("deduct")}
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
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Deduct Funds
                    </button>
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="walletAmount">
                    {walletAction === "add" ? "Amount to Add" : "Amount to Deduct"}
                  </label>
                  <input
                    id="walletAmount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    required
                    placeholder="Enter amount"
                  />
                </div>

                <div className="settings-form-footer">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isWalletProcessing}
                  >
                    {isWalletProcessing
                      ? "Processing..."
                      : walletAction === "add"
                        ? "Add Funds"
                        : "Deduct Funds"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div key="security" className="settings-tab-content">
            <div className="card-box settings-card">
              <div className="card-box-header settings-card-header">
                <div className="settings-card-title">
                  <div className="settings-icon-badge icon-emerald">
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
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <h3>Security</h3>
                    <p className="text-muted">Change your account password</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="settings-form">
                {passwordError && (
                  <div className="alert alert-danger mb-4">
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div
                    className="alert alert-warning mb-4"
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      borderColor: "rgba(16, 185, 129, 0.4)",
                      color: "var(--success)",
                    }}
                  >
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="form-group mb-4">
                  <label htmlFor="settingsCurrentPassword">
                    Current Password
                  </label>
                  <div className="input-with-icon">
                    <span className="input-icon">
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
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="settingsCurrentPassword"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={isSavingPassword}
                      required
                    />
                    <button
                      type="button"
                      className="input-password-toggle password-eye-btn" onClick={() => setShowPasswords(!showPasswords)}
                      tabIndex="-1"
                      aria-label={
                        showPasswords ? "Hide passwords" : "Show passwords"
                      }
                    >
                      {showPasswords ? (
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
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
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
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="settingsNewPassword">New Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon">
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
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                      </svg>
                    </span>
                    <input
                      id="settingsNewPassword"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Create new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSavingPassword}
                      required
                    />
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="settingsConfirmPassword">
                    Confirm New Password
                  </label>
                  <div className="input-with-icon">
                    <span className="input-icon">
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
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <input
                      id="settingsConfirmPassword"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSavingPassword}
                      required
                    />
                  </div>
                </div>

                {/* Password strength hint */}
                {newPassword && (
                  <div className="password-strength mb-4">
                    <div className="password-strength-bars">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <span
                          key={bar}
                          className="password-strength-bar"
                          style={{
                            backgroundColor:
                              bar <= passwordStrength.score
                                ? passwordStrength.color
                                : "var(--border-color)",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="password-strength-label"
                      style={{ color: passwordStrength.color }}
                    >
                      Password strength: {passwordStrength.label}
                    </span>
                  </div>
                )}

                <div className="settings-form-footer">
                  <span className="text-muted settings-role-tag">
                    Must be at least 6 characters
                  </span>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSavingPassword}
                  >
                    {isSavingPassword ? "Updating..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <div key="preferences" className="settings-tab-content">
            <div className="card-box settings-card">
              <div className="card-box-header settings-card-header">
                <div className="settings-card-title">
                  <div className="settings-icon-badge icon-purple">
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
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </div>
                  <div>
                    <h3>Preferences</h3>
                    <p className="text-muted">
                      Tune your application experience
                    </p>
                  </div>
                </div>
              </div>

              <div className="settings-pref-list">
                <div className="settings-pref-row">
                  <div className="settings-pref-info">
                    <span className="settings-pref-label">
                      Sound Notifications
                    </span>
                    <span className="settings-pref-desc">
                      Play a sound for real-time alerts
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundNotifications}
                    className={`toggle-switch ${soundNotifications ? "on" : ""}`}
                    onClick={() =>
                      togglePreference(PREFERENCES_KEYS.soundNotifications)
                    }
                  >
                    <span className="toggle-knob"></span>
                  </button>
                </div>

                <div className="settings-pref-row">
                  <div className="settings-pref-info">
                    <span className="settings-pref-label">Compact Tables</span>
                    <span className="settings-pref-desc">
                      Reduce row spacing on data tables
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={compactTables}
                    className={`toggle-switch ${compactTables ? "on" : ""}`}
                    onClick={() =>
                      togglePreference(PREFERENCES_KEYS.compactTables)
                    }
                  >
                    <span className="toggle-knob"></span>
                  </button>
                </div>

                <div className="settings-pref-row">
                  <div className="settings-pref-info">
                    <span className="settings-pref-label">Auto Refresh</span>
                    <span className="settings-pref-desc">
                      Periodically refresh dashboard data
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoRefresh}
                    className={`toggle-switch ${autoRefresh ? "on" : ""}`}
                    onClick={() =>
                      togglePreference(PREFERENCES_KEYS.autoRefresh)
                    }
                  >
                    <span className="toggle-knob"></span>
                  </button>
                </div>
              </div>

              {/* Theme selector */}
              <div className="settings-section">
                <h4 className="settings-section-title">Theme</h4>
                <p className="text-muted settings-section-desc">
                  Choose how the app looks. System follows your OS theme
                  automatically.
                </p>
                <div className="theme-selector-grid">
                  {THEME_OPTIONS.map((option) => {
                    const isActive = themeMode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`theme-option ${isActive ? "active" : ""}`}
                        onClick={() => setThemeMode(option.id)}
                        aria-pressed={isActive}
                      >
                        <span className="theme-option-emoji">
                          {option.emoji}
                        </span>
                        <span className="theme-option-label">
                          {option.label}
                        </span>
                        <span className="theme-option-desc">{option.desc}</span>
                        {isActive && (
                          <span className="theme-option-check">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-muted settings-resolved-theme">
                  Current appearance:{" "}
                  <strong style={{ color: "var(--text-main)" }}>
                    {resolvedTheme === "dark" ? "Dark" : "Light"}
                  </strong>
                </p>
              </div>

              <div className="settings-form-footer settings-logout-footer">
                <span className="text-muted settings-role-tag">
                  Signed in as <strong>{user?.name || "Admin"}</strong>
                </span>
                <button
                  className="btn btn-outline-danger"
                  onClick={handleLogout}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
