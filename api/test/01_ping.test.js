const supertest = require("supertest");
const handler = require("../index");
const app = supertest(handler.server);

describe("ping", function () {
  it("server is up", function (done) {
    app.get("/").expect(200, done);
  });

  it("not-found routes on server", function (done) {
    app.get("/404").expect(404, done);
    app.post("/404").expect(404, done);
  });
});
