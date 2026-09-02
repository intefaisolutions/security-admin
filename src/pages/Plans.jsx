import { useState, useEffect, useMemo } from "react";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getMySubscription,
  buyPlan,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import { getErrorMessage } from "../utils/getErrorMessage";

const LIMIT_FIELDS = [
  { key: "maxSubAdmins", label: "Sub-Admins" },
  { key: "maxSocieties", label: "Societies" },
  { key: "maxGuards", label: "Security Guards" },
  { key: "maxServices", label: "Local Services" },
  { key: "maxResidents", label: "Residents" },
];

const STATUS_OPTIONS = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const CYCLE_OPTIONS = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

const formatLimit = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const formatPrice = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

const priceDisplay = (val) => {
  if (val === null || val === undefined) return "N/A";
  return val >= 0 ? `$${val.toFixed(2)}` : "N/A";
};

// Extract limits from a plan document (supports both flat and nested `limits` shape)
const extractLimits = (plan) => {
  const limits = plan?.limits || plan || {};
  return {
    maxSubAdmins: limits.maxSubAdmins ?? limits.subAdminLimit ?? null,
    maxSocieties: limits.maxSocieties ?? limits.societyLimit ?? null,
    maxGuards: limits.maxGuards ?? limits.guardLimit ?? null,
    maxServices: limits.maxServices ?? limits.serviceLimit ?? null,
    maxResidents: limits.maxResidents ?? limits.residentLimit ?? null,
  };
};

const Plans = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [plans, setPlans] = useState([]);
  const [mySubscription, setMySubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Billing cycle toggle for pricing cards
  const [billingCycle, setBillingCycle] = useState("monthly");

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMonthlyPrice, setFormMonthlyPrice] = useState("");
  const [formYearlyPrice, setFormYearlyPrice] = useState("");
  const [formLimits, setFormLimits] = useState({
    maxSubAdmins: "",
    maxSocieties: "",
    maxGuards: "",
    maxServices: "",
    maxResidents: "",
  });
  const [formStatus, setFormStatus] = useState("active");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlansList = async () => {
    if (!isSuperAdmin && user?.role !== "admin") return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load plans:", err);
      setError(getErrorMessage(err, "Failed to load subscription plans."));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMySubscription = async () => {
    if (isSuperAdmin) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMySubscription();
      setMySubscription(data);
    } catch (err) {
      console.error("Failed to load subscription:", err);
      setError(getErrorMessage(err, "Failed to load your subscription."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPlansList();
    } else if (user?.role === "admin") {
      fetchMySubscription();
      fetchPlansList(); // Also fetch plans for upgrade options
    }
  }, [isSuperAdmin, user?.role]);

  // Client-side search filter
  const filteredPlans = useMemo(() => {
    if (!debouncedSearch.trim()) return plans;
    const term = debouncedSearch.toLowerCase().trim();
    return plans.filter((plan) => {
      const name = plan.name || plan.planName || plan.title || "";
      const desc = plan.description || "";
      return (
        name.toLowerCase().includes(term) || desc.toLowerCase().includes(term)
      );
    });
  }, [plans, debouncedSearch]);

  // Determine which active plan should be the "featured" (highest monthly price)
  const featuredPlanId = useMemo(() => {
    const activePlans = filteredPlans.filter(
      (p) => (p.status || "active") !== "inactive",
    );
    if (activePlans.length === 0) return null;
    const withPrice = activePlans.map((p) => ({
      id: p._id || p.id,
      price: Math.max(
        formatPrice(p.monthlyPrice) ?? 0,
        formatPrice(p.yearlyPrice) ?? 0,
      ),
    }));
    const [top] = [...withPrice].sort((a, b) => b.price - a.price);
    return top?.id ?? null;
  }, [filteredPlans]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormName("");
    setFormDescription("");
    setFormMonthlyPrice("");
    setFormYearlyPrice("");
    setFormLimits({
      maxSubAdmins: "",
      maxSocieties: "",
      maxGuards: "",
      maxServices: "",
      maxResidents: "",
    });
    setFormStatus("active");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormName(plan.name || plan.planName || plan.title || "");
    setFormDescription(plan.description || "");
    setFormMonthlyPrice(
      plan.monthlyPrice !== undefined && plan.monthlyPrice !== null
        ? String(plan.monthlyPrice)
        : "",
    );
    setFormYearlyPrice(
      plan.yearlyPrice !== undefined && plan.yearlyPrice !== null
        ? String(plan.yearlyPrice)
        : "",
    );
    const limits = extractLimits(plan);
    setFormLimits({
      maxSubAdmins:
        limits.maxSubAdmins !== null ? String(limits.maxSubAdmins) : "",
      maxSocieties:
        limits.maxSocieties !== null ? String(limits.maxSocieties) : "",
      maxGuards: limits.maxGuards !== null ? String(limits.maxGuards) : "",
      maxServices:
        limits.maxServices !== null ? String(limits.maxServices) : "",
      maxResidents:
        limits.maxResidents !== null ? String(limits.maxResidents) : "",
    });
    setFormStatus(plan.status || "active");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleLimitChange = (key, value) => {
    setFormLimits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Plan name is required.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const buildLimits = () => {
        const limits = {};
        for (const field of LIMIT_FIELDS) {
          const raw = formLimits[field.key];
          if (raw !== "" && raw !== null && raw !== undefined) {
            limits[field.key] = Number(raw);
          }
        }
        return limits;
      };

      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        monthlyPrice:
          formMonthlyPrice !== "" ? Number(formMonthlyPrice) : undefined,
        yearlyPrice:
          formYearlyPrice !== "" ? Number(formYearlyPrice) : undefined,
        limits: buildLimits(),
        status: formStatus,
      };

      if (editingPlan) {
        await updatePlan(editingPlan._id || editingPlan.id, payload);
      } else {
        await createPlan(payload);
      }

      setIsModalOpen(false);
      await fetchPlansList();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editingPlan ? "Failed to update plan." : "Failed to create plan.",
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
      await deletePlan(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      await fetchPlansList();
    } catch (err) {
      console.error("Failed to delete plan:", err);
      alert(getErrorMessage(err, "Failed to delete plan."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBuyPlan = async (planId, cycle) => {
    try {
      await buyPlan(planId, cycle);
      await fetchMySubscription();
      alert("Plan purchased successfully!");
    } catch (err) {
      console.error("Failed to buy plan:", err);
      alert(getErrorMessage(err, "Failed to purchase plan."));
    }
  };

  if (!isSuperAdmin && user?.role !== "admin") {
    return (
      <div className="page-container">
        <div className="card-box empty-state-box">
          <h3>Access Restricted</h3>
          <p className="text-muted">
            Admin or Super Admin privileges are required to view subscription
            plans.
          </p>
        </div>
      </div>
    );
  }

  // Admin view: Show their subscription and available plans for upgrade
  if (!isSuperAdmin && user?.role === "admin") {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Subscription</h1>
            <p className="page-description">
              View your current plan and upgrade options
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger my-4">
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="card-box flex-center p-8">
            <LoadingSpinner text="Loading subscription..." />
          </div>
        ) : mySubscription ? (
          <div className="card-box" style={{ marginBottom: "24px" }}>
            <h3>Current Plan</h3>
            <div style={{ marginTop: "16px" }}>
              <p>
                <strong>Plan:</strong>{" "}
                {mySubscription.plan?.name || mySubscription.planName || "N/A"}
              </p>
              <p>
                <strong>Billing Cycle:</strong>{" "}
                {mySubscription.billingCycle || "N/A"}
              </p>
              <p>
                <strong>Status:</strong> {mySubscription.status || "Active"}
              </p>
              {mySubscription.plan?.limits && (
                <div style={{ marginTop: "12px" }}>
                  <strong>Limits:</strong>
                  <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                    {LIMIT_FIELDS.map((field) => {
                      const value = mySubscription.plan.limits[field.key];
                      const isUnlimited = value === null || value === undefined;
                      return (
                        <li key={field.key}>
                          {field.label}: {isUnlimited ? "Unlimited" : value}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="card-box empty-state-box"
            style={{ marginBottom: "24px" }}
          >
            <h3>No Active Subscription</h3>
            <p className="text-muted">
              You don't have an active subscription. Choose a plan below to get
              started.
            </p>
          </div>
        )}

        <div
          className="pricing-billing-toggle"
          role="tablist"
          aria-label="Billing cycle"
          style={{ marginBottom: "16px" }}
        >
          {CYCLE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={billingCycle === option.key}
              className={`billing-toggle-btn ${
                billingCycle === option.key ? "active" : ""
              }`}
              onClick={() => setBillingCycle(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <h3 style={{ marginBottom: "16px" }}>Available Plans</h3>
        <div className="pricing-grid">
          {filteredPlans.map((plan) => {
            const id = plan._id || plan.id;
            const name = plan.name || plan.planName || plan.title || "Plan";
            const description = plan.description || "";
            const limits = extractLimits(plan);
            const isActive = (plan.status || "active") !== "inactive";
            const isCurrentPlan =
              mySubscription?.plan?._id === id || mySubscription?.planId === id;

            const monthly = formatPrice(plan.monthlyPrice);
            const yearly = formatPrice(plan.yearlyPrice);
            const quarterly = monthly !== null ? monthly * 3 : null;
            const currentPrice =
              billingCycle === "yearly"
                ? yearly
                : billingCycle === "quarterly"
                  ? quarterly
                  : monthly;
            const alternatePrice =
              billingCycle === "yearly"
                ? monthly
                : billingCycle === "quarterly"
                  ? monthly
                  : yearly;
            const currentPeriod =
              billingCycle === "yearly"
                ? "/ year"
                : billingCycle === "quarterly"
                  ? "/ quarter"
                  : "/ month";
            const alternatePeriod =
              billingCycle === "yearly"
                ? "mo"
                : billingCycle === "quarterly"
                  ? "mo"
                  : "yr";

            return (
              <div
                key={id}
                className={`pricing-card ${isActive ? "" : "is-inactive"} ${isCurrentPlan ? "current-plan" : ""}`}
              >
                {isCurrentPlan && (
                  <div className="pricing-ribbon">
                    <span>Current Plan</span>
                  </div>
                )}

                <div className="pricing-card-top">
                  <div className="pricing-plan-icon">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="pricing-plan-title">
                    <h3 className="pricing-plan-name">{name}</h3>
                    {!isActive && <StatusBadge status="inactive" />}
                  </div>
                </div>

                {description && (
                  <p className="pricing-plan-desc">{description}</p>
                )}

                <div className="pricing-price-block">
                  <div className="pricing-amount">
                    {priceDisplay(currentPrice)}
                  </div>
                  <div className="pricing-period">{currentPeriod}</div>
                </div>

                {currentPrice !== null &&
                  alternatePrice !== null &&
                  alternatePrice > 0 && (
                    <div className="pricing-alt-price">
                      or {priceDisplay(alternatePrice)}
                      {alternatePeriod} billed{" "}
                      {billingCycle === "yearly"
                        ? "monthly"
                        : billingCycle === "quarterly"
                          ? "monthly"
                          : "yearly"}
                    </div>
                  )}

                <div className="pricing-features">
                  {LIMIT_FIELDS.map((field) => {
                    const value = formatLimit(limits[field.key]);
                    const isUnlimited = value === null;
                    return (
                      <div className="feature-item" key={field.key}>
                        <span
                          className={`feature-check ${
                            isUnlimited ? "unlimited" : ""
                          }`}
                        >
                          {isUnlimited ? (
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
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span className="feature-label">{field.label}</span>
                        <span className="feature-value">
                          {isUnlimited ? "Unlimited" : value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pricing-card-footer">
                  {isCurrentPlan ? (
                    <button className="btn btn-secondary" disabled>
                      Current Plan
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleBuyPlan(id, billingCycle)}
                    >
                      Subscribe
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Super Admin view: Full plan management interface
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Plans</h1>
          <p className="page-description">
            Pricing cards for monthly / yearly plans with feature limits
          </p>
        </div>
        <div className="action-buttons-group">
          <button
            className="btn btn-secondary"
            onClick={fetchPlansList}
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
            <span>Add Plan</span>
          </button>
        </div>
      </div>

      <div className="table-controls-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search plans by name or description..."
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

        {/* Billing cycle toggle */}
        <div
          className="pricing-billing-toggle"
          role="tablist"
          aria-label="Billing cycle"
        >
          {CYCLE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={billingCycle === option.key}
              className={`billing-toggle-btn ${
                billingCycle === option.key ? "active" : ""
              }`}
              onClick={() => setBillingCycle(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger my-4">
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card-box flex-center p-8">
          <LoadingSpinner text="Loading subscription plans..." />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="card-box empty-state-box">
          <h3>No Plans Found</h3>
          <p className="text-muted">
            {searchTerm
              ? "No plans matched your search filters."
              : "There are currently no subscription plans. Create your first plan to get started."}
          </p>
        </div>
      ) : (
        <div className="pricing-grid">
          {filteredPlans.map((plan) => {
            const id = plan._id || plan.id;
            const name = plan.name || plan.planName || plan.title || "Plan";
            const description = plan.description || "";
            const limits = extractLimits(plan);
            const isActive = (plan.status || "active") !== "inactive";
            const isFeatured = isActive && id === featuredPlanId;

            const monthly = formatPrice(plan.monthlyPrice);
            const yearly = formatPrice(plan.yearlyPrice);
            const quarterly = monthly !== null ? monthly * 3 : null;

            // Current cycle price + the alternate cycle for the "or" note
            const currentPrice =
              billingCycle === "yearly"
                ? yearly
                : billingCycle === "quarterly"
                  ? quarterly
                  : monthly;
            const alternatePrice =
              billingCycle === "yearly"
                ? monthly
                : billingCycle === "quarterly"
                  ? monthly
                  : yearly;
            const currentPeriod =
              billingCycle === "yearly"
                ? "/ year"
                : billingCycle === "quarterly"
                  ? "/ quarter"
                  : "/ month";
            const alternatePeriod =
              billingCycle === "yearly"
                ? "mo"
                : billingCycle === "quarterly"
                  ? "mo"
                  : "yr";

            return (
              <div
                key={id}
                className={`pricing-card ${isFeatured ? "featured" : ""} ${
                  isActive ? "" : "is-inactive"
                }`}
              >
                {isFeatured && (
                  <div className="pricing-ribbon">
                    <span>Most Popular</span>
                  </div>
                )}

                <div className="pricing-card-top">
                  <div className="pricing-plan-icon">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="pricing-plan-title">
                    <h3 className="pricing-plan-name">{name}</h3>
                    {!isActive && <StatusBadge status="inactive" />}
                  </div>
                </div>

                {description && (
                  <p className="pricing-plan-desc">{description}</p>
                )}

                <div className="pricing-price-block">
                  <div className="pricing-amount">
                    {priceDisplay(currentPrice)}
                  </div>
                  <div className="pricing-period">{currentPeriod}</div>
                </div>

                {currentPrice !== null &&
                  alternatePrice !== null &&
                  alternatePrice > 0 && (
                    <div className="pricing-alt-price">
                      or {priceDisplay(alternatePrice)}
                      {alternatePeriod} billed{" "}
                      {billingCycle === "yearly"
                        ? "monthly"
                        : billingCycle === "quarterly"
                          ? "monthly"
                          : "yearly"}
                    </div>
                  )}

                <div className="pricing-features">
                  {LIMIT_FIELDS.map((field) => {
                    const value = formatLimit(limits[field.key]);
                    const isUnlimited = value === null;
                    return (
                      <div className="feature-item" key={field.key}>
                        <span
                          className={`feature-check ${
                            isUnlimited ? "unlimited" : ""
                          }`}
                        >
                          {isUnlimited ? (
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
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span className="feature-label">{field.label}</span>
                        <span className="feature-value">
                          {isUnlimited ? "Unlimited" : value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pricing-card-footer">
                  <StatusBadge status={isActive ? "active" : "inactive"} />
                  <div className="action-buttons-group">
                    <button
                      className="icon-action-btn icon-action-btn-edit"
                      onClick={() => handleOpenEdit(plan)}
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
                      onClick={() => setDeleteTarget(plan)}
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px" }}
          >
            <div className="modal-header">
              <h3>{editingPlan ? "Edit Plan" : "Create New Plan"}</h3>
              <button
                className="icon-btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePlan}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger mb-4">
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group mb-4">
                  <label htmlFor="planName">Plan Name</label>
                  <input
                    id="planName"
                    type="text"
                    placeholder="e.g. Basic, Pro, Enterprise"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="planDescription">Description</label>
                  <textarea
                    id="planDescription"
                    rows={2}
                    placeholder="Short description of this plan"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="dashboard-content-grid" style={{ gap: "12px" }}>
                  <div className="form-group">
                    <label htmlFor="planMonthlyPrice">Monthly Price ($)</label>
                    <input
                      id="planMonthlyPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 49.99"
                      value={formMonthlyPrice}
                      onChange={(e) => setFormMonthlyPrice(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="planYearlyPrice">Yearly Price ($)</label>
                    <input
                      id="planYearlyPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 499.99"
                      value={formYearlyPrice}
                      onChange={(e) => setFormYearlyPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label>Resource Limits</label>
                  <p
                    className="text-muted"
                    style={{
                      fontSize: "0.85rem",
                      marginTop: "0",
                      marginBottom: "10px",
                    }}
                  >
                    Leave blank for unlimited. These limits apply to each admin
                    subscribed to this plan.
                  </p>
                  <div
                    className="permissions-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {LIMIT_FIELDS.map((field) => (
                      <div className="form-group" key={field.key}>
                        <label style={{ fontSize: "0.8rem" }}>
                          {field.label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Unlimited"
                          value={formLimits[field.key]}
                          onChange={(e) =>
                            handleLimitChange(field.key, e.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="planStatus">Status</label>
                  <select
                    id="planStatus"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "var(--bg-dark)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                    }}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                    ? editingPlan
                      ? "Updating..."
                      : "Creating..."
                    : editingPlan
                      ? "Update Plan"
                      : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Plan"
        message={`Are you sure you want to delete plan "${deleteTarget?.name || deleteTarget?.planName || "this plan"}"?`}
        confirmText="Delete Plan"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Plans;
