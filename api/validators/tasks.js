const Joi = require("joi");

const TaskViewSchema = Joi.object({
  uuid: Joi.string().required(),
});

const TaskCreateSchema = Joi.object({
  title: Joi.string().min(5).max(256).required(),
  description: Joi.string().required(),
  due_date: Joi.date().required(),
  status: Joi.string().required().valid("OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"),
  priority: Joi.string().required().valid("HIGH", "MEDIUM", "LOW")
});

const TaskEditSchema = Joi.object({
  uuid: Joi.string().max(128).required(),
  title: Joi.string().min(5).max(256).required(),
  description: Joi.string().required(),
  due_date: Joi.date().required(),
  status: Joi.string().required().valid("OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"),
  priority: Joi.string().required().valid("HIGH", "MEDIUM", "LOW")
});

const TaskStatusSchema = Joi.object({
  uuid: Joi.string().required(),
  status: Joi.string().required().valid("OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED")
});

const TaskPrioritySchema = Joi.object({
  uuid: Joi.string().required(),
  priority: Joi.string().required().valid("HIGH", "MEDIUM", "LOW")
});

const ValidateTaskUploadSchema = Joi.object({
  Title: Joi.string().min(5).max(256).required(),
  Description: Joi.string().required(),
  DueDate: Joi.date().iso().required(),
  Status: Joi.string().required().valid("OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"),
  Priority: Joi.string().required().valid("HIGH", "MEDIUM", "LOW")
});


const TasksArrayUploadSchema = async () => {
  return new Promise((resolve, reject) => {
    try {
      const schema = Joi.array().items(ValidateTaskUploadSchema).min(1);
      resolve(schema);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  TaskViewSchema,
  TaskCreateSchema,
  TaskEditSchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  TasksArrayUploadSchema
};
