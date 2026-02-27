const express = require("express");
const router = express.Router();
const db = require("../database");
const { v4: uuidv4 } = require("uuid");

// GET ALL TASKS
router.get("/", (req, res) => {
    const sql = "SELECT * FROM tasks";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// CREATE TASK
router.post("/", (req, res) => {
    const {
        title,
        assignee,
        dueDate,
        priority,
        status,
        category,
        description,
    } = req.body;

    const id = uuidv4();

    const sql = `
        INSERT INTO tasks 
        (id, title, assignee, dueDate, priority, status, category, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [id, title, assignee, dueDate, priority, status, category, description],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ id, ...req.body });
        }
    );
});

// UPDATE STATUS
router.put("/:id", (req, res) => {
    const { status } = req.body;

    const sql = "UPDATE tasks SET status = ? WHERE id = ?";

    db.run(sql, [status, req.params.id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }

        res.json({ updated: this.changes });
    });
});

module.exports = router;