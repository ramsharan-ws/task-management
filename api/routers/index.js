const express = require("express");
const router = express.Router();

const BaseRouter = require("./base");
const AdminRouter = require("./admin");

const { IsValidAdmin } = require("../middlewares/valid-admin");

router.use("/", BaseRouter);
router.use("/v1/admin", IsValidAdmin, AdminRouter);

module.exports = router;
