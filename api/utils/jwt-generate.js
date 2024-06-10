const jwt = require("jsonwebtoken");

const GenerateAccessToken = (params, expiresIn = "24h") => {
  try {
    const object = jwt.sign(params, process.env["JWT_SECRET_KEY"], {
      expiresIn: expiresIn,
    });
    return object;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  GenerateAccessToken,
};
