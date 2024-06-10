const express = require("express");
const AdminRouter = express.Router();

const AdminUserRouter = require("./users");
const AdminTaskRouter = require("./tasks");

AdminRouter.post("/", async (req, res) => {
  const dashboard = {
    current_login_at: new Date(),
  };

  return res.json({
    success: true,
    dashboard: dashboard,
  });
});

AdminRouter.use("/users", AdminUserRouter);
AdminRouter.use("/tasks", AdminTaskRouter);

module.exports = AdminRouter;
