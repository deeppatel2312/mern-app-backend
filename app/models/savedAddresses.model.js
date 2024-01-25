const mongoose = require("mongoose");

const SavedAddresses = mongoose.model(
  "SavedAddresses",
  new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference the User model
    },
    type: String,
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    loc: {},
  }),
  "savedAddresses"
);

module.exports = SavedAddresses;
