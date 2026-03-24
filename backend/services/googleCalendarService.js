import { google } from "googleapis";

// In a real application, these credentials would come from your environment 
// variables and the user's OAuth flow. For now, we are using defaults/placeholders.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Hardcoded token for testing (Replace with a valid token retrieved via OAuth2)
const HARDCODED_ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN || "YOUR_HARDCODED_ACCESS_TOKEN";

// Set credentials
oauth2Client.setCredentials({
  access_token: HARDCODED_ACCESS_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

/**
 * Creates an event in the user's primary Google Calendar.
 * 
 * @param {string} title - The title of the event.
 * @param {string} description - The description of the event.
 * @param {Date|string} date - The date/time of the event.
 */
export const createGoogleCalendarEvent = async (title, description, date) => {
  try {
    const eventStartTime = new Date(date);
    
    // Defaulting to a 1-hour event duration for simplicity
    const eventEndTime = new Date(eventStartTime.getTime() + 60 * 60 * 1000);

    const event = {
      summary: title,
      description: description,
      // Date components
      start: {
        dateTime: eventStartTime.toISOString(),
        timeZone: "UTC", // Update to appropriate user timezone when needed
      },
      end: {
        dateTime: eventEndTime.toISOString(),
        timeZone: "UTC",
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary", // Inserts into the authenticated user's primary calendar
      requestBody: event,
    });

    console.log("✅ Google Calendar event created: ", response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating Google Calendar event:", error.message);
    throw error;
  }
};
