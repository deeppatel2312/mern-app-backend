const mongoose = require("mongoose");

const JobIdCounter = mongoose.model(
    "JobIdCounter",
    new mongoose.Schema({
        jobId: Number
    }),
    "jobIdCounter"
);

module.exports = JobIdCounter;
