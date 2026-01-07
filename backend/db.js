import pg from "pg";

export const pool = new pg.Pool({
  host: "localhost",
  user: "postgres",
  password: "1234",
  database: "school_db",
  port: 5432
});
