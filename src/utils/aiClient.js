const axios = require("axios");

const ai = axios.create({
  baseURL: process.env.AI_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

module.exports = ai;