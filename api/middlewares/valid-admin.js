const { CheckAccessToken } = require("../utils/jwt-check");

const IsValidAdmin = async (request, response, next) => {
  try {
    const token = request.header("Authorization");
    const user = await CheckAccessToken(token);
    if(user['role'] === "ADMIN"){
      request.user = user;
      next();
    }else{
      response.send({
        success: false,
        error: "User has no admin permissions!",
      });
      return;
    }
  } catch (error) {
    response.status(401);
    response.send({
      success: false,
      error: String(error),
    });
    return;
  }
};

module.exports = {
  IsValidAdmin
};
