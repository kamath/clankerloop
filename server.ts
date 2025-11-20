import app from "./src/api/index.js";

const port = parseInt(process.env.PORT || "3000", 10);

console.log(`Starting AI LeetCode Generator API on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
