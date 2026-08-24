const safeLimit = (value) => {
  if (value === undefined || value === null || value === "") return Infinity;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : Infinity;
};

// Resolve the effective limits object from a plan document.
// Supports both flat limits (plan.maxSubAdmins) and nested limits (plan.limits.maxSubAdmins).
const resolveLimits = (plan) => {
  if (!plan || typeof plan !== "object") return {};
  return plan.limits && typeof plan.limits === "object"
    ? plan.limits
    : plan;
};

export const normalizePlanLimits = (user) => {
  const plan = user?.plan || {};
  const limits = resolveLimits(plan);
  return {
    planId: plan.planId || plan._id || plan.id || null,
    planName: plan.name || plan.planName || plan.title || "Standard",
    billingCycle: plan.billing || plan.billingCycle || plan.type || plan.period || "monthly",
    monthlyPrice:
      plan.monthlyPrice !== undefined && plan.monthlyPrice !== null
        ? Number(plan.monthlyPrice)
        : null,
    yearlyPrice:
      plan.yearlyPrice !== undefined && plan.yearlyPrice !== null
        ? Number(plan.yearlyPrice)
        : null,
    maxSubAdmins: safeLimit(
      limits.maxSubAdmins ??
        limits.subAdminLimit ??
        limits.maxSubAdmin ??
        limits.subAdminsAllowed,
    ),
    maxSocieties: safeLimit(
      limits.maxSocieties ??
        limits.societyLimit ??
        limits.maxSociety ??
        limits.societiesAllowed,
    ),
    maxGuards: safeLimit(
      limits.maxGuards ?? limits.guardLimit ?? limits.maxGuard ?? limits.guardsAllowed,
    ),
    maxServices: safeLimit(
      limits.maxServices ??
        limits.serviceLimit ??
        limits.maxService ??
        limits.servicesAllowed,
    ),
    maxResidents: safeLimit(
      limits.maxResidents ??
        limits.residentLimit ??
        limits.maxResident ??
        limits.residentsAllowed,
    ),
  };
};

export const formatPlanLabel = (plan) => {
  if (!plan) return "Plan";
  return `${plan.planName} (${plan.billingCycle})`;
};

// Build the plan/subscription payload to attach to an admin account.
// `selectedPlan` is a plan document (from getPlans), `billingCycle` is "monthly" | "yearly".
export const buildPlanPayload = (selectedPlan, billingCycle = "monthly") => {
  if (!selectedPlan) return null;

  const id = selectedPlan._id || selectedPlan.id;
  const limits = resolveLimits(selectedPlan);

  return {
    planId: id,
    name: selectedPlan.name || selectedPlan.planName || selectedPlan.title || "Standard",
    billingCycle,
    monthlyPrice: selectedPlan.monthlyPrice,
    yearlyPrice: selectedPlan.yearlyPrice,
    limits: {
      maxSubAdmins: limits.maxSubAdmins ?? limits.subAdminLimit ?? null,
      maxSocieties: limits.maxSocieties ?? limits.societyLimit ?? null,
      maxGuards: limits.maxGuards ?? limits.guardLimit ?? null,
      maxServices: limits.maxServices ?? limits.serviceLimit ?? null,
      maxResidents: limits.maxResidents ?? limits.residentLimit ?? null,
    },
  };
};
