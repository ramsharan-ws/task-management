const { expect } = require("chai");
const { InsertRow, GetRow, GetRows } = require("../utils/sql-query");
const { TEST_RANDOM_TABLE_NAME } = require("./__data");

describe("runtime checks", function () {
  it("not allowed non_existent table insert", function (done) {
    InsertRow(TEST_RANDOM_TABLE_NAME, {
      id: String(new Date()),
    })
      .then((res) => {})
      .catch((err) => {
        expect(String(err)).to.contain(`does not exist`);
      })
      .finally(() => {
        done();
      });
  });

  it("not allowed non_existent row fetch", function (done) {
    GetRow(TEST_RANDOM_TABLE_NAME, {
      id: String(new Date()),
    })
      .then((res) => {})
      .catch((err) => {
        expect(String(err)).to.contain(`does not exist`);
      })
      .finally(() => {
        done();
      });
  });

  it("not allowed non_existent rows fetch", function (done) {
    GetRows(TEST_RANDOM_TABLE_NAME, {
      id: String(new Date()),
    })
      .then((res) => {})
      .catch((err) => {
        expect(String(err)).to.contain(`does not exist`);
      })
      .finally(() => {
        done();
      });
  });
});
