var axios = require("axios").default;
const express = require("express");
const BaseRouter = express.Router();

const { ValidateBodySchema } = require("../validators");
const {
  LoginSchema,
  CreatePasswordSchema,
  GeneratePasswordTokenSchema,
  ForgotPasswordTokenSchema,
} = require("../validators/auth");

const {
  CheckUserCredentials,
  ValidPasswordToken,
  UpdatePassword,
  GetForgotPasswordEmail,
  InvalidatePasswordToken,
} = require("../services/users");
const { GenerateAccessToken } = require("../utils/jwt-generate");

// Server ping
BaseRouter.all("/", async (req, res) => {
  return res.json({
    success: true,
    health: "ok",
    remote: req.ip,
    ts: new Date(),
  });
});

// Login
BaseRouter.post("/login", ValidateBodySchema(LoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await CheckUserCredentials({ email, password });
    return res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    res.status(403);
    return res.json(error);
  }
});

module.exports = BaseRouter;
