const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { GenerateAccessToken } = require("../utils/jwt-generate");
const {
  GetRow,
  InsertRow,
  RunQuery,
  UpdateRow,
  GetAllRows,
} = require("../utils/sql-query");

const TABLE_NAME = "users";

const CheckUserCredentials = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const query_params = {
        email: params["email"],
        is_active: true,
      };
      const user_query = `SELECT
      id,
      uuid,
      name,
      email,
      role,
      password
      FROM
          users
      WHERE
          email=:email
      AND
          is_active=:is_active
      LIMIT 1;`;
      const result = await RunQuery(user_query, query_params);
      if(result.rows.length <= 0){
        reject({
          success: false,
          error: "Invalid credentials for user.",
        });
        return;
      }
      const user = result.rows[0];
      const checkPassword = await bcrypt.compare(
        params["password"],
        user["password"]
      );
      if (!checkPassword) {
        reject({
          success: false,
          error: "Invalid credentials for user.",
        });
        return;
      }

      delete user["password"];

      user["access_token"] = GenerateAccessToken({
        uuid: user["uuid"],
      });
      resolve(user);
    } catch (error) {
      console.log("error", error);
      reject({
        success: false,
        error: `No account with provided credentials exists in system.`,
      });
    }
  });
};

module.exports = {
  CheckUserCredentials
};
