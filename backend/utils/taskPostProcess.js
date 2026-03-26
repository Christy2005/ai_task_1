import pool from "../database.js";
import { createLogger } from "./logger.js";

const logger = createLogger("taskPostProcess");

// ─── Clean AI JSON output ────────────────────────────────────────────────────
// Strips markdown fences, trailing commas, and other common Gemini artifacts.
export function cleanAIJson(raw) {
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  return cleaned;
}

// ─── Parse AI response into task array ───────────────────────────────────────
export function parseAITasks(rawText) {
  const cleaned = cleanAIJson(rawText);
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ─── Convert relative dates to ISO format ────────────────────────────────────
// Handles: "today", "tomorrow", "next monday", "2 days", "in 3 days",
//          "next week", "end of week", already-formatted YYYY-MM-DD
export function resolveDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;

  const input = dateStr.trim().toLowerCase();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    return input.slice(0, 10);
  }

  const now = new Date();

  if (input === "today") {
    return formatDate(now);
  }

  if (input === "tomorrow") {
    return formatDate(addDays(now, 1));
  }

  // "in X days", "X days", "2 days from now"
  const daysMatch = input.match(/(\d+)\s*days?/);
  if (daysMatch) {
    return formatDate(addDays(now, parseInt(daysMatch[1], 10)));
  }

  // "in X weeks", "X weeks"
  const weeksMatch = input.match(/(\d+)\s*weeks?/);
  if (weeksMatch) {
    return formatDate(addDays(now, parseInt(weeksMatch[1], 10) * 7));
  }

  // "next week"
  if (input.includes("next week")) {
    return formatDate(addDays(now, 7));
  }

  // "end of week" (Friday)
  if (input.includes("end of week") || input.includes("end of the week")) {
    const day = now.getDay();
    const daysToFriday = day <= 5 ? 5 - day : 5 + (7 - day);
    return formatDate(addDays(now, daysToFriday));
  }

  // "next <dayname>"
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextDayMatch = input.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (nextDayMatch) {
    const targetDay = dayNames.indexOf(nextDayMatch[1]);
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    return formatDate(addDays(now, diff));
  }

  // Fallback — return as-is if it looks like a date, else null
  const fallbackDate = new Date(dateStr);
  if (!isNaN(fallbackDate.getTime())) {
    return formatDate(fallbackDate);
  }

  return null;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// ─── Verb connectors that mark an assignment in natural speech ────────────────
// Capture group 1 → name(s),  group 2 → task description
const CONNECTORS = [
  /^(.+?)\s+should\s+(.+)$/i,
  /^(.+?)\s+will\s+(.+)$/i,
  /^(.+?)\s+must\s+(.+)$/i,
  /^(.+?)\s+shall\s+(.+)$/i,
  /^(.+?)\s+needs?\s+to\s+(.+)$/i,
  /^(.+?)\s+has\s+to\s+(.+)$/i,
  /^(.+?)\s+is\s+going\s+to\s+(.+)$/i,
  /^(.+?)\s+is\s+to\s+(.+)$/i,
  /^(.+?)\s+is\s+responsible\s+for\s+(.+)$/i,
  /^(.+?)\s+is\s+tasked\s+with\s+(.+)$/i,
  /^(.+?)\s*:\s*(.+)$/,           // "Benita: submit tutorial"
];

// Generic non-person words that may appear before a verb
const NOT_A_NAME =
  /^(everyone|all|we|they|team|it|this|that|the|a|an|each|every|nobody|somebody|anyone|someone|please|also|action|task|item|note|management|faculty|department|committee|board|staff|students|he|she|i|you)$/i;

// Honorifics that prefix real names
const HONORIFIC_RE = /^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?|Sir)\s+/i;

// Strip honorifics, possessives, and surrounding punctuation from a raw name token
function cleanPersonName(raw) {
  let name = raw.trim();
  name = name.replace(/'s$/i, "");           // possessive: "Benita's" → "Benita"
  name = name.replace(HONORIFIC_RE, "");     // "Dr. Smith" → "Smith"
  name = name.replace(/^[,.\s]+|[,.\s]+$/g, ""); // trim punctuation edges
  return name.trim();
}

function looksLikeName(str) {
  const s = str.trim();
  if (!s || s.length < 2 || s.length > 40) return false;
  if (NOT_A_NAME.test(s)) return false;
  // Only allow purely alphabetic characters (no digits, punctuation, etc.)
  if (!/^[A-Za-z]+$/.test(s)) return false;
  // Must start with uppercase (after stripping any honorific)
  return /^[A-Z]/.test(s.replace(HONORIFIC_RE, ""));
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Filler phrases that precede the real subject ────────────────────────────
const LEADING_FILLERS =
  /^(?:first\s+of\s+all|second(?:ly)?|third(?:ly)?|also|additionally|furthermore|moreover|next|then|finally|lastly|and|so|now|well|okay|right|please\s+note|note\s+that|importantly|as\s+discussed|as\s+mentioned)[,\s]+/i;

function stripLeadingFillers(sentence) {
  return sentence.replace(LEADING_FILLERS, "").trim();
}

// ─── Connector-verb detector (used for compound-sentence splitting) ───────────
const CONNECTOR_VERB_RE =
  /\b(will|should|must|shall|needs?\s+to|has\s+to|is\s+going\s+to)\b/i;

// ─── Split compound assignments within one sentence ───────────────────────────
// "A, B will do X, and C, D will do Y"
//   → ["A, B will do X", "C, D will do Y"]
// Only promotes a part to its own clause when it contains a connector verb;
// otherwise re-attaches it to the previous part so "do X and Y" stays whole.
function splitCompoundAssignments(sentence) {
  // Split at ", and <Capital>" or " and <Capital>" boundaries
  const parts = sentence.split(/\s*,?\s+and\s+(?=[A-Z])/);
  if (parts.length === 1) return [sentence];

  const clauses = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    if (CONNECTOR_VERB_RE.test(parts[i])) {
      clauses.push(parts[i]);          // new assignment clause
    } else {
      clauses[clauses.length - 1] += " and " + parts[i]; // continuation of task
    }
  }
  return clauses;
}

// ─── Extract tasks from raw transcript (no AI) ────────────────────────────────
// Pipeline:
//   sentence → strip leading fillers → split compound assignments
//   → for each clause: match CONNECTOR → extract names + task
//   → one task object per name: { title, assigned_to }
//
// Examples:
//   "Benita should submit her tutorial"
//     → { assigned_to: "Benita", title: "Submit her tutorial" }
//   "Mandu, Aditya will do laundry, and Devo will clean the kitchen"
//     → { assigned_to: "Mandu",  title: "Do laundry" }
//     → { assigned_to: "Aditya", title: "Do laundry" }
//     → { assigned_to: "Devo",   title: "Clean the kitchen" }
export function extractTasksFromTranscript(transcript) {
  if (!transcript || !transcript.trim()) return [];

  const sentences = transcript
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const tasks = [];

  for (const sentence of sentences) {
    // 1. Strip leading filler words ("And", "Also", "First of all", …)
    const stripped = stripLeadingFillers(sentence);

    // 2. Split compound assignments ("A will do X, and B will do Y")
    const clauses = splitCompoundAssignments(stripped);

    for (const clause of clauses) {
      for (const pattern of CONNECTORS) {
        const match = clause.match(pattern);
        if (!match) continue;

        const rawNames = match[1].trim();
        const taskPart = match[2].trim();
        if (!taskPart || taskPart.length < 3) continue;

        // 3. Split compound name groups and validate each name
        const names = splitNames(rawNames)
          .map(cleanPersonName)
          .filter(looksLikeName); // alphabetic-only, starts uppercase, not a common word

        if (names.length === 0) continue;

        // 4. One task per name, same task content
        for (const name of names) {
          tasks.push({
            title: capitalize(taskPart),
            assigned_to: name,
            dueDate: "",
            priority: "Medium",
            description: clause,
          });
        }

        break; // First matching CONNECTOR wins for this clause
      }
    }
  }

  return tasks;
}

// ─── Split multiple names into separate tasks ────────────────────────────────
// "Dr. Smith and Dr. Jones" → two tasks, one per name
// "Alice, Bob, Charlie" → three tasks
export function splitTasksByAssignee(tasks) {
  const result = [];

  for (const task of tasks) {
    const assignee = task.assignee || task.assigned_to || "";
    const names = splitNames(assignee);

    if (names.length <= 1) {
      result.push(task);
    } else {
      for (const name of names) {
        result.push({ ...task, assignee: name.trim(), assigned_to: name.trim() });
      }
    }
  }

  return result;
}

function splitNames(nameStr) {
  if (!nameStr || nameStr.trim() === "") return [nameStr];

  // Split on "and", "&", commas — then filter residual "and"/"&" tokens
  const parts = nameStr
    .split(/\s*(?:,|\band\b|&)\s*/i)
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && !/^(and|&)$/i.test(n));

  return parts.length > 0 ? parts : [nameStr];
}

// ─── Match name against registered faculty in DB ─────────────────────────────
export async function matchFaculty(nameOrEmail) {
  if (!nameOrEmail) return null;

  const term = nameOrEmail.trim().toLowerCase();

  // Exact match on email or name
  const exact = await pool.query(
    `SELECT id, name, email, role FROM users
     WHERE role IN ('faculty', 'hod')
       AND (LOWER(email) = $1 OR LOWER(name) = $1)
     LIMIT 1`,
    [term]
  );

  if (exact.rows.length > 0) return exact.rows[0];

  // Fuzzy: partial name match (first name or last name)
  const fuzzy = await pool.query(
    `SELECT id, name, email, role FROM users
     WHERE role IN ('faculty', 'hod')
       AND (LOWER(name) LIKE $1 OR LOWER(name) LIKE $2)
     LIMIT 1`,
    [`${term}%`, `% ${term}%`]
  );

  return fuzzy.rows.length > 0 ? fuzzy.rows[0] : null;
}

// ─── Create notification for unregistered faculty ────────────────────────────
export async function createUnregisteredNotification(name, meetingId) {
  try {
    await pool.query(
      `INSERT INTO notifications (type, title, message, target_role, meeting_id)
       VALUES ('warning', $1, $2, 'admin', $3)`,
      [
        `Faculty not registered: ${name}`,
        `The name "${name}" was mentioned in a meeting but does not match any registered faculty member. Please register this user or manually assign the task.`,
        meetingId || null,
      ]
    );
    logger.info(`Notification created: unregistered faculty "${name}"`);
  } catch (err) {
    logger.error("Failed to create notification:", err.message);
  }
}

// ─── Validate a single task object ───────────────────────────────────────────
export function validateTask(task) {
  const errors = [];

  if (!task.title || task.title.trim() === "") {
    errors.push("title is required");
  }

  if (task.priority && !["Low", "Medium", "High"].includes(task.priority)) {
    errors.push(`invalid priority: ${task.priority}`);
  }

  if (task.dueDate && task.dueDate !== "" && isNaN(new Date(task.dueDate).getTime())) {
    errors.push(`invalid date: ${task.dueDate}`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Full post-processing pipeline ──────────────────────────────────────────
// Takes raw AI tasks array, returns cleaned + split + date-resolved tasks
// with matched user_ids and generated notifications for unknowns.
export async function postProcessTasks(rawTasks, meetingId) {
  // 1. Split multi-assignee tasks
  let tasks = splitTasksByAssignee(rawTasks);

  // 2. Normalize each task
  const processed = [];

  // Placeholder names that should be treated as no assignee
  const EMPTY_ASSIGNEE = /^(unassigned|n\/a|none|tbd|unknown|-)$/i;

  // Leading conjunctions/fillers that Gemini sometimes prepends to names
  const ASSIGNEE_FILLER_PREFIX = /^(?:and|also|additionally|then|next|finally|so|now)\s+/i;

  for (const task of tasks) {
    const title = task.title || task.name || "Untitled Task";
    const description = task.description || task.details || null;
    const priority = normalizePriority(task.priority);
    const dueDate = resolveDate(task.dueDate || task.due_date || task.deadline || "");
    const rawAssignee = (task.assignee || task.assigned_to || "").trim();
    // Strip leading filler words (e.g. "And Christy" → "Christy")
    const strippedAssignee = rawAssignee.replace(ASSIGNEE_FILLER_PREFIX, "").trim();
    const assigneeName = EMPTY_ASSIGNEE.test(strippedAssignee) ? "" : strippedAssignee;

    // 3. Match against DB
    let userId = null;
    let matchedName = assigneeName;
    let isRegistered = false;

    if (assigneeName) {
      const match = await matchFaculty(assigneeName);
      if (match) {
        userId = match.id;
        matchedName = match.name;
        isRegistered = true;
      } else {
        // 4. Create notification for unregistered name
        await createUnregisteredNotification(assigneeName, meetingId);
      }
    }

    // 5. Validate
    const { valid, errors } = validateTask({ title, priority, dueDate });
    if (!valid) {
      logger.warn(`Task validation issues for "${title}":`, errors);
    }

    processed.push({
      title,
      description,
      priority,
      due_date: dueDate,
      assignee_name: matchedName,
      user_id: userId,
      is_registered: isRegistered,
    });
  }

  return processed;
}

function normalizePriority(val) {
  if (!val) return "Medium";
  const map = { low: "Low", medium: "Medium", high: "High" };
  return map[val.toLowerCase()] || "Medium";
}
