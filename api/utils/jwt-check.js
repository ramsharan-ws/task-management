const jwt = require("jsonwebtoken");
const { L } = require("../constants/lang");
const { GetRow } = require("./sql-query");

const CheckAccessToken = async (token) => {
  return new Promise(async (resolve, reject) => {
    if (!token) {
      reject(L["NO_VALID_ACCESS_TOKEN"]);
    }

    try {
      token = token.replace("Bearer", "").trim();
      jwt.verify(
        token,
        process.env["JWT_SECRET_KEY"],
        async function (err, decoded) {
          if (err) reject(err);

          if (decoded) {
            const uuid = decoded["uuid"];
            try {
              const user = await GetRow("users", { uuid: uuid, is_active: true });
              resolve(user);
            } catch (error) {
              reject(L["NO_VALID_ACCOUNT"]);
            }
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  CheckAccessToken,
};
