const mongoose = require("mongoose");

const Service = mongoose.model(
  "Service",
  new mongoose.Schema({
    name: String,
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service"
    },
    description: [String],
    image: String,
    isActive: Boolean,
    jobType: String,
    color: String,
    createdAt: String,
    updatedAt: String,
  }),
  "services"
);

module.exports = Service;
