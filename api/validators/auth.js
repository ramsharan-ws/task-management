const Joi = require("joi");

const LoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(5).max(32).required(),
});

const CreatePasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(5).max(32).required(),
  confirm_password: Joi.string().valid(Joi.ref("password")).required(),
});

const GeneratePasswordTokenSchema = Joi.object({
  email: Joi.string().email().required(),
});

const ForgotPasswordTokenSchema = Joi.object({
  email: Joi.string().email().required(),
});

module.exports = {
  LoginSchema,
  CreatePasswordSchema,
  GeneratePasswordTokenSchema,
  ForgotPasswordTokenSchema,
};
