const DB = require("knex")({
  client: "pg",
  connection: {
    host: process.env["DB_HOST"],
    port: process.env["DB_PORT"],
    user: process.env["DB_USERNAME"],
    password: process.env["DB_PASSWORD"],
    database: process.env["DB_NAME"],
  },
  pool: {
    min: Number(process.env["DB_POOL_MIN"]),
    max: Number(process.env["DB_POOL_MAX"]),
  },
});

module.exports = {
  DB,
};
