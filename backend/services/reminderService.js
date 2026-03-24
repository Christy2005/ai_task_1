import cron from "node-cron";
import pool from "../database.js";

// Initialize the reminder scheduled task
export const initReminderCron = () => {
  // Run every hour on the hour (e.g., 1:00, 2:00, etc.)
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

      // Fetch all calendar events happening in the strictly next 1 hour
      const { rows } = await pool.query(
        `SELECT title, event_date 
         FROM calendar_events 
         WHERE event_date > $1 AND event_date <= $2`,
        [now, nextHour]
      );

      // Log reminders
      for (const event of rows) {
        console.log(`Reminder: You have an upcoming task - ${event.title} at ${event.event_date}`);
      }
    } catch (error) {
      console.error("Failed to run reminder cron job:", error.message);
    }
  });

  console.log("⏰ Reminder cron service initialized.");
};
