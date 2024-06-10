const { expect } = require("chai");
const supertest = require("supertest");

const handler = require("../index");
const app = supertest(handler.server);

const { GenerateAccessToken } = require("../utils/jwt-generate");

const {
  TEST_AUTH_PARAMS,
  TEST_WRONG_AUTH_JWT_TOKEN,
  TEST_CREATE_USER_PARAMS,
  TEST_BOGUS_UUID,
  TEST_AUTH_INACTIVE_USER_UUID,
  TEST_CREATE_CUSTOMER_PARAMS,
  TEST_CREATE_PART_PARAMS,
} = require("./__data");

let SESSION_ACCESS_TOKEN;
let SESSION_CREATED_USER_UUID;
let SESSION_CREATED_CUSTOMER_UUID;
let SESSION_CREATED_PART_UUID;

describe("login", function () {
  it("get user access_token", function (done) {
    app
      .post("/login")
      .send(TEST_AUTH_PARAMS)
      .then((res) => {
        SESSION_ACCESS_TOKEN = `Bearer ${res.body.user.access_token}`;
        done();
      });
  });
});

describe("not allowed login", function () {
  it("not allowed in_active user", function (done) {
    GenerateAccessToken({
      uuid: TEST_AUTH_INACTIVE_USER_UUID,
    }).then((INACTIVE_USER_TOKEN) => {
      app
        .post("/v1")
        .set("Authorization", `Bearer ${INACTIVE_USER_TOKEN}`)
        .expect(401, done);
    });
  });
});

describe("dashboard", function () {
  it("no access without access_token", function (done) {
    app.post("/v1").expect(401, done);
  });

  it("no access with malform/wrong access_token", function (done) {
    app
      .post("/v1")
      .set("Authorization", TEST_WRONG_AUTH_JWT_TOKEN)
      .expect(401, done);
  });

  it("access dashboard with valid access_token", function (done) {
    app
      .post("/v1")
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(200, done);
  });
});

describe("users", function () {
  it("get users", function (done) {
    app
      .post("/v1/users")
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(200, done);
  });

  it("create user", function (done) {
    app
      .post("/v1/users/create")
      .send(TEST_CREATE_USER_PARAMS)
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .then((res) => {
        SESSION_CREATED_USER_UUID = res.body.uuid;
        expect(res.statusCode).to.equal(200);
      })
      .catch((err) => {
        expect(err.statusCode).to.equal(422);
      })
      .finally(() => {
        done();
      });
  });

  it("don't allow duplicate user", function (done) {
    app
      .post("/v1/users/create")
      .send(TEST_CREATE_USER_PARAMS)
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });

  it("view user", function (done) {
    app
      .post("/v1/users/view")
      .send({
        id: SESSION_CREATED_USER_UUID,
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .then((res) => {
        expect(res.statusCode).to.equal(200);
      })
      .catch((err) => {
        expect(err.statusCode).to.equal(422);
      })
      .finally(() => {
        done();
      });
  });

  it("no user without uuid", function (done) {
    app
      .post("/v1/users/view")
      .send({
        id: "",
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });

  it("no user with wrong uuid", function (done) {
    app
      .post("/v1/users/view")
      .send({
        id: TEST_BOGUS_UUID,
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });
});

describe("customers", function () {
  it("get customers", function (done) {
    app
      .post("/v1/customers")
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(200, done);
  });

  it("create customer", function (done) {
    app
      .post("/v1/customers/create")
      .send(TEST_CREATE_CUSTOMER_PARAMS)
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .then((res) => {
        SESSION_CREATED_CUSTOMER_UUID = res.body.uuid;
        expect(res.statusCode).to.equal(200);
      })
      .catch((err) => {
        expect(err.statusCode).to.equal(422);
      })
      .finally(() => {
        done();
      });
  });

  it("don't allow duplicate customer", function (done) {
    app
      .post("/v1/customers/create")
      .send(TEST_CREATE_CUSTOMER_PARAMS)
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });

  it("view customer", function (done) {
    app
      .post("/v1/customers/view")
      .send({
        id: SESSION_CREATED_CUSTOMER_UUID,
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .then((res) => {
        expect(res.statusCode).to.equal(200);
      })
      .catch((err) => {
        expect(err.statusCode).to.equal(422);
      })
      .finally(() => {
        done();
      });
  });

  it("no customer without uuid", function (done) {
    app
      .post("/v1/customers/view")
      .send({
        id: "",
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });

  it("no customer with wrong uuid", function (done) {
    app
      .post("/v1/customers/view")
      .send({
        id: TEST_BOGUS_UUID,
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });
});

describe("parts", function () {
  it("get parts", function (done) {
    app
      .post("/v1/parts")
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(200, done);
  });

  it("create part", function (done) {
    app
      .post("/v1/parts/create")
      .send(TEST_CREATE_PART_PARAMS)
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .then((res) => {
        SESSION_CREATED_PART_UUID = res.body.uuid;
        expect(res.statusCode).to.equal(200);
      })
      .catch((err) => {
        expect(err.statusCode).to.equal(422);
      })
      .finally(() => {
        done();
      });
  });

  it("don't allow duplicate part", function (done) {
    app
      .post("/v1/parts/create")
      .send(TEST_CREATE_PART_PARAMS)
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });

  it("view part", function (done) {
    app
      .post("/v1/parts/view")
      .send({
        id: SESSION_CREATED_PART_UUID,
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .then((res) => {
        expect(res.statusCode).to.equal(200);
      })
      .catch((err) => {
        expect(err.statusCode).to.equal(422);
      })
      .finally(() => {
        done();
      });
  });

  it("no part without uuid", function (done) {
    app
      .post("/v1/parts/view")
      .send({
        id: "",
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });

  it("no part with wrong uuid", function (done) {
    app
      .post("/v1/parts/view")
      .send({
        id: TEST_BOGUS_UUID,
      })
      .set("Authorization", SESSION_ACCESS_TOKEN)
      .expect(422, done);
  });
});
