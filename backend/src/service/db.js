const { Pool } = require("pg")

const pool = new Pool({
  host: "postgres",
  user: "postgres",
  password: "postgres",
  database: "foodies",
  port: 5432
})

module.exports = pool