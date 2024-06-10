const validator = require("express-joi-validation").createValidator({
  passError: true,
});

const ValidateBodySchema = (schema) => {
  return validator.body(schema);
};

module.exports = {
  ValidateBodySchema,
};
