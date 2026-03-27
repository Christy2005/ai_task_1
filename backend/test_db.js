import "./env.js";
import pool from "./database.js";

async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('users', 'tasks', 'meetings') 
      AND column_name IN ('id', 'user_id', 'created_by')
    `);
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
