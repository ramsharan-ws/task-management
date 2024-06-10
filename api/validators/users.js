const Joi = require("joi");

const UserViewSchema = Joi.object({
  id: Joi.string().required(),
});

const UserCreateSchema = Joi.object({
  name: Joi.string().max(128).required(),
  email: Joi.string().email().max(128).required(),
  password: Joi.string().max(128).required(),
  confirm_password: Joi.string().max(128).required(),
  system_role: Joi.string().required().valid("USER", "SUPER_ADMIN"),
  system_permissions: Joi.array().required(),
  mobile_number: Joi.string()
    .min(10)
    .max(16)
    .pattern(/^[0-9]+$/)
    .required(),
  // role: Joi.string().max(128).required(),
  customer_data: Joi.alternatives().conditional("system_role", {
    is: "USER",
    then: Joi.array()
      .items(
        Joi.object({
          customer_id: Joi.any().required(),
          role_id: Joi.any().required(),
        })
      )
      .min(1),
    otherwise: Joi.array(),
  }),
});

const UserEditSchema = Joi.object({
  uuid: Joi.string().max(128).required(),
  name: Joi.string().max(128).required(),
  email: Joi.string().email().max(128).required(),
  is_active: Joi.bool(),
  password: Joi.string().allow("", null).max(128).required(),
  confirm_password: Joi.string().allow("", null).max(128).required(),
  system_role: Joi.string().required().valid("USER", "SUPER_ADMIN"),
  system_permissions: Joi.array().required(),
  mobile_number: Joi.string()
    .min(10)
    .max(16)
    .pattern(/^[0-9]+$/)
    .required(),
  customer_data: Joi.alternatives().conditional("system_role", {
    is: "USER",
    then: Joi.array()
      .items(
        Joi.object({
          customer_id: Joi.any().required(),
          role_id: Joi.any().required(),
        })
      )
      .min(1),
    otherwise: Joi.array(),
  }),
});

const UserRaiseAQuerySchema = Joi.object({
  part_number: Joi.string().required(),
  quotation_uuid: Joi.string().required(),
  query_part_uuid: Joi.string().required(),
  type: Joi.string().required(),
  query_fields: Joi.array().items(Joi.string()).min(1).required(),
  users: Joi.array().items(Joi.string()).min(1).required(),
  approver: Joi.string()
    .valid(
      "CREATED",
      "AWAIT_FOR_GLOBAL_ACCOUNT_MANAGER",
      "AWAIT_FOR_DIRECTOR_SOLUTION_DESIGNER",
      "AWAIT_FOR_VP_BUSINESS_DEVELOPER",
      "RAISE_QUERY_BY_GLOBAL_ACCOUNT_MANAGER",
      "RAISE_QUERY_BY_DIRECTOR_SOLUTION_DESIGNER",
      "RAISE_QUERY_BY_VP_BUSINESS_DEVELOPER",
      "AWAIT_FOR_RAISE_QUERY_UPDATE"
    )
    .required(),
  approver_email: Joi.string().email().max(128).required(),
  query_remark: Joi.string().optional(),
});

const UserRaisedQueryResolveSchema = Joi.object({
  uuid: Joi.string().required(),
  is_resolved: Joi.string().valid("YES", "NO").required(),
  remarks: Joi.string().required(),
});

const UserResetPasswordSchema = Joi.object({
  password: Joi.string().min(6).max(32).required(),
  confirm_password: Joi.string().valid(Joi.ref("password")).required(),
});

module.exports = {
  UserViewSchema,
  UserCreateSchema,
  UserEditSchema,
  UserRaiseAQuerySchema,
  UserRaisedQueryResolveSchema,
  UserResetPasswordSchema,
};
