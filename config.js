const fs = require("fs");
const path = require("path");

// Load .env file if exists
if (fs.existsSync(path.resolve(__dirname, "config.env"))) {
    require("dotenv").config({ path: path.resolve(__dirname, "config.env") });
}

// Helper to convert environment variables to boolean
function convertToBool(text, fault = "true") {
    return text === fault ? true : false;
}

module.exports = {
    // WhatsApp session ID (use your own or leave default for testing)
    SESSION_ID: process.env.SESSION_ID || "VJlF0aJY#h4AAooYvk8TB64OFoArLG1NMslNM1T2dof7q9C6EmxA",

    // MongoDB connection string
    // Replace with your own MongoDB Atlas / local URI if needed
    MONGODB: process.env.MONGODB || "mongodb://mongo:uzaMYfqPOkXPmgoWOjmEKMwYNWtrKqcC@caboose.proxy.rlwy.net:27161",

    // Owner number (for bot admin features)
    OWNER_NUM: process.env.OWNER_NUM || "94784525290",

    // Optional: enable debug mode
    DEBUG: convertToBool(process.env.DEBUG, "true"),
};
