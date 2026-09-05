import api from "./axios";

const extractData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }
  return response?.data;
};


// ============================================================================
// RESIDENTS ENDPOINTS
// ============================================================================
export const getResidents = async (params = {}, options = {}) => extractData(await api.get("/admin/residents", { params, ...options }));
export const getResidentById = async (id) => extractData(await api.get(`/admin/residents/${id}`));
export const createResident = async (data) => extractData(await api.post("/admin/residents", data));
export const updateResident = async (id, data) => extractData(await api.put(`/admin/residents/${id}`, data));
export const deleteResident = async (id) => extractData(await api.delete(`/admin/residents/${id}`));

// ============================================================================
// GUARDS ENDPOINTS
// ============================================================================
export const getGuards = async (params = {}, options = {}) => extractData(await api.get("/admin/guards", { params, ...options }));
export const getGuardById = async (id) => extractData(await api.get(`/admin/guards/${id}`));
export const createGuard = async (data) => extractData(await api.post("/admin/guards", data));
export const updateGuard = async (id, data) => extractData(await api.put(`/admin/guards/${id}`, data));
export const deleteGuard = async (id) => extractData(await api.delete(`/admin/guards/${id}`));

// ============================================================================
// LOCAL SERVICES ENDPOINTS
// ============================================================================
export const getServices = async () => extractData(await api.get("/admin/services"));
export const getServiceById = async (id) => extractData(await api.get(`/admin/services/${id}`));
export const createServiceProvider = async (data) => extractData(await api.post("/admin/services", data));
export const updateService = async (id, data) => extractData(await api.put(`/admin/services/${id}`, data));
export const deleteService = async (id) => extractData(await api.delete(`/admin/services/${id}`));

// ============================================================================
// SOCIETIES ENDPOINTS (SUPER ADMIN ONLY)
// ============================================================================
export const getSocieties = async (params = {}, options = {}) => extractData(await api.get("/admin/societies", { params, ...options }));
export const createSociety = async (data) => extractData(await api.post("/admin/societies", data));
export const updateSociety = async (id, data) => extractData(await api.put(`/admin/societies/${id}`, data));
export const deleteSociety = async (id) => extractData(await api.delete(`/admin/societies/${id}`));

// ============================================================================
// ADMINS ENDPOINTS (SUPER ADMIN ONLY)
// ============================================================================
export const getAdmins = async (params = {}, options = {}) => extractData(await api.get("/admin/admins", { params, ...options }));
export const getAdminById = async (id) => extractData(await api.get(`/admin/admins/${id}`));
export const getAdminSocieties = async (id, params = {}) => extractData(await api.get(`/admin/admins/${id}/societies`, { params }));
export const createAdmin = async (data) => extractData(await api.post("/admin/admins", data));
export const createSubAdmin = async (data) => extractData(await api.post("/admin/sub-admins", data));
export const createSecretary = async (data) => extractData(await api.post("/admin/secretaries", data));
export const updateAdmin = async (id, data) => extractData(await api.put(`/admin/admins/${id}`, data));
export const resendAdminLicenseEmail = async (id) => extractData(await api.post(`/admin/admins/${id}/resend-license`));
export const updateAdminPlan = async (id, planId) => extractData(await api.put(`/admin/admins/${id}/plan`, { planId }));
export const deleteAdmin = async (id) => extractData(await api.delete(`/admin/admins/${id}`));

export const updateProfilePhoto = async (file) => {
  const formData = new FormData();
  formData.append("photo", file);
  return extractData(
    await api.put("/admin/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
};

// ============================================================================
// PLANS ENDPOINTS (SUPER ADMIN ONLY)
// ============================================================================
export const getPlans = async () => extractData(await api.get("/admin/plans"));
export const getPlanById = async (id) => extractData(await api.get(`/admin/plans/${id}`));
export const createPlan = async (data) => extractData(await api.post("/admin/plans", data));
export const updatePlan = async (id, data) => extractData(await api.put(`/admin/plans/${id}`, data));
export const deletePlan = async (id) => extractData(await api.delete(`/admin/plans/${id}`));
export const buyPlan = async (planId, billingCycle) => extractData(await api.post(`/admin/plans/${planId}/buy`, { billingCycle }));
export const getMySubscription = async () => extractData(await api.get('/admin/my-subscription'));

// ============================================================================
// EMERGENCY ALERTS ENDPOINTS
// ============================================================================
export const getAlerts = async () => extractData(await api.get("/admin/alerts"));
export const getAlertById = async (id) => extractData(await api.get(`/admin/alerts/${id}`));
export const createAlert = async (data) => extractData(await api.post("/admin/alerts", data));
export const deleteAlert = async (id) => extractData(await api.delete(`/admin/alerts/${id}`));

// ============================================================================
// VISITORS ENDPOINTS
// ============================================================================
export const getVisitors = async (params = {}, options = {}) => extractData(await api.get("/admin/visitors", { params, ...options }));
export const createVisitor = async (data) => extractData(await api.post("/admin/visitors", data));
export const updateVisitor = async (id, data) => extractData(await api.put(`/admin/visitors/${id}`, data));
export const deleteVisitor = async (id) => extractData(await api.delete(`/admin/visitors/${id}`));

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================
export const getDashboardStats = async () => extractData(await api.get("/admin/dashboard"));
export const updateRevenueGoal = async (revenueGoal) => extractData(await api.put("/admin/revenue/goal", { revenueGoal }));
export const getRevenueTransactions = async (params = {}, options = {}) => extractData(await api.get("/admin/revenue/transactions", { params, ...options }));
export const getRevenueStats = async () => extractData(await api.get("/admin/revenue/stats"));

// ============================================================================
// COMMUNITY NEWS ENDPOINTS
// ============================================================================
export const getNews = async () => extractData(await api.get("/admin/news"));
export const createNews = async (data) => extractData(await api.post("/admin/news", data));
export const updateNews = async (id, data) => extractData(await api.put(`/admin/news/${id}`, data));
export const deleteNews = async (id) => extractData(await api.delete(`/admin/news/${id}`));
// ============================================================================
// FAMILY MEMBERS ENDPOINTS
// ============================================================================
export const getFamilyMembers = async () => extractData(await api.get("/admin/family-members"));
export const getFamilyMembersForResident = async (residentId) => extractData(await api.get(`/admin/residents/${residentId}/family-members`));
export const createFamilyMember = async (data) => extractData(await api.post("/admin/family-members", data));
export const updateFamilyMember = async (id, data) => extractData(await api.put(`/admin/family-members/${id}`, data));
export const deleteFamilyMember = async (id) => extractData(await api.delete(`/admin/family-members/${id}`));

// ============================================================================
// WALLET ENDPOINTS
// ============================================================================
export const addAdminWalletFunds = async (id, amount) => extractData(await api.post(`/admin/admins/${id}/wallet/add`, { amount }));
export const deductAdminWalletFunds = async (id, amount) => extractData(await api.post(`/admin/admins/${id}/wallet/deduct`, { amount }));

export const createSuperSubAdmin = async (data) => extractData(await api.post("/admin/super-sub-admins", data));
export const updateSuperSubAdminStatus = async (id, status) => extractData(await api.patch(`/admin/super-sub-admins/${id}/status`, { status }));

