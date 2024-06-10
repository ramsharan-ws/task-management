const TEST_AUTH_PARAMS = {
  email: "admin@tvsscs.com",
  password: "9rWEqgdhAD",
};

const TEST_BAD_AUTH_PARAMS = {
  email: "invalid_email@tvsscs.com",
  password: "invalid_password",
};

const TEST_AUTH_INACTIVE_USER_UUID = `98e434ec-3a71-4caf-8f81-f414f2357c84`;

const TEST_WRONG_AUTH_JWT_TOKEN = `____`;

const TEST_CREATE_USER_PARAMS = {
  customer_code: "C001",
  user_code: "U001",
  name: "Kishor Kumar Sahu",
  email: "email@domain.com",
  mobile_number: "9999999990",
  is_master: true,
  roles: [
    "ORDERS.VIEW",
    "TICKETS.VIEW",
    "TICKETS.CREATE",
    "INVOICES.VIEW",
    "ORG.MANAGE",
  ],
};

const TEST_BOGUS_UUID = `de8e0713-2c47-46e2-a22b-e0d429c89105`;
const TEST_RANDOM_TABLE_NAME = `non_existing_table`;

const TEST_CREATE_CUSTOMER_PARAMS = {
  customer_code: "C1002",
  name: "John Deere",
};

const TEST_CREATE_PART_PARAMS = {
  name: "C1200",
  description: "Trimmers and Brushcutters",
};

module.exports = {
  TEST_AUTH_PARAMS,
  TEST_AUTH_INACTIVE_USER_UUID,
  TEST_WRONG_AUTH_JWT_TOKEN,
  TEST_CREATE_USER_PARAMS,
  TEST_BOGUS_UUID,
  TEST_RANDOM_TABLE_NAME,
  TEST_CREATE_CUSTOMER_PARAMS,
  TEST_CREATE_PART_PARAMS,
};
