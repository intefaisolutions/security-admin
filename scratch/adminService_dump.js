/**
 * @adminService.js
 * @description Business Logic Service for Admin Management of Residents, Guards & Services.
 */

const User = require("../models/User");
const Society = require("../models/Society");
const ServiceProvider = require("../models/ServiceProvider");
const Visitor = require("../models/Visitor");
const Plan = require("../models/Plan");
const AdminSubscription = require("../models/AdminSubscription");
const ApiError = require("../utils/apiError");
const { getIO } = require("../socket");
const { getEffectivePermissions } = require("../config/permissions");
const { canCreateWithinPlan, getPlanLimit } = require("../config/planLimits");
const { sendEmail } = require("../utils/mailer");

class AdminService {
  // --- ADMIN MANAGEMENT (SUPER ADMIN ONLY) ---
  async createPlan(
    {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      limits,
      status,
    },
    requestingUser,
  ) {
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      throw new ApiError(403, "Only super admins can create plans");
    }

    if (!name) {
      throw new ApiError(400, "Plan name is required");
    }

    const plan = await Plan.create({
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      limits,
      status: status || "active",
    });

    return plan;
  }

  async getPlanById(planId, requestingUser) {
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin" && (requestingUser?.role || "").toLowerCase() !== "admin") {
      throw new ApiError(403, "Not authorized to view plan");
    }
    const plan = await Plan.findById(planId);
    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }
    return plan;
  }

  async updatePlan(planId, data, requestingUser) {
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      throw new ApiError(403, "Only super admins can update plans");
    }
    const plan = await Plan.findByIdAndUpdate(planId, data, {
      new: true,
      runValidators: true,
    });
    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }
    return plan;
  }

  async getAllPlans(requestingUser) {
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      return Plan.find({ status: "active" }).sort({ createdAt: -1 });
    }
    return Plan.find().sort({ createdAt: -1 });
  }

  async buyPlan(planId, requestingUser) {
    if ((requestingUser?.role || "").toLowerCase() !== "admin") {
      throw new ApiError(403, "Only admins can purchase a plan");
    }

    const plan = await Plan.findById(planId);
    if (!plan || plan.status !== "active") {
      throw new ApiError(404, "Plan not found or inactive");
    }

    const existing = await AdminSubscription.findOne({
      admin: requestingUser.id,
      status: "active",
    });

    if (existing) {
      existing.plan = plan._id;
      existing.status = "active";
      existing.endDate = new Date(
        Date.now() + (plan.type === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
      );
      existing.usage = {
        subAdmins: 0,
        societies: 0,
        guards: 0,
        serviceProviders: 0,
        residents: 0,
      };
      await existing.save();
      return existing.populate("plan");
    }

    const subscription = await AdminSubscription.create({
      admin: requestingUser.id,
      plan: plan._id,
      status: "active",
      endDate: new Date(
        Date.now() + (plan.type === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
      ),
      usage: {
        subAdmins: 0,
        societies: 0,
        guards: 0,
        serviceProviders: 0,
        residents: 0,
      },
    });

    return subscription.populate("plan");
  }

  async deletePlan(planId, requestingUser) {
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      throw new ApiError(403, "Only super admins can delete plans");
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }

    const activeSubscriptions = await AdminSubscription.findOne({ plan: planId, status: "active" });
    if (activeSubscriptions) {
      throw new ApiError(400, "Cannot delete plan with active subscriptions");
    }

    await Plan.findByIdAndDelete(planId);
    return { _id: planId };
  }

  async updateAdminPlan(adminId, planId, requestingUser) {
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      throw new ApiError(403, "Only super admins can update admin plans");
    }

    const plan = await Plan.findById(planId);
    if (!plan || plan.status !== "active") {
      throw new ApiError(404, "Plan not found or inactive");
    }

    let existing = await AdminSubscription.findOne({ admin: adminId, status: "active" });

    if (existing) {
      existing.plan = plan._id;
      existing.endDate = new Date(Date.now() + (plan.type === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000);
      await existing.save();
      return existing.populate("plan");
    }

    const subscription = await AdminSubscription.create({
      admin: adminId,
      plan: plan._id,
      status: "active",
      endDate: new Date(Date.now() + (plan.type === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000),
      usage: {
        subAdmins: 0,
        societies: 0,
        guards: 0,
        serviceProviders: 0,
        residents: 0,
      },
    });

    return subscription.populate("plan");
  }

  async createAdmin({ name, phone, email, plan, society, createdBy }) {
    if (!name || !phone || !email) {
      throw new ApiError(400, "Name, phone, and email are required");
    }

    if (!plan) {
      throw new ApiError(400, "Subscription plan is required");
    }

    const existingAdminByPhone = await User.findOne({
      phone,
      role: { $in: ["admin", "ADMIN"] },
    });
    if (existingAdminByPhone) {
      throw new ApiError(409, "Admin with this phone already exists");
    }

    const existingAdminByEmail = await User.findOne({
      email,
      role: { $in: ["admin", "ADMIN"] },
    });
    if (existingAdminByEmail) {
      throw new ApiError(409, "Admin with this email already exists");
    }

    const planDoc = await Plan.findById(plan);
    if (!planDoc || planDoc.status !== "active") {
      throw new ApiError(404, "Plan not found or inactive");
    }
    
    // Generate License Key (e.g., ADMIN-XXXXXX)
    const crypto = require("crypto");
    const licenseKey = `ADMIN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Create admin without password (we set a dummy password because schema requires it)
    // The admin will set their actual password during sign-up
    const dummyPassword = crypto.randomBytes(16).toString("hex");

    const admin = await User.create({
      name,
      phone,
      email,
      password: dummyPassword, 
      role: "admin",
      flatNumber: "Admin Suite",
      block: "Tower A",
      society,
      societies: society ? [society] : [],
      createdBy,
      licenseKey,
      isVerified: false,
    });

    // Create AdminSubscription
    await AdminSubscription.create({
      admin: admin._id,
      plan: planDoc._id,
      status: "active",
      endDate: new Date(
        Date.now() + (planDoc.type === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
      ),
      usage: {
        subAdmins: 0,
        societies: 0,
        guards: 0,
        serviceProviders: 0,
        residents: 0,
      },
    });

    const signupLink = `http://localhost:5173/admin-signup?phone=${phone}&key=${licenseKey}`;

    // Mock sending SMS fallback
    console.log(`\n\n=== SMS MOCK ===`);
    console.log(`To: ${phone}`);
    console.log(`Message: Welcome to IntefAI Security! You have been invited as an Admin.
Your License Key is: ${licenseKey}
Please sign up using this link: ${signupLink}`);
    console.log(`================\n\n`);

    const emailHtml = `
      <h2>Welcome to IntefAI Security, ${name}!</h2>
      <p>You have been invited as a System Admin.</p>
      <p><strong>Your License Key is:</strong> ${licenseKey}</p>
      <p>Please complete your sign up by setting your password using the link below:</p>
      <a href="${signupLink}">Complete Sign Up</a>
    `;

    const emailSent = await sendEmail({
      to: email,
      subject: "IntefAI Security - Admin License Key & Invitation",
      html: emailHtml,
    });

    const createdAdmin = await User.findById(admin._id)
      .select("-password")
      .populate("society", "name address");

    const result = createdAdmin.toObject();
    result.emailSent = emailSent;

    return result;
  }

  async getAllAdmins(options = {}, requestingUser) {
    const userRole = (requestingUser?.role || "").toLowerCase();
    
    // Determine which roles this user is allowed to see
    let allowedRoles = [];
    if (userRole === "super_admin") {
      allowedRoles = ["admin", "super_sub_admin", "sub_admin", "secretary"];
    } else if (userRole === "super_sub_admin") {
      allowedRoles = ["admin"]; // they manage admins, but don't see other super_sub_admins
    } else if (userRole === "admin") {
      allowedRoles = ["sub_admin", "secretary"];
    } else if (userRole === "sub_admin") {
      allowedRoles = ["secretary"]; // they manage secretaries, don't see other sub_admins
    }

    const query = {
      role: { $in: allowedRoles },
      ...this.buildSearchFilter(options.search, ["name", "phone", "email"])
    };
    
    // For admin and sub_admin, they should only see users in their own society
    if (userRole === "admin" || userRole === "sub_admin") {
      if (requestingUser.society) {
        query.society = requestingUser.society;
      }
    }

    // Exclude the requesting user themselves
    if (requestingUser && requestingUser._id) {
      query._id = { $ne: requestingUser._id };
    }

    return User.find(query)
      .select("-password")
      .populate("society", "name address")
      .sort({ createdAt: -1 });
  }

  async getAdminById(id) {
    const admin = await User.findOne({
      _id: id,
      role: { $in: ["admin", "ADMIN"] },
    })
      .select("-password")
      .populate("society", "name address");

    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }

    return admin;
  }

  async updateAdmin(id, updateData) {
    const allowedUpdates = ["name", "phone", "society", "isVerified"];
    const updates = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    }

    if (updateData.password) {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updateData.password, salt);
    }

    const admin = await User.findOneAndUpdate(
      { _id: id, role: { $in: ["admin", "ADMIN"] } },
      updates,
      { new: true },
    )
      .select("-password")
      .populate("society", "name address");

    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }

    return admin;
  }

  async deleteAdmin(id) {
    const admin = await User.findOneAndDelete({
      _id: id,
      role: { $in: ["admin", "ADMIN"] },
    });

    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }

    return { _id: id };
  }

  async getActiveAdminSubscription(adminUser) {
    const adminId = adminUser?._id || adminUser?.id;
    if (!adminId) {
      return null;
    }

    const subscription = await AdminSubscription.findOne({
      admin: adminId,
      status: "active",
    })
      .populate("plan")
      .sort({ createdAt: -1 });

    return subscription;
  }

  async ensurePlanAllowance(adminUser, key, requestedCount = 1) {
    const subscription = await this.getActiveAdminSubscription(adminUser);
    if (!subscription?.plan) {
      return null;
    }

    const currentCount = subscription.usage?.[key] ?? 0;
    const allowed = canCreateWithinPlan(
      subscription.plan,
      key,
      currentCount,
      requestedCount,
    );
    if (!allowed) {
      throw new ApiError(
        403,
        `Plan limit exceeded for ${key}. You can create up to ${getPlanLimit(subscription.plan, key)} ${key}.`,
      );
    }

    return subscription;
  }

  async incrementPlanUsage(subscription, key, amount = 1) {
    if (!subscription?._id) {
      return null;
    }

    const usageField = key;
    await AdminSubscription.updateOne(
      { _id: subscription._id },
      { $inc: { [`usage.${usageField}`]: amount } },
    );
    return true;
  }

  // --- SUB-ADMIN MANAGEMENT (ADMIN & SUPER_ADMIN) ---
  // A Sub-Admin is created by an Admin and can only ever be granted a subset
  // of the creating Admin's own module permissions — the Admin decides
  // exactly which modules to hand over.
  async createSubAdmin(
    { name, phone, password, permissions = [], assignedAdminId },
    requestingUser,
  ) {
    if (!name || !phone || !password) {
      throw new ApiError(400, "Name, phone, and password are required");
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new ApiError(400, "Select at least one permission to grant");
    }

    let actualAdmin = requestingUser;
    if ((requestingUser?.role || "").toLowerCase() === "super_admin") {
      if (!assignedAdminId) {
        throw new ApiError(400, "Super Admins must specify an assignedAdminId to create a Sub Admin under");
      }
      const User = require("../models/User");
      actualAdmin = await User.findById(assignedAdminId);
      if (!actualAdmin) {
        throw new ApiError(404, "Assigned Admin not found");
      }
      if (actualAdmin.role.toLowerCase() !== "admin") {
        throw new ApiError(400, "Assigned user must be a System Admin");
      }
    }

    const ownPermissions = getEffectivePermissions(actualAdmin);
    const invalidGrant = permissions.filter((p) => !ownPermissions.includes(p));
    if (invalidGrant.length > 0) {
      throw new ApiError(
        403,
        `You cannot grant access you don't have yourself: ${invalidGrant.join(", ")}`,
      );
    }

    if (!actualAdmin.society) {
      throw new ApiError(400, "The assigned admin account has no society assigned");
    }

    const subscription = await this.ensurePlanAllowance(
      actualAdmin,
      "subAdmins",
      1,
    );

    const existing = await User.findOne({
      phone,
      role: { $in: ["sub_admin", "SUB_ADMIN"] },
    });
    if (existing) {
      throw new ApiError(409, "Sub-Admin with this phone already exists");
    }

    const subAdmin = await User.create({
      name,
      phone,
      password,
      role: "sub_admin",
      permissions,
      flatNumber: "Sub-Admin Desk",
      block: "Tower A",
      society: actualAdmin.society,
      createdBy: actualAdmin._id,
      isVerified: true,
    });

    if (subscription) {
      await this.incrementPlanUsage(subscription, "subAdmins", 1);
    }

    return User.findById(subAdmin._id)
      .select("-password")
      .populate("society", "name address");
  }

  async getAllSubAdmins(requestingUser) {
    const filter = { role: { $in: ["sub_admin", "SUB_ADMIN"] } };
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      filter.createdBy = requestingUser.id;
    }
    return User.find(filter)
      .select("-password")
      .populate("society", "name address")
      .sort({ createdAt: -1 });
  }

  async getSubAdminById(id, requestingUser) {
    const filter = { _id: id, role: { $in: ["sub_admin", "SUB_ADMIN"] } };
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      filter.createdBy = requestingUser.id;
    }
    const subAdmin = await User.findOne(filter)
      .select("-password")
      .populate("society", "name address");

    if (!subAdmin) {
      throw new ApiError(404, "Sub-Admin not found");
    }
    return subAdmin;
  }

  async updateSubAdmin(id, updateData, requestingUser) {
    const subAdmin = await this.getSubAdminById(id, requestingUser);

    if (updateData.permissions !== undefined) {
      const ownPermissions = getEffectivePermissions(requestingUser);
      const invalidGrant = updateData.permissions.filter(
        (p) => !ownPermissions.includes(p),
      );
      if (invalidGrant.length > 0) {
        throw new ApiError(
          403,
          `You cannot grant access you don't have yourself: ${invalidGrant.join(", ")}`,
        );
      }
      if (updateData.permissions.length === 0) {
        throw new ApiError(400, "A Sub-Admin needs at least one permission");
      }
      subAdmin.permissions = updateData.permissions;
    }

    const allowedUpdates = ["name", "phone", "isVerified"];
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        subAdmin[key] = updateData[key];
      }
    }

    if (updateData.password) {
      subAdmin.password = updateData.password; // re-hashed by pre-save hook
    }

    await subAdmin.save();
    return User.findById(subAdmin._id)
      .select("-password")
      .populate("society", "name address");
  }

  async deleteSubAdmin(id, requestingUser) {
    const filter = { _id: id, role: { $in: ["sub_admin", "SUB_ADMIN"] } };
    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      filter.createdBy = requestingUser.id;
    }
    const subAdmin = await User.findOneAndDelete(filter);
    if (!subAdmin) {
      throw new ApiError(404, "Sub-Admin not found");
    }
    return { _id: id };
  }

  // --- RESIDENT MANAGEMENT ---
  buildSocietyFilter(requestingUser, explicitSocietyId) {
    const role = (requestingUser?.role || "").toLowerCase();
    if (role === "super_admin") {
      return explicitSocietyId ? { society: explicitSocietyId } : {};
    }

    if (!requestingUser?.society) {
      return { _id: null };
    }

    return { society: requestingUser.society };
  }

  buildSearchFilter(search, fields = []) {
    if (!search) {
      return {};
    }

    const regex = new RegExp(search, "i");
    return { $or: fields.map((field) => ({ [field]: regex })) };
  }

  buildPagination(queryOptions = {}) {
    const page = Math.max(1, Number(queryOptions.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(queryOptions.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  async getAllResidents(requestingUser, explicitSocietyId, options = {}) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const query = {
      role: { $in: ["resident", "RESIDENT"] },
      ...societyFilter,
      ...this.buildSearchFilter(options.search, [
        "name",
        "phone",
        "flatNumber",
        "block",
        "tower",
      ]),
    };

    const { page, limit, skip } = this.buildPagination(options);

    if (options.page || options.limit) {
      const [items, total] = await Promise.all([
        User.find(query)
          .select("-password")
          .populate("society", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query),
      ]);

      return {
        data: items,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      };
    }

    return User.find(query)
      .select("-password")
      .populate("society", "name")
      .sort({ createdAt: -1 });
  }

  async getResidentById(id, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const resident = await User.findOne({
      _id: id,
      role: { $in: ["resident", "RESIDENT"] },
      ...societyFilter,
    }).select("-password");

    if (!resident) {
      throw new ApiError(404, "Resident not found");
    }

    return resident;
  }

  async updateResident(id, updateData, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const allowedUpdates = [
      "name",
      "phone",
      "age",
      "flatNumber",
      "block",
      "tower",
      "society",
      "isVerified",
    ];
    const updates = {};

    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updates[key] =
          key === "society" &&
          (requestingUser?.role || "").toLowerCase() !== "super_admin"
            ? requestingUser?.society
            : updateData[key];
      }
    }

    if (updateData.password) {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updateData.password, salt);
    }

    if (updates.phone) {
      const duplicate = await User.findOne({
        phone: updates.phone,
        role: { $in: ["resident", "RESIDENT"] },
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new ApiError(409, "Resident with this phone already exists");
      }
    }

    const resident = await User.findOneAndUpdate(
      { _id: id, role: { $in: ["resident", "RESIDENT"] }, ...societyFilter },
      updates,
      { new: true },
    )
      .select("-password")
      .populate("society", "name");

    if (!resident) {
      throw new ApiError(404, "Resident not found");
    }

    return resident;
  }

  async deleteResident(id, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const resident = await User.findOneAndDelete({
      _id: id,
      role: { $in: ["resident", "RESIDENT"] },
      ...societyFilter,
    });

    if (!resident) {
      throw new ApiError(404, "Resident not found");
    }

    await Visitor.deleteMany({ resident: id });

    return { _id: id };
  }

  async createResident(
    { name, phone, password, age, flatNumber, block, tower, society },
    requestingUser,
  ) {
    if (!name || !phone || !password) {
      throw new ApiError(400, "Name, phone, and password are required");
    }

    const resolvedSociety =
      (requestingUser?.role || "").toLowerCase() === "super_admin"
        ? society
        : requestingUser?.society;
    if (!resolvedSociety) {
      throw new ApiError(400, "A society must be specified");
    }

    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      await this.ensurePlanAllowance(requestingUser, "residents", 1);
    }

    const existing = await User.findOne({ phone, role: "resident" });
    if (existing) {
      throw new ApiError(409, "Resident with this phone already exists");
    }

    const resident = await User.create({
      name,
      phone,
      password,
      age,
      role: "resident",
      flatNumber,
      block,
      tower,
      society: resolvedSociety,
      isVerified: true,
    });

    const createdResident = await User.findById(resident._id).select(
      "-password",
    );

    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      const subscription =
        await this.getActiveAdminSubscription(requestingUser);
      if (subscription) {
        await this.incrementPlanUsage(subscription, "residents", 1);
      }
    }

    try {
      const io = getIO();
      io.to(`society:${resolvedSociety.toString()}:admins`).emit(
        "entity:created",
        {
          type: "resident",
          data: createdResident,
        },
      );
    } catch (error) {
      // Ignore socket errors when server is not running
    }

    return createdResident;
  }

  // --- GUARD MANAGEMENT ---
  async getAllGuards(requestingUser, explicitSocietyId, options = {}) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const query = {
      role: { $in: ["guard", "GUARD"] },
      ...societyFilter,
      ...this.buildSearchFilter(options.search, [
        "name",
        "phone",
        "employeeId",
        "assignedGate",
      ]),
    };

    const { page, limit, skip } = this.buildPagination(options);

    if (options.page || options.limit) {
      const [items, total] = await Promise.all([
        User.find(query)
          .select("-password")
          .populate("society", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query),
      ]);

      return {
        data: items,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      };
    }

    return User.find(query)
      .select("-password")
      .populate("society", "name")
      .sort({ createdAt: -1 });
  }

  async getGuardById(id, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const guard = await User.findOne({
      _id: id,
      role: { $in: ["guard", "GUARD"] },
      ...societyFilter,
    }).select("-password");

    if (!guard) {
      throw new ApiError(404, "Security Guard not found");
    }

    return guard;
  }

  async updateGuard(id, updateData, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const allowedUpdates = [
      "name",
      "phone",
      "employeeId",
      "assignedGate",
      "shiftTiming",
      "onDuty",
      "supervisorName",
      "supervisorPhone",
      "society",
    ];
    const updates = {};

    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updates[key] =
          key === "society" &&
          (requestingUser?.role || "").toLowerCase() !== "super_admin"
            ? requestingUser?.society
            : updateData[key];
      }
    }

    if (updateData.password) {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updateData.password, salt);
    }

    if (updates.phone) {
      const duplicate = await User.findOne({
        phone: updates.phone,
        role: { $in: ["guard", "GUARD"] },
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new ApiError(
          409,
          "Security guard with this phone already exists",
        );
      }
    }

    const guard = await User.findOneAndUpdate(
      { _id: id, role: { $in: ["guard", "GUARD"] }, ...societyFilter },
      updates,
      { new: true },
    )
      .select("-password")
      .populate("society", "name");

    if (!guard) {
      throw new ApiError(404, "Security Guard not found");
    }

    return guard;
  }

  async deleteGuard(id, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const guard = await User.findOneAndDelete({
      _id: id,
      role: { $in: ["guard", "GUARD"] },
      ...societyFilter,
    });

    if (!guard) {
      throw new ApiError(404, "Security Guard not found");
    }

    return { _id: id };
  }

  async createGuard(
    { name, employeeId, password, phone, society },
    requestingUser,
  ) {
    if (!name || !employeeId || !password) {
      throw new ApiError(400, "Name, employee ID, and password are required");
    }

    const resolvedSociety =
      (requestingUser?.role || "").toLowerCase() === "super_admin"
        ? society
        : requestingUser?.society;
    if (!resolvedSociety) {
      throw new ApiError(400, "A society must be specified");
    }

    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      await this.ensurePlanAllowance(requestingUser, "guards", 1);
    }

    const existing = await User.findOne({ employeeId, role: "guard" });
    if (existing) {
      throw new ApiError(
        409,
        "Security guard with this employee ID already exists",
      );
    }

    const guard = await User.create({
      name,
      employeeId,
      password,
      phone,
      role: "guard",
      society: resolvedSociety,
      isVerified: true,
    });

    const createdGuard = await User.findById(guard._id).select("-password");

    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      const subscription =
        await this.getActiveAdminSubscription(requestingUser);
      if (subscription) {
        await this.incrementPlanUsage(subscription, "guards", 1);
      }
    }

    try {
      const io = getIO();
      io.to(`society:${resolvedSociety.toString()}:admins`).emit(
        "entity:created",
        {
          type: "guard",
          data: createdGuard,
        },
      );
    } catch (error) {
      // Ignore socket errors when server is not running
    }

    return createdGuard;
  }

  // --- LOCAL SERVICES MANAGEMENT ---
  async getAllServices(requestingUser, explicitSocietyId, options = {}) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const query = {
      ...societyFilter,
      ...this.buildSearchFilter(options.search, ["name", "category", "phone"]),
    };

    const { page, limit, skip } = this.buildPagination(options);

    if (options.page || options.limit) {
      const [items, total] = await Promise.all([
        ServiceProvider.find(query)
          .populate("society", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        ServiceProvider.countDocuments(query),
      ]);

      return {
        data: items,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      };
    }

    return ServiceProvider.find(query)
      .populate("society", "name")
      .sort({ createdAt: -1 });
  }

  async getServiceById(id, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const service = await ServiceProvider.findOne({
      _id: id,
      ...societyFilter,
    });
    if (!service) {
      throw new ApiError(404, "Local Service provider not found");
    }
    return service;
  }

  async updateService(id, updateData, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const allowedUpdates = [
      "name",
      "category",
      "phone",
      "verified",
      "isVerified",
      "society",
    ];
    const updates = {};

    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updates[key] =
          key === "society" &&
          (requestingUser?.role || "").toLowerCase() !== "super_admin"
            ? requestingUser?.society
            : updateData[key];
      }
    }

    const service = await ServiceProvider.findOneAndUpdate(
      { _id: id, ...societyFilter },
      updates,
      { new: true },
    ).populate("society", "name");

    if (!service) {
      throw new ApiError(404, "Local Service provider not found");
    }

    return service;
  }

  async deleteService(id, requestingUser, explicitSocietyId) {
    const societyFilter = this.buildSocietyFilter(
      requestingUser,
      explicitSocietyId,
    );
    const service = await ServiceProvider.findOneAndDelete({
      _id: id,
      ...societyFilter,
    });
    if (!service) {
      throw new ApiError(404, "Local Service provider not found");
    }
    return { _id: id };
  }

  async createService({ name, category, phone, society }, requestingUser) {
    if (!name || !category || !phone) {
      throw new ApiError(400, "Name, category, and phone are required");
    }

    const resolvedSociety =
      (requestingUser?.role || "").toLowerCase() === "super_admin"
        ? society
        : requestingUser?.society;
    if (!resolvedSociety) {
      throw new ApiError(400, "A society must be specified");
    }

    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      await this.ensurePlanAllowance(requestingUser, "serviceProviders", 1);
    }

    const service = await ServiceProvider.create({
      name,
      category,
      phone,
      society: resolvedSociety,
      verified: true,
      isVerified: true,
    });

    if ((requestingUser?.role || "").toLowerCase() !== "super_admin") {
      const subscription =
        await this.getActiveAdminSubscription(requestingUser);
      if (subscription) {
        await this.incrementPlanUsage(subscription, "serviceProviders", 1);
      }
    }

    try {
      const io = getIO();
      io.to(`society:${resolvedSociety.toString()}:admins`).emit(
        "entity:created",
        {
          type: "service",
          data: service,
        },
      );
    } catch (error) {
      // Ignore socket errors when server is not running
    }

    return service;
  }

  async getDashboardStats(requestingUser) {
    const role = (requestingUser?.role || "").toLowerCase();
    const societyFilter =
      role === "super_admin"
        ? {}
        : requestingUser?.society
          ? { society: requestingUser.society }
          : { _id: null };

    const [
      totalSocieties,
      totalAdmins,
      totalResidents,
      totalGuards,
      totalServiceProviders,
    ] = await Promise.all([
      role === "super_admin"
        ? Society.countDocuments()
        : requestingUser?.society
          ? 1
          : 0,
      User.countDocuments({
        role: { $in: ["admin", "ADMIN"] },
        ...societyFilter,
      }),
      User.countDocuments({
        role: { $in: ["resident", "RESIDENT"] },
        ...societyFilter,
      }),
      User.countDocuments({
        role: { $in: ["guard", "GUARD"] },
        ...societyFilter,
      }),
      ServiceProvider.countDocuments(societyFilter),
    ]);

    return {
      totalSocieties,
      totalAdmins,
      totalResidents,
      totalGuards,
      totalServiceProviders,
    };
  }

  async getAllSocieties(options = {}, requestingUser) {
    const role = (requestingUser?.role || "").toLowerCase();
    const query = this.buildSearchFilter(options.search, [
      "name",
      "address",
      "controlRoomPhone",
    ]);

    // Admins only see societies they created (their own environments).
    // Super admins can see all societies.
    if (role === "admin") {
      query.createdBy = requestingUser.id;
    }

    const { page, limit, skip } = this.buildPagination(options);

    if (options.page || options.limit) {
      const [items, total] = await Promise.all([
        Society.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Society.countDocuments(query),
      ]);

      return {
        data: items,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      };
    }

    return Society.find(query).sort({ createdAt: -1 });
  }

  async createSociety(
    { name, address, towers, controlRoomPhone },
    requestingUser,
  ) {
    if (!name) {
      throw new ApiError(400, "Society name is required");
    }

    const isSuperAdmin =
      (requestingUser?.role || "").toLowerCase() === "super_admin";

    // Enforce the plan's society quota for admin-created environments.
    if (!isSuperAdmin) {
      await this.ensurePlanAllowance(requestingUser, "societies", 1);
    }

    const society = await Society.create({
      name,
      address,
      towers,
      controlRoomPhone,
      createdBy: isSuperAdmin ? undefined : requestingUser.id,
    });

    // After creating a society, an admin's primary environment (the society
    // their residents/guards/services are scoped to) points to this new society.
    if (!isSuperAdmin && society._id) {
      await User.updateOne(
        { _id: requestingUser.id },
        { 
          society: society._id,
          $addToSet: { societies: society._id }
        },
      );
      requestingUser.society = society._id.toString();
      if (!requestingUser.societies) requestingUser.societies = [];
      requestingUser.societies.push(society._id.toString());
    }

    // Track plan usage for admin-created societies.
    if (!isSuperAdmin) {
      const subscription =
        await this.getActiveAdminSubscription(requestingUser);
      if (subscription) {
        await this.incrementPlanUsage(subscription, "societies", 1);
      }
    }

    try {
      const io = getIO();
      io.emit("entity:created", { type: "society", data: society });
    } catch (error) {
      // Ignore socket errors when server is not running
    }

    return society;
  }

  async updateSociety(id, updateData) {
    const allowedUpdates = ["name", "address", "towers", "controlRoomPhone"];
    const updates = {};

    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    }

    const society = await Society.findByIdAndUpdate(id, updates, { new: true });
    if (!society) {
      throw new ApiError(404, "Society not found");
    }

    return society;
  }

  async getAllFamilyMembers(requestingUser, explicitSocietyId) {
    const role = (requestingUser?.role || "").toLowerCase();
    let familyQuery = {};

    if (role !== "super_admin") {
      if (!requestingUser?.society) return [];
      const residents = await User.find({
        role: { $in: ["resident", "RESIDENT"] },
        society: requestingUser.society,
      }).select("_id");
      const residentIds = residents.map((r) => r._id);
      familyQuery = { resident: { $in: residentIds } };
    } else if (explicitSocietyId) {
      const residents = await User.find({
        role: { $in: ["resident", "RESIDENT"] },
        society: explicitSocietyId,
      }).select("_id");
      const residentIds = residents.map((r) => r._id);
      familyQuery = { resident: { $in: residentIds } };
    }

    const FamilyMember = require("../models/FamilyMember");
    return FamilyMember.find(familyQuery)
      .populate({
        path: "resident",
        select: "name phone flatNumber block tower society",
        populate: { path: "society", select: "name" },
      })
      .sort({ createdAt: -1 });
  }

  async createSecretary(
    { name, phone, password, assignedAdminId },
    requestingUser,
  ) {
    if (!name || !phone || !password) {
      throw new ApiError(400, "Name, phone, and password are required");
    }

    let actualAdmin = requestingUser;
    if ((requestingUser?.role || "").toLowerCase() === "super_admin") {
      if (!assignedAdminId) {
        throw new ApiError(400, "Super Admins must specify an assignedAdminId to create a Secretary under");
      }
      const User = require("../models/User");
      actualAdmin = await User.findById(assignedAdminId);
      if (!actualAdmin) {
        throw new ApiError(404, "Assigned Admin not found");
      }
    } else if (requestingUser?.role === "sub_admin") {
       // if sub-admin created, assign under the sub-admin's admin
       const User = require("../models/User");
       actualAdmin = await User.findById(requestingUser.createdBy);
       if (!actualAdmin) {
           throw new ApiError(404, "Parent Admin not found for sub-admin");
       }
    }

    if (!actualAdmin.society) {
      throw new ApiError(400, "The assigned admin account has no society assigned");
    }

    const User = require("../models/User");
    const existing = await User.findOne({
      phone,
      role: { $in: ["society_secretary", "SOCIETY_SECRETARY", "secretary"] },
    });
    if (existing) {
      throw new ApiError(409, "Secretary with this phone already exists");
    }

    const secretary = await User.create({
      name,
      phone,
      password,
      role: "society_secretary",
      permissions: ["news", "alerts"],
      society: actualAdmin.society,
      societies: [actualAdmin.society],
      createdBy: actualAdmin._id,
      isVerified: true,
    });

    return User.findById(secretary._id)
      .select("-password")
      .populate("society", "name address");
  }

}

module.exports = new AdminService();
