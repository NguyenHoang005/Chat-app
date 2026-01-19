const Message = require("../models/Message");

module.exports = async function saveMessage(doc) {
  return await Message.create(doc);
};
