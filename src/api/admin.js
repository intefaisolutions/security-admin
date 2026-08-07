import api from "./axios";

/**
 * Utility helper to unwrap standard backend API payload:
 * { statusCode: 200, data: <array or object>, message: "string", success: true }
 */
const extractData = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }
  return response?.data;
};

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

/**
 * Fetch overview dashboard metrics
 * GET /api/admin/dashboard
 */
export const getDashboardStats = async () => {
  const response = await api.get("/admin/dashboard");
  return extractData(response);
};

// ============================================================================
// RESIDENTS ENDPOINTS
// ============================================================================

/**
 * Fetch all registered residents
 * GET /api/admin/residents
 */
export const getResidents = async () => {
  const response = await api.get("/admin/residents");
  return extractData(response);
};

/**
 * Fetch single resident details by ID
 * GET /api/admin/residents/:id
 */
export const getResidentById = async (id) => {
  const response = await api.get(`/admin/residents/${id}`);
  return extractData(response);
};

/**
 * Create a new resident record
 * POST /api/admin/residents
 */
export const createResident = async (data) => {
  const response = await api.post("/admin/residents", data);
  return extractData(response);
};

/**
 * Update existing resident record
 * PUT /api/admin/residents/:id
 */
export const updateResident = async (id, data) => {
  const response = await api.put(`/admin/residents/${id}`, data);
  return extractData(response);
};

/**
 * Delete resident by ID
 * DELETE /api/admin/residents/:id
 */
export const deleteResident = async (id) => {
  const response = await api.delete(`/admin/residents/${id}`);
  return extractData(response);
};

// ============================================================================
// SECURITY GUARDS ENDPOINTS
// ============================================================================

/**
 * Fetch all security guards
 * GET /api/admin/guards
 */
export const getGuards = async () => {
  const response = await api.get("/admin/guards");
  return extractData(response);
};

/**
 * Fetch single security guard details by ID
 * GET /api/admin/guards/:id
 */
export const getGuardById = async (id) => {
  const response = await api.get(`/admin/guards/${id}`);
  return extractData(response);
};

/**
 * Create a new security guard record
 * POST /api/admin/guards
 */
export const createGuard = async (data) => {
  const response = await api.post("/admin/guards", data);
  return extractData(response);
};

/**
 * Update existing security guard record
 * PUT /api/admin/guards/:id
 */
export const updateGuard = async (id, data) => {
  const response = await api.put(`/admin/guards/${id}`, data);
  return extractData(response);
};

/**
 * Delete security guard by ID
 * DELETE /api/admin/guards/:id
 */
export const deleteGuard = async (id) => {
  const response = await api.delete(`/admin/guards/${id}`);
  return extractData(response);
};

// ============================================================================
// LOCAL SERVICES ENDPOINTS
// ============================================================================

/**
 * Fetch all local service providers
 * GET /api/admin/services
 */
export const getServices = async () => {
  const response = await api.get("/admin/services");
  return extractData(response);
};

/**
 * Fetch single local service details by ID
 * GET /api/admin/services/:id
 */
export const getServiceById = async (id) => {
  const response = await api.get(`/admin/services/${id}`);
  return extractData(response);
};

/**
 * Create a new local service provider record
 * POST /api/admin/services
 */
export const createServiceProvider = async (data) => {
  const response = await api.post("/admin/services", data);
  return extractData(response);
};

/**
 * Update existing local service provider record
 * PUT /api/admin/services/:id
 */
export const updateService = async (id, data) => {
  const response = await api.put(`/admin/services/${id}`, data);
  return extractData(response);
};

/**
 * Delete local service provider by ID
 * DELETE /api/admin/services/:id
 */
export const deleteService = async (id) => {
  const response = await api.delete(`/admin/services/${id}`);
  return extractData(response);
};

// ============================================================================
// SOCIETIES ENDPOINTS (SUPER ADMIN ONLY)
// ============================================================================

/**
 * Fetch all registered societies
 * GET /api/admin/societies
 */
export const getSocieties = async () => {
  const response = await api.get("/admin/societies");
  return extractData(response);
};

/**
 * Create a new society
 * POST /api/admin/societies
 */
export const createSociety = async (data) => {
  const response = await api.post("/admin/societies", data);
  return extractData(response);
};

/**
 * Update an existing society
 * PUT /api/admin/societies/:id
 */
export const updateSociety = async (id, data) => {
  const response = await api.put(`/admin/societies/${id}`, data);
  return extractData(response);
};

/**
 * Delete a society by ID
 * DELETE /api/admin/societies/:id
 */
export const deleteSociety = async (id) => {
  const response = await api.delete(`/admin/societies/${id}`);
  return extractData(response);
};

// ============================================================================
// ADMINS ENDPOINTS (SUPER ADMIN ONLY)
// ============================================================================

/**
 * Fetch all admin accounts
 * GET /api/admin/admins
 */
export const getAdmins = async () => {
  const response = await api.get("/admin/admins");
  return extractData(response);
};

/**
 * Fetch single admin details by ID
 * GET /api/admin/admins/:id
 */
export const getAdminById = async (id) => {
  const response = await api.get(`/admin/admins/${id}`);
  return extractData(response);
};

/**
 * Create a new admin account
 * POST /api/admin/admins
 */
export const createAdmin = async (adminData) => {
  const response = await api.post("/admin/admins", adminData);
  return extractData(response);
};

/**
 * Update an existing admin account
 * PUT /api/admin/admins/:id
 */
export const updateAdmin = async (id, data) => {
  const response = await api.put(`/admin/admins/${id}`, data);
  return extractData(response);
};

/**
 * Delete an admin account by ID
 * DELETE /api/admin/admins/:id
 */
export const deleteAdmin = async (id) => {
  const response = await api.delete(`/admin/admins/${id}`);
  return extractData(response);
};

// ============================================================================
// PLANS ENDPOINTS (SUPER ADMIN ONLY)
// ============================================================================

/**
 * Fetch all subscription plans
 * GET /api/admin/plans
 */
export const getPlans = async () => {
  const response = await api.get("/admin/plans");
  return extractData(response);
};

/**
 * Fetch a single plan by ID
 * GET /api/admin/plans/:id
 */
export const getPlanById = async (id) => {
  const response = await api.get(`/admin/plans/${id}`);
  return extractData(response);
};

/**
 * Create a new subscription plan
 * POST /api/admin/plans
 */
export const createPlan = async (data) => {
  const response = await api.post("/admin/plans", data);
  return extractData(response);
};

/**
 * Update an existing subscription plan
 * PUT /api/admin/plans/:id
 */
export const updatePlan = async (id, data) => {
  const response = await api.put(`/admin/plans/${id}`, data);
  return extractData(response);
};

/**
 * Delete a subscription plan by ID
 * DELETE /api/admin/plans/:id
 */
export const deletePlan = async (id) => {
  const response = await api.delete(`/admin/plans/${id}`);
  return extractData(response);
};

// ============================================================================
// EMERGENCY ALERTS ENDPOINTS
// ============================================================================
export const getAlerts = async () =>
  extractData(await api.get("/admin/alerts"));
export const getAlertById = async (id) =>
  extractData(await api.get(`/admin/alerts/${id}`));
export const createAlert = async (data) =>
  extractData(await api.post("/admin/alerts", data));
export const deleteAlert = async (id) =>
  extractData(await api.delete(`/admin/alerts/${id}`));

// ============================================================================
// VISITORS ENDPOINTS
// ============================================================================
export const getVisitors = async () =>
  extractData(await api.get("/admin/visitors"));
export const createVisitor = async (data) =>
  extractData(await api.post("/admin/visitors", data));
export const updateVisitor = async (id, data) =>
  extractData(await api.put(`/admin/visitors/${id}`, data));
export const deleteVisitor = async (id) =>
  extractData(await api.delete(`/admin/visitors/${id}`));

// ============================================================================
// COMMUNITY NEWS ENDPOINTS
// ============================================================================
export const getNews = async () => extractData(await api.get("/admin/news"));
export const createNews = async (data) =>
  extractData(await api.post("/admin/news", data));
export const updateNews = async (id, data) =>
  extractData(await api.put(`/admin/news/${id}`, data));
export const deleteNews = async (id) =>
  extractData(await api.delete(`/admin/news/${id}`));

// ============================================================================
// FAMILY MEMBERS ENDPOINTS
// ============================================================================
export const getFamilyMembers = async () =>
  extractData(await api.get("/admin/family-members"));
export const getFamilyMembersForResident = async (residentId) =>
  extractData(await api.get(`/resident/family/${residentId}`));
export const createFamilyMember = async (data) =>
  extractData(await api.post("/admin/family-members", data));
export const updateFamilyMember = async (id, data) =>
  extractData(await api.put(`/admin/family-members/${id}`, data));
export const deleteFamilyMember = async (id) =>
  extractData(await api.delete(`/admin/family-members/${id}`));
