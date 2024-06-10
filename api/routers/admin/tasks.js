const express = require("express");
const AdminTaskRouter = express.Router();
const multer = require("multer");
const moment = require("moment");
const path = require('path');
const fs = require('fs');
const { ValidateBodySchema } = require("../../validators");
const { SendRejectedResponse } = require("../../utils/rejected-response");
const { GetRow } = require("../../utils/sql-query");
const { GetTasks, CreateTask, GetTask, UpdateTask, UpdateTaskPriority, UpdateTaskStatus, UploadTasks } = require("../../services/tasks");
const { TaskCreateSchema, TaskEditSchema, TaskViewSchema, TaskStatusSchema, TaskPrioritySchema } = require("../../validators/tasks");

const storage = multer.memoryStorage();
const upload = multer({ storage:storage });

AdminTaskRouter.post("/", async (req, res) => {
  const tasks = await GetTasks();
  return res.json({
    success: true,
    tasks: tasks,
  });
});

AdminTaskRouter.post(
  "/create",
  ValidateBodySchema(TaskCreateSchema),
  async (req, res) => {
    try {
      const params = req.body;
      params['created_by'] = req.user.id;
      params['updated_by'] = req.user.id;
      params['created_at'] = "NOW()";
      params['updated_at'] = "NOW()";
      const { uuid } = await CreateTask(params);
      return res.json({
        success: true,
        uuid: uuid
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminTaskRouter.post(
  "/edit",
  ValidateBodySchema(TaskEditSchema),
  async (req, res) => {
    try {
      const params = req.body;
      params['updated_by'] = req.user.id;
      params['updated_at'] = "NOW()";
      const conditions = {
        uuid:params['uuid'],
      }; 
      delete params['uuid'];
      const { uuid } = await UpdateTask(conditions, params);
      return res.json({
        success: true,
        uuid: uuid,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminTaskRouter.post(
  "/view",
  ValidateBodySchema(TaskViewSchema),
  async (req, res) => {
    try {
      const { uuid } = req.body;
      const task = await GetTask({ uuid: uuid });
      return res.json({
        success: true,
        task: task,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminTaskRouter.post(
  "/update-status",
  ValidateBodySchema(TaskStatusSchema),
  async (req, res) => {
    try {
      const params = req.body;
      params['updated_by'] = req.user.id;
      params['updated_at'] = "NOW()";
      const { uuid } = await UpdateTaskStatus(params);
      return res.json({
        success: true,
        uuid: uuid,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminTaskRouter.post(
  "/update-priority",
  ValidateBodySchema(TaskPrioritySchema),
  async (req, res) => {
    try {
      const params = req.body;
      params['updated_by'] = req.user.id;
      params['updated_at'] = "NOW()";
      const { uuid } = await UpdateTaskPriority(params);
      return res.json({
        success: true,
        uuid: uuid,
      });
    } catch (error) {
      await SendRejectedResponse(res, {
        error: error,
      });
    }
  }
);

AdminTaskRouter.post(
  "/upload-excel",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
      }
      if (req.file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        return res
          .status(400)
          .json({ success: false, message: "Only XLSX files are allowed" });
      }
     
      const user = await GetRow("users", {
        id: req.user.id,
        is_active: true,
        role:"ADMIN"
      });

      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Please provide valid user!" });
      }
      const file_buffer = req.file.buffer;
      const params = {
        file_buffer: file_buffer,
        user_id: req.user.id
      };

      const upload_result = await UploadTasks(params);
      return res.json({
        success: true,
        message: "File uploaded and data inserted",
        rows_inserted: upload_result.rows_inserted,
        data:upload_result.data
      });
    } catch (error) {
      return res
        .status(422)
        .json({ success: false, message: "Server error", error: error });
    }
  }
);


module.exports = AdminTaskRouter;
