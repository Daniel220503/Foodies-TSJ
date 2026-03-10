const express = require("express");
const pool = require("./config/db");

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Foodies API running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API funcionando" });
});

pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected:", result.rows);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});