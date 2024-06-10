const serverless = require("serverless-http");
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env["EXPRESS_APP_PORT"] ?? 8000;

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(function (req, res, next) {
  res.removeHeader("X-Powered-By");
  next();
});

try {
  const router = require("./routers");
  app.use(process.env["EXPRESS_APP_PREFIX"], router);
} catch (error) {
  // Run-time error (COMBAK, Try validation error check)
  console.log("error", error);
  //
  app.use((err, req, res) => {
    res.status(422).send({
      success: false,
      error: String(error) ?? String(err.stack),
    });
  });
}

// Validation error
app.use((err, req, res, next) => {
  const error_status_code = err.error && err.error.details ? 422 : 500;
  const error =
    err.error && err.error.details ? err.error.details : String(err.stack);
  res.status(error_status_code).send({
    success: false,
    error: error,
  });
});

// Magic happens!
app.listen(port, () => {
  console.log(`Express server stared at ::${port}`);
});

module.exports.server = app;
module.exports.handler = serverless(app);
// <krafted.by.karshe />
