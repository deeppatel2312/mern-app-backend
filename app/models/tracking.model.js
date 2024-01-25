const mongoose = require("mongoose");

const tracking = mongoose.model(
    "tracking",
    new mongoose.Schema({
        /* Each of these statuses the time that it was changed to.
            e.g., the tracking status changd to otw at 2023-11-08T06:41:12.245Z so this key stores 2023-11-08T06:41:12.245Z
        */

        jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
        otw: String,
        inTransit: String,
        delivered: String
    }, {
        timestamps: true // This will add 'createdAt' and 'updatedAt' fields
    }),
    "tracking"
);

module.exports = tracking;

/*
On the way
In Transit
Delivered
*/