const supertest = require("supertest");
const handler = require("../index");
const app = supertest(handler.server);

describe("login checks", function () {
  it("login", function (done) {
    app.post("/login").send(TEST_AUTH_PARAMS).expect(200, done);
  });

  it("forbidden for wrong credentials", function (done) {
    // Wrong credentials
    app.post("/login").send(TEST_BAD_AUTH_PARAMS).expect(403, done);
  });

  it("check login payload validations", function (done) {
    // Invalid email
    app
      .post("/login")
      .send({
        email: "look_its_not_an_email_address",
        password: "like_the_legend_of_the_phoenix",
      })
      .expect(422);

    // Password short (less than 6 characters)
    app
      .post("/login")
      .send({
        email: "email@domain.com",
        password: "1",
      })
      .expect(422);

    // No/blank params
    app
      .post("/login")
      .send({
        email: "",
        password: "",
      })
      .expect(422, done);
  });
});
