const db = require("../models");
const Setting = db.setting;

const getAllSettings = async () => {
    try {
        const settings = await Setting.findOne(); // because there's only one document

        return settings;
    } catch (error) {
        console.error("Error fetching settings:", error);
        throw error;
    }
};

module.exports = getAllSettings;