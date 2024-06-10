const SendRejectedResponse = async (response, body, status = 422) => {
  body["success"] = false;
  return response.status(422).send(body);
};

module.exports = {
  SendRejectedResponse,
};
