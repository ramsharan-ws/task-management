const express = require("express");
const AdminUserRouter = express.Router();

const bcrypt = require("bcryptjs");

const {
  GetUsers,
  GetUser,
  CreateUser,
  GetUserRolesWithPermissions,
  GetPermissionsByRoleID,
  CreateUserRole,
  UpdateUserRole,
  GetActiveCustomers,
  GetActiveRoles,
  GetAllPermissions,
  CheckRole,
  CheckRoleByNameExcept,
  CheckRoleByRoleKeyExcept,
  UpdateUserStatus,
  UpdateRoleStatus,
  UpdateUser,
  CheckUniqueUserForMobileNumber,
  CheckUniqueUserForMail,
  CheckUniqueUserForMailOnCreate,
  CheckUniqueUserForMobileNumberOnCreate,
  GetSystemPermissionsForSuperAdmin,
  CheckUser,
  GetUserWithQuotationEditPermission,
  GetRaiseQueries,
  CreateRaiseQuery,
  MarkRaisedQueryResolved,
  GetPermissionsForAll,
} = require("../../services/users");
const { ValidateBodySchema } = require("../../validators");
const {
  UserViewSchema,
  UserCreateSchema,
  UserEditSchema,
  UserRaiseAQuerySchema,
  UserRaisedQueryResolveSchema,
  UserResetPasswordSchema,
} = require("../../validators/users");
const { SendRejectedResponse } = require("../../utils/rejected-response");
const { UpdateRow } = require("../../utils/sql-query");

AdminUserRouter.post("/", async (req, res) => {
  const users = await GetUsers([
    "id",
    "uuid",
    "name",
    "email",
    "mobile_number",
    "is_active",
    "is_editable",
    "created_at",
    "updated_at",
  ]);
  return res.json({
    success: true,
    users: users,
  });
});

AdminUserRouter.post(
  "/create",
  ValidateBodySchema(UserCreateSchema),
  async (req, res) => {
    try {
      const { email, mobile_number } = req.body;
      const check_user_email = await CheckUniqueUserForMailOnCreate({
        email: email,
      });
      if (check_user_email && check_user_email.length > 0) {
        return res.status(422).json({
          success: false,
          message: "Email already taken, please try with unique email.",
        });
      }
      const check_user_mobile_number =
        await CheckUniqueUserForMobileNumberOnCreate({
          mobile_number: mobile_number,
        });

      if (check_user_mobile_number && check_user_mobile_number.length > 0) {
        return res.status(422).json({
          success: false,
          message:
            "Mobile number already taken, please try with unique mobile number.",
        });
      }
      const params = req.body;
      const { uuid } = await CreateUser(params);

      const notification_status = await TriggerNotification(
        "NEW_USER_CREATED",
        { uuid: uuid }
      );

      return res.json({
        success: true,
        uuid: uuid,
        notification_status: notification_status,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminUserRouter.post(
  "/edit",
  ValidateBodySchema(UserEditSchema),
  async (req, res) => {
    try {
      const { uuid, email, mobile_number } = req.body;
      const check_user_email = await CheckUniqueUserForMail({
        uuid: uuid,
        email: email,
      });
      if (check_user_email && check_user_email.length > 0) {
        return res.status(422).json({
          success: false,
          message: "Email already taken, please try with unique email.",
        });
      }
      const check_user_mobile_number = await CheckUniqueUserForMobileNumber({
        uuid: uuid,
        mobile_number: mobile_number,
      });
      if (check_user_mobile_number && check_user_mobile_number.length > 0) {
        return res.status(422).json({
          success: false,
          message:
            "Mobile number already taken, please try with unique mobile number.",
        });
      }
      const check_user = await CheckUser({ uuid: uuid, is_editable: true });
      if (!check_user) {
        return res.status(422).json({
          success: false,
          message: "User does not exists or is not editable.",
        });
      }
      const params = req.body;
      const { user_uuid } = await UpdateUser(params);
      return res.json({
        success: true,
        user_uuid: user_uuid,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminUserRouter.post(
  "/view",
  ValidateBodySchema(UserViewSchema),
  async (req, res) => {
    try {
      const { id } = req.body;
      const user = await GetUser({ uuid: id, is_active: true });
      return res.json({
        success: true,
        user: user,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminUserRouter.post("/get-role-wise-permissions", async (req, res) => {
  const roles = await GetUserRolesWithPermissions();
  return res.json({
    success: true,
    roles: roles,
  });
});

AdminUserRouter.post("/settings", async (req, res) => {
  const customers = await GetActiveCustomers();
  const roles = await GetActiveRoles();
  const permissions = await GetAllPermissions();
  const common_permissions = await GetPermissionsForAll();
  const system_permissions_for_super_admin =
    await GetSystemPermissionsForSuperAdmin();
  const settings = {
    customers: customers,
    roles: roles,
    permissions: permissions,
    common_permissions: common_permissions,
    system_permissions_for_super_admin: system_permissions_for_super_admin,
    permission_tree: [
      {
        label: "Dashboard",
        child: [
          { label: "View Dashboard", value: "DASHBOARD.LIST", child: [] },
        ],
      },
      {
        label: "Bulk Import",
        child: [
          {
            label: "Bulk Import View",
            value: "BULK_IMPORT.VIEW",
            child: [],
          },
          {
            label: "Bulk Import Create",
            value: "BULK_IMPORT_CREATE",
            child: [
              {
                label: "Bulk Import Pattern Create",
                value: "BULK_IMPORT_PATTERN.IMPORT",
              },
              {
                label: "Bulk Import Procurement Create",
                value: "BULK_IMPORT_PROCUREMENT.IMPORT",
              },
              {
                label: "Bulk Import BOM Create",
                value: "BULK_IMPORT_BOM.IMPORT",
              },
            ],
          },
          {
            label: "Bulk Export",
            value: "BULK_EXPORT",
            child: [
              {
                label: "Bulk Export Pattern Create",
                value: "BULK_IMPORT_PATTERN.EXPORT",
              },
              {
                label: "Bulk Export Procurement Create",
                value: "BULK_IMPORT_PROCUREMENT.EXPORT",
              },
              {
                label: "Bulk Export BOM Create",
                value: "BULK_IMPORT_BOM.EXPORT",
              },
            ],
          },
        ],
      },
      {
        label: "Quotation",
        child: [
          { label: "Quotations List", value: "QUOTATION.LIST", child: [] },
          { label: "Quotations Create", value: "QUOTATION.CREATE", child: [] },
          { label: "Quotations Edit", value: "QUOTATION.EDIT", child: [] },
          { label: "Quotations Cancel", value: "QUOTATION.CANCEL", child: [] },
          {
            label: "Quotation Detail View",
            value: "QUOTATION.VIEW",
            child: [
              { label: "RFQ Information View", value: "RFQ_INFORMATION.VIEW" },
              {
                label: "Supplier Information View",
                value: "SUPPLIER_INFORMATION.VIEW",
              },
              { label: "RFQ Specifics View", value: "RFQ_SPECIFICS.VIEW" },
              { label: "Cost Variable View", value: "COST_VARIABLE.VIEW" },
              { label: "Admin Variable View", value: "ADMIN_VARIABLE.VIEW" },
              {
                label: "Engineering Variable View",
                value: "ENGINEERING_VARIABLE.VIEW",
              },
              { label: "Procurement List", value: "PROCUREMENT.LIST" },
              { label: "MTM Pattern List", value: "MTM_PATTERN.LIST" },
              { label: "Generic Pattern List", value: "GENERIC_PATTERN.LIST" },
              {
                label: "Part Specific Pattern List",
                value: "PART_SPECIFIC_PATTERN.LIST",
              },
              { label: "Part Summary List", value: "PART_SUMMARY.VIEW" },
              {
                label: "Procurement Summary List",
                value: "PROCUREMENT_SUMMARY.VIEW",
              },
              { label: "Labor Summary List", value: "LABOR_SUMMARY.VIEW" },
              { label: "Tooling List", value: "TOOLING.LIST" },
              { label: "Tax List", value: "TAX.LIST" },
              {
                label: "Final Computation List",
                value: "FINAL_COMPUTATION.VIEW",
              },
            ],
          },
          {
            label: "Quotation Detail Export",
            value: "QUOTATION.EXPORT",
            child: [
              { label: "Procurement Export", value: "PROCUREMENT.EXPORT" },
              { label: "MTM Pattern Export", value: "MTM_PATTERN.EXPORT" },
              {
                label: "Generic Pattern Export",
                value: "GENERIC_PATTERN.EXPORT",
              },
              {
                label: "Part Specific Pattern Export",
                value: "PART_SPECIFIC_PATTERN.EXPORT",
              },
              { label: "Part Summary Export", value: "PART_SUMMARY.EXPORT" },
              {
                label: "Procurement Summary Export",
                value: "PROCUREMENT_SUMMARY.EXPORT",
              },
              { label: "Labor Summary Export", value: "LABOR_SUMMARY.EXPORT" },
              { label: "Tooling Export", value: "TOOLING.EXPORT" },
              { label: "Tax Export", value: "TAX.EXPORT" },
              {
                label: "Final Computation Export",
                value: "FINAL_COMPUTATION.EXPORT",
              },
            ],
          },
          {
            label: "Quotation Detail Update",
            value: "QUOTATION_DETAIL.VIEW",
            child: [
              {
                label: "RFQ Information Update",
                value: "RFQ_INFORMATION.UPDATE",
              },
              {
                label: "Supplier Information Update",
                value: "SUPPLIER_INFORMATION.UPDATE",
              },
              { label: "RFQ Specifics Update", value: "RFQ_SPECIFICS.UPDATE" },
              { label: "Cost Variable Update", value: "COST_VARIABLE.UPDATE" },
              {
                label: "Admin Variable Update",
                value: "ADMIN_VARIABLE.UPDATE",
              },
              {
                label: "Engineering Variable Update",
                value: "ENGINEERING_VARIABLE.UPDATE",
              },
              { label: "Procurement Update", value: "PROCUREMENT.UPDATE" },
              { label: "MTM Pattern Update", value: "MTM_PATTERN.UPDATE" },
              {
                label: "Generic Pattern Create",
                value: "GENERIC_PATTERN.CREATE",
              },
              {
                label: "Generic Pattern Delete",
                value: "GENERIC_PATTERN.DELETE",
              },
              {
                label: "Generic Pattern Update",
                value: "GENERIC_PATTERN.UPDATE",
              },
              {
                label: "Part Specific Pattern Update",
                value: "PART_SPECIFIC_PATTERN.UPDATE",
              },
              { label: "Tooling Create", value: "TOOLING.CREATE" },
              { label: "Tooling Delete", value: "TOOLING.DELETE" },
              { label: "Tax Create", value: "TAX.CREATE" },
              { label: "Tax Update", value: "TAX.UPDATE" },
              { label: "Tax Delete", value: "TAX.DELETE" },
              {
                label: "Final Computation Update",
                value: "FINAL_COMPUTATION.UPDATE",
              },
            ],
          },
          {
            label: "Quotation Submission",
            value: "QUOTATION_SUBMISSION",
            child: [
              {
                label: "Submit For Internal Review",
                value: "SUBMIT_FOR_INTERNAL_REVIEW.CREATE",
              },
              // {
              //   label: "Submit To Customer",
              //   value: "SUBMIT_TO_CUSTOMER.CREATE",
              // },
            ],
          },
        ],
      },
      {
        label: "Summary",
        child: [
          { label: "Summary List", value: "SUMMARY.VIEW", child: [] },
          { label: "Summary Export", value: "SUMMARY.EXPORT", child: [] },
        ],
      },
      {
        label: "Package Summary",
        child: [
          {
            label: "Package Summary List",
            value: "PACKAGE_SUMMARY.VIEW",
            child: [],
          },
          {
            label: "Package Summary Export",
            value: "PACKAGE_SUMMARY.EXPORT",
            child: [],
          },
          {
            label: "Package Summary Edit",
            value: "PACKAGE_SUMMARY.EDIT",
            child: [],
          },
        ],
      },
      {
        label: "Executive Summary",
        child: [
          {
            label: "Executive Summary List",
            value: "EXECUTIVE_SUMMARY.VIEW",
            child: [],
          },
          {
            label: "Executive Summary Export",
            value: "EXECUTIVE_SUMMARY.EXPORT",
            child: [],
          },
          {
            label: "Executive Summary Edit",
            value: "EXECUTIVE_SUMMARY.EDIT",
            child: [],
          },
        ],
      },
      {
        label: "Presentation Summary",
        child: [
          {
            label: "Presentation Summary List",
            value: "PRESENTATION_SUMMARY.VIEW",
            child: [],
          },
          {
            label: "Presentation Summary Export",
            value: "PRESENTATION_SUMMARY.EXPORT",
            child: [],
          },
          // {
          //   label: "Presentation Summary Edit",
          //   value: "PRESENTATION_SUMMARY.EDIT",
          //   child: [],
          // },
        ],
      },
      {
        label: "Notification",
        child: [
          { label: "Notification List", value: "NOTIFICATION.VIEW", child: [] },
        ],
      },
      {
        label: "Raise Query",
        child: [
          {
            label: "Raise a Query for Procurement",
            value: "RAISE_QUERY_PROCUREMENT.CREATE",
            child: [],
          },
          {
            label: "Raise a Query for Part Specific Pattern",
            value: "RAISE_QUERY_PART_SPECIFIC_PATTERN.CREATE",
            child: [],
          },
        ],
      },
    ],
  };
  return res.json({
    success: true,
    settings: settings,
  });
});

AdminUserRouter.post("/get-permissions-by-role-id", async (req, res) => {
  const { id } = req.body;
  const role = await GetPermissionsByRoleID({ id: id });
  return res.json({
    success: true,
    role: role,
  });
});

AdminUserRouter.post("/create-new-role", async (req, res) => {
  const { name } = req.body;
  const role_name = name.trim();
  const role_title = role_name.replace(/[^a-zA-Z0-9 ]/g, " ");
  const words = role_title.trim().split(" ");
  const upperCaseWords = words.map((word) => word.toUpperCase());
  const role_key = upperCaseWords.join("_");
  const check_role_name = await CheckRole({ name: role_name });
  if (check_role_name) {
    return res.status(422).json({
      success: false,
      message: "Role already exists, Please try with unique role",
    });
  }
  const check_role_key = await CheckRole({ role_key: role_key });
  if (check_role_key) {
    return res.status(422).json({
      success: false,
      message: "Role already exists, Please try with unique role",
    });
  }
  const { description } = req.body;
  const { permissions } = req.body;
  if (permissions.length <= 0) {
    return res
      .status(422)
      .json({ success: false, message: "Atleast one permission is required!" });
  }
  const params = {
    name: role_name,
    role_key: role_key,
    description: description,
    assigned_permissions: JSON.stringify(permissions),
  };
  const role = await CreateUserRole(params);
  return res.json({
    success: true,
    roleCreated: role,
  });
});

AdminUserRouter.post("/edit-role", async (req, res) => {
  const { id } = req.body;
  const { name } = req.body;
  const role_name = name.trim();
  const check_role = await CheckRole({ id: id, is_editable: true });
  if (!check_role) {
    return res.status(422).json({
      success: false,
      message: "Role does not exists or is not editable!",
    });
  }
  const role_title = role_name.replace(/[^a-zA-Z0-9 ]/g, " ");
  const words = role_title.trim().split(" ");
  const upperCaseWords = words.map((word) => word.toUpperCase());
  const role_key = upperCaseWords.join("_");
  const check_role_name = await CheckRoleByNameExcept({
    id: id,
    name: role_name,
  });
  if (check_role_name && check_role_name.length > 0) {
    return res.status(422).json({
      success: false,
      message: "Role already exists, Please try with unique role",
    });
  }
  const check_role_key = await CheckRoleByRoleKeyExcept({
    id: id,
    role_key: role_key,
  });
  if (check_role_key && check_role_key.length > 0) {
    return res.status(422).json({
      success: false,
      message: "Role already exists, Please try with unique role",
    });
  }
  const { description } = req.body;
  const { permissions } = req.body;
  if (permissions.length <= 0) {
    return res
      .status(422)
      .json({ success: false, message: "Atleast one permission is required!" });
  }
  const where = { id: id };
  const params = {
    name: role_name,
    role_key: role_key,
    description: description,
    assigned_permissions: JSON.stringify(permissions),
  };
  const role = await UpdateUserRole(where, params);
  return res.json({
    success: true,
    roleUpdated: role,
  });
});

AdminUserRouter.post("/edit-user-status", async (req, res) => {
  try {
    const { user_id } = req.body;
    const { is_active } = req.body;
    const check_user = await CheckUser({ id: user_id, is_editable: true });
    if (!check_user) {
      return res.status(422).json({
        success: false,
        message: "User does not exists or is not editable!",
      });
    }
    const params = {
      user_id: user_id,
      is_active: is_active,
    };
    const result = await UpdateUserStatus(params);
    return res.json({
      success: true,
      user_updated: result,
    });
  } catch (error) {
    await SendRejectedResponse(res, {
      error: error,
    });
  }
});

AdminUserRouter.post("/edit-role-status", async (req, res) => {
  try {
    const { role_id } = req.body;
    const { is_active } = req.body;
    const check_role = await CheckRole({ id: role_id, is_editable: true });
    if (!check_role) {
      return res.status(422).json({
        success: false,
        message: "Role does not exists or is not editable!",
      });
    }
    const params = {
      role_id: role_id,
      is_active: is_active,
    };
    const result = await UpdateRoleStatus(params);
    return res.json({
      success: true,
      role_updated: result,
    });
  } catch (error) {
    await SendRejectedResponse(res, {
      error: error,
    });
  }
});

AdminUserRouter.post("/get-users-for-raise-query", async (req, res) => {
  try {
    const { customer_id } = req.user;
    const user_id = req.user.id;
    const users = await GetUserWithQuotationEditPermission({
      customer_id: customer_id,
      user_id: user_id,
    });
    return res.json({
      success: true,
      users: users,
    });
  } catch (error) {
    await SendRejectedResponse(res, {
      error: error,
    });
  }
});

AdminUserRouter.post("/raised-queries", async (req, res) => {
  try {
    const params = req.user;
    const raised_queries = await GetRaiseQueries(params);
    return res.json({
      success: true,
      raised_queries: raised_queries,
    });
  } catch (error) {
    await SendRejectedResponse(res, {
      error: error,
    });
  }
});

AdminUserRouter.post(
  "/raise-query",
  ValidateBodySchema(UserRaiseAQuerySchema),
  async (req, res) => {
    try {
      const params = req.body;
      params["user_id"] = req.user.id;
      params["customer_id"] = req.user.customer_id;
      const result = await CreateRaiseQuery(params);
      return res.json({
        success: true,
        result: result,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminUserRouter.post(
  "/resolve-raised-query",
  ValidateBodySchema(UserRaisedQueryResolveSchema),
  async (req, res) => {
    try {
      const params = req.body;
      params["user_id"] = req.user.id;
      params["customer_id"] = req.user.customer_id;
      const result = await MarkRaisedQueryResolved(params);
      if (!result) {
        return res.json({
          success: false,
          result: result.rows,
          message: "Invalid User or Raised Query!",
        });
      }
      return res.json({
        success: true,
        result: result.rows,
        message: "Query Resolved!",
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminUserRouter.post(
  "/reset-password",
  ValidateBodySchema(UserResetPasswordSchema),
  async (req, res) => {
    try {
      const user_id = req.user.id;
      const password = req.body.password;
      const hased_password = await bcrypt.hash(password, 10);

      const update_row_result = await UpdateRow(
        "users",
        {
          id: user_id,
        },
        {
          password: hased_password,
          updated_at: "NOW()",
        }
      );

      return res.json({
        success: true,
        update_row_result: update_row_result === 1,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: String(error),
      });
    }
  }
);

module.exports = AdminUserRouter;
