const { Pool } = require("pg");

const pool = new Pool({
  host: "postgres",
  user: "postgres",
  password: "123456",
  database: "tsj_foodies",
  port: 5432
});


module.exports = pool;