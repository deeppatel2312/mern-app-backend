const mongoose = require("mongoose");

const StaticPage = mongoose.model(
    "StaticPage",
    new mongoose.Schema({
        title: String,
        content: Array,
        createdAt: String,
        updatedAt: String,
        slug: String,
    }, {
        timestamps: true // This will add 'createdAt' and 'updatedAt' fields

    })
);

module.exports = StaticPage;
