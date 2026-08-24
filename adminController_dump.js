/**
 * @adminController.js
 * @description HTTP Controller handling administrative operations (Delegates logic to adminService).
 */

const adminService = require("../services/adminService");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const fs = require('fs');
const path = require('path');
const User = require("../models/User");

const createPlan = asyncHandler(async (req, res) => {
  const plan = await adminService.createPlan(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, plan, "Plan created successfully"));
});

const getAllPlans = asyncHandler(async (req, res) => {
  const plans = await adminService.getAllPlans(req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, plans, "Plans retrieved successfully"));
});

const getPlanById = asyncHandler(async (req, res) => {
  const plan = await adminService.getPlanById(req.params.id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, plan, "Plan retrieved successfully"));
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await adminService.updatePlan(req.params.id, req.body, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, plan, "Plan updated successfully"));
});


const buyPlan = asyncHandler(async (req, res) => {
  const subscription = await adminService.buyPlan(req.params.planId, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, subscription, "Plan purchased successfully"));
});

const deletePlan = asyncHandler(async (req, res) => {
  const result = await adminService.deletePlan(req.params.id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Plan deleted successfully"));
});

const updateAdminPlan = asyncHandler(async (req, res) => {
  const result = await adminService.updateAdminPlan(req.params.id, req.body.planId, req.user);
  return res.status(200).json(new ApiResponse(200, result, "Admin plan updated successfully"));
});

// ==========================================
// ADMIN MANAGEMENT (SUPER ADMIN ONLY)
// ==========================================

const createAdmin = asyncHandler(async (req, res) => {
  const admin = await adminService.createAdmin({
    ...req.body,
    createdBy: req.user.id,
  });
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        admin,
        "Admin account created successfully under Super Admin",
      ),
    );
});

const getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await adminService.getAllAdmins(req.query, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, admins, "All Admins retrieved successfully"));
});

const getAdminById = asyncHandler(async (req, res) => {
  const admin = await adminService.getAdminById(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, admin, "Admin details retrieved successfully"));
});

const updateAdmin = asyncHandler(async (req, res) => {
  const updatedAdmin = await adminService.updateAdmin(req.params.id, req.body);
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedAdmin, "Admin account updated successfully"),
    );
});

const deleteAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.deleteAdmin(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Admin account deleted successfully"));
});

// ==========================================
// SUB-ADMIN MANAGEMENT (ADMIN & SUPER ADMIN)
// ==========================================

const createSubAdmin = asyncHandler(async (req, res) => {
  const subAdmin = await adminService.createSubAdmin(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, subAdmin, "Sub-Admin created successfully"));
});

const getAllSubAdmins = asyncHandler(async (req, res) => {
  const subAdmins = await adminService.getAllSubAdmins(req.user);
  return res
    .status(200)
    .json(
      new ApiResponse(200, subAdmins, "All Sub-Admins retrieved successfully"),
    );
});

const getSubAdminById = asyncHandler(async (req, res) => {
  const subAdmin = await adminService.getSubAdminById(req.params.id, req.user);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subAdmin,
        "Sub-Admin details retrieved successfully",
      ),
    );
});

const updateSubAdmin = asyncHandler(async (req, res) => {
  const subAdmin = await adminService.updateSubAdmin(
    req.params.id,
    req.body,
    req.user,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, subAdmin, "Sub-Admin updated successfully"));
});

const deleteSubAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.deleteSubAdmin(req.params.id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Sub-Admin deleted successfully"));
});

// ==========================================
// RESIDENT MANAGEMENT
// ==========================================

const getAllResidents = asyncHandler(async (req, res) => {
  const residents = await adminService.getAllResidents(
    req.user,
    req.query.society,
    req.query,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, residents, "All residents retrieved successfully"),
    );
});

const getResidentById = asyncHandler(async (req, res) => {
  const resident = await adminService.getResidentById(
    req.params.id,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, resident, "Resident details retrieved successfully"),
    );
});

const updateResident = asyncHandler(async (req, res) => {
  const resident = await adminService.updateResident(
    req.params.id,
    req.body,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, resident, "Resident updated successfully"));
});

const createResident = asyncHandler(async (req, res) => {
  const resident = await adminService.createResident(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, resident, "Resident created successfully"));
});

const deleteResident = asyncHandler(async (req, res) => {
  const result = await adminService.deleteResident(
    req.params.id,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, result, "Resident account deleted successfully"),
    );
});

// ==========================================
// GUARD MANAGEMENT (SUPER ADMIN)
// ==========================================

const getAllGuards = asyncHandler(async (req, res) => {
  const guards = await adminService.getAllGuards(
    req.user,
    req.query.society,
    req.query,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        guards,
        "All security guards retrieved successfully",
      ),
    );
});

const getGuardById = asyncHandler(async (req, res) => {
  const guard = await adminService.getGuardById(
    req.params.id,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        guard,
        "Security Guard details retrieved successfully",
      ),
    );
});

const updateGuard = asyncHandler(async (req, res) => {
  const guard = await adminService.updateGuard(
    req.params.id,
    req.body,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, guard, "Security guard updated successfully"));
});

const createGuard = asyncHandler(async (req, res) => {
  const guard = await adminService.createGuard(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, guard, "Security guard created successfully"));
});

const deleteGuard = asyncHandler(async (req, res) => {
  const result = await adminService.deleteGuard(
    req.params.id,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        "Security Guard account deleted successfully",
      ),
    );
});

// ==========================================
// LOCAL SERVICES MANAGEMENT (SUPER ADMIN)
// ==========================================

const getAllServices = asyncHandler(async (req, res) => {
  const services = await adminService.getAllServices(
    req.user,
    req.query.society,
    req.query,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        services,
        "All local services retrieved successfully",
      ),
    );
});

const getServiceById = asyncHandler(async (req, res) => {
  const service = await adminService.getServiceById(
    req.params.id,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        service,
        "Local Service provider details retrieved successfully",
      ),
    );
});

const updateService = asyncHandler(async (req, res) => {
  const service = await adminService.updateService(
    req.params.id,
    req.body,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, service, "Local service updated successfully"));
});

const createService = asyncHandler(async (req, res) => {
  const service = await adminService.createService(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, service, "Local service created successfully"));
});

const deleteService = asyncHandler(async (req, res) => {
  const result = await adminService.deleteService(
    req.params.id,
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        "Local Service provider deleted successfully",
      ),
    );
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats(req.user);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        stats,
        "Dashboard statistics retrieved successfully",
      ),
    );
});

const updateProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Please upload a photo");
  }

  const reqProtocolHost = `${req.protocol}://${req.get("host")}`;
  let computedPhotoUrl;
  
  if (req.file.path && req.file.path.startsWith("http")) {
    computedPhotoUrl = req.file.path;
  } else {
    computedPhotoUrl = `${reqProtocolHost}/uploads/visitors/${req.file.filename}`;
  }

  const currentAdmin = await User.findById(req.user._id);
  const oldPhotoUrl = currentAdmin?.photoUrl;

  const admin = await adminService.updateAdmin(req.user._id, { photoUrl: computedPhotoUrl }, req.user);

  if (oldPhotoUrl) {
    try {
      if (oldPhotoUrl.startsWith("http") && oldPhotoUrl.includes("cloudinary.com")) {
        const cloudinary = require("cloudinary").v2;
        const urlParts = oldPhotoUrl.split('/');
        const filenameWithExt = urlParts.pop();
        const folder = urlParts.pop();
        const folderParent = urlParts.pop();
        const publicId = `${folderParent}/${folder}/${filenameWithExt.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } else if (oldPhotoUrl.includes("/uploads/visitors/")) {
        const fs = require("fs");
        const path = require("path");
        const filename = oldPhotoUrl.split('/').pop();
        const filePath = path.join(__dirname, '../../uploads/visitors', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (e) {
      console.warn("Failed to delete old profile photo, continuing...", e);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { photoUrl: admin.photoUrl }, "Profile photo updated successfully"));
});

const getAllSocieties = asyncHandler(async (req, res) => {
  const societies = await adminService.getAllSocieties(req.query, req.user);
  return res
    .status(200)
    .json(
      new ApiResponse(200, societies, "All societies retrieved successfully"),
    );
});

const createSociety = asyncHandler(async (req, res) => {
  const society = await adminService.createSociety(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, society, "Society created successfully"));
});

const updateSociety = asyncHandler(async (req, res) => {
  const society = await adminService.updateSociety(req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, society, "Society updated successfully"));
});

const getAllFamilyMembers = asyncHandler(async (req, res) => {
  const members = await adminService.getAllFamilyMembers(
    req.user,
    req.query.society,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        members,
        "All family members retrieved successfully",
      ),
    );
});


const createSecretary = asyncHandler(async (req, res) => {
  const secretary = await adminService.createSecretary(
    req.body,
    req.user
  );
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        secretary,
        "Society Secretary created successfully",
      ),
    );
});

const createSuperSubAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.createSuperSubAdmin(req.body, req.user);
  res.status(201).json(new ApiResponse(201, result, "Super Sub Admin created successfully"));
});

module.exports = {
  createSuperSubAdmin,
  createSecretary,
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  createSubAdmin,
  getAllSubAdmins,
  getSubAdminById,
  updateSubAdmin,
  deleteSubAdmin,
  getAllResidents,
  getResidentById,
  updateResident,
  createResident,
  deleteResident,
  getAllGuards,
  getGuardById,
  updateGuard,
  createGuard,
  deleteGuard,
  getAllServices,
  getServiceById,
  updateService,
  createService,
  deleteService,
  getAllSocieties,
  createSociety,
  updateSociety,
  getDashboardStats,
  updateProfilePhoto,
  getAllFamilyMembers,
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  buyPlan,
  deletePlan,
  updateAdminPlan,
};



