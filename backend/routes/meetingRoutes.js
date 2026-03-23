import express from "express";
import pool from "../database.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =============================
   GET all meetings
============================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM meetings ORDER BY created_at DESC`
    );

    console.log("📋 Meetings fetched:", result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching meetings:", err.message);
    res.status(500).json({
      error: "Failed to fetch meetings",
      details: err.message,
    });
  }
});

/* =============================
   DELETE meeting minutes
   DELETE /api/meetings/:id
============================= */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const meetingId = req.params.id;

    // Check if meeting exists
    const meetingCheck = await pool.query(
      "SELECT * FROM meetings WHERE id = $1",
      [meetingId]
    );

    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // OPTIONAL: Restrict deletion (uncomment if needed)
    // if (
    //   meetingCheck.rows[0].created_by !== req.user.id &&
    //   req.user.role !== "admin"
    // ) {
    //   return res.status(403).json({ error: "Not authorized to delete this meeting" });
    // }

    await pool.query("DELETE FROM meetings WHERE id = $1", [meetingId]);

    console.log(`🗑️ Deleted meeting ID: ${meetingId}`);

    res.json({ message: "Meeting minutes deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting meeting:", err.message);
    res.status(500).json({
      error: "Failed to delete meeting",
      details: err.message,
    });
  }
});

/* =============================
   DEBUG: Check table info
============================= */
router.get("/debug/table-info", verifyToken, async (req, res) => {
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'meetings'
      );
    `);

    const exists = tableExists.rows[0].exists;

    if (!exists) {
      return res.json({
        status: "error",
        message: "meetings table does not exist",
        hint: "Run migration: npm run migrate or node runMigration.js",
      });
    }

    // Get schema
    const schema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'meetings'
      ORDER BY ordinal_position;
    `);

    // Get row count
    const count = await pool.query(`SELECT COUNT(*) as count FROM meetings;`);

    res.json({
      status: "ok",
      tableExists: true,
      rowCount: parseInt(count.rows[0].count),
      schema: schema.rows,
    });
  } catch (err) {
    console.error("❌ Debug error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;