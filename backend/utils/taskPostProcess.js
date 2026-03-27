import pool from "../database.js";
import { createLogger } from "./logger.js";

const logger = createLogger("taskPostProcess");

// ─── Clean AI JSON output ────────────────────────────────────────────────────
// Strips markdown fences, trailing commas, and other common Gemini artifacts.
export function cleanAIJson(raw) {
  let cleaned = raw.trim();

  // Remove markdown fences (```json ... ``` or ``` ... ```)
  // Handle fences that may appear anywhere, not just start/end
  cleaned = cleaned.replace(/```json\s*/gi, "");
  cleaned = cleaned.replace(/```\s*/gi, "");

  // Remove any leading text before the first [ or {
  const firstBracket = cleaned.search(/[\[{]/);
  if (firstBracket > 0) {
    cleaned = cleaned.slice(firstBracket);
  }

  // Remove any trailing text after the last ] or }
  const lastBracket = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (lastBracket >= 0 && lastBracket < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastBracket + 1);
  }

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  // Remove single-line JS comments (// ...)
  cleaned = cleaned.replace(/\/\/[^\n]*/g, "");

  return cleaned.trim();
}

// ─── Parse AI response into task array ───────────────────────────────────────
export function parseAITasks(rawText) {
  const cleaned = cleanAIJson(rawText);
  let parsed;

  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to fix common JSON issues: single quotes, unquoted keys
    const patched = cleaned
      .replace(/'/g, '"')
      .replace(/(\w+)\s*:/g, '"$1":');
    parsed = JSON.parse(patched); // let this throw if it still fails
  }

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") return [parsed];
  throw new Error("Gemini returned non-object JSON");
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
  /^(.+?)\s+would\s+(.+)$/i,
  /^(.+?)\s+must\s+(.+)$/i,
  /^(.+?)\s+shall\s+(.+)$/i,
  /^(.+?)\s+needs?\s+to\s+(.+)$/i,
  /^(.+?)\s+has\s+to\s+(.+)$/i,
  /^(.+?)\s+have\s+to\s+(.+)$/i,
  /^(.+?)\s+is\s+going\s+to\s+(.+)$/i,
  /^(.+?)\s+is\s+to\s+(.+)$/i,
  /^(.+?)\s+is\s+responsible\s+for\s+(.+)$/i,
  /^(.+?)\s+is\s+tasked\s+with\s+(.+)$/i,
  /^(.+?)\s+can\s+(.+)$/i,
  /^(.+?)\s*:\s*(.+)$/,           // "Benita: submit tutorial"
];

// ─── Indirect assignment patterns ────────────────────────────────────────────
// "I'll ask Hardik to submit the report"  → assignee: Hardik, task: submit the report
// "We need to tell Monica to prepare"     → assignee: Monica, task: prepare
// "Let's get Devu to handle this"         → assignee: Devu,   task: handle this
const INDIRECT_PATTERNS = [
  /\b(?:ask|tell|get|have|let|remind|assign|request|want)\s+([A-Z][a-z]+)\s+to\s+(.+)$/i,
  /\b(?:ask|tell|get|have|let|remind|assign|request|want)\s+([A-Z][a-z]+)\s+(?:if\s+(?:he|she|they)\s+can\s+)(.+)$/i,
];

// Generic non-person words that may appear before a verb
const NOT_A_NAME =
  /^(everyone|all|we|they|team|it|this|that|the|a|an|each|every|nobody|somebody|anyone|someone|please|also|action|task|item|note|management|faculty|department|committee|board|staff|students|he|she|i|you|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|unassigned)$/i;

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
  /^(?:first\s+of\s+all|first|second(?:ly)?|third(?:ly)?|also|additionally|furthermore|moreover|next|then|finally|lastly|and|so|now|well|okay|ok|yeah|yes|yep|sure|right|alright|basically|actually|obviously|clearly|i\s+think|i\s+guess|i\s+mean|you\s+know|like|please\s+note|note\s+that|importantly|as\s+discussed|as\s+mentioned)[,\s]+/i;

function stripLeadingFillers(sentence) {
  // Apply repeatedly — transcripts can stack fillers: "Okay so yeah Christy should..."
  let prev;
  let result = sentence;
  do {
    prev = result;
    result = result.replace(LEADING_FILLERS, "").trim();
  } while (result !== prev);
  return result;
}

// ─── Connector-verb detector (used for compound-sentence splitting) ───────────
const CONNECTOR_VERB_RE =
  /\b(will|would|should|must|shall|needs?\s+to|has\s+to|have\s+to|is\s+going\s+to|can)\b/i;

// ─── Split compound assignments within one sentence ───────────────────────────
// "A will do X while B will do Y"         → ["A will do X", "B will do Y"]
// "A, B will do X, and C, D will do Y"    → ["A, B will do X", "C, D will do Y"]
// "A will do X then B should do Y"        → ["A will do X", "B should do Y"]
// Only promotes a part to its own clause when it contains a connector verb;
// otherwise re-attaches it to the previous part so "do X and Y" stays whole.
function splitCompoundAssignments(sentence) {
  // Split on connectors ("while", "and", "then", etc.) or bare commas
  // when followed by a capitalized word. "and then" is treated as a single
  // compound connector so "do X, and then I will ask" splits correctly.
  const parts = sentence.split(
    /\s*[,;]?\s+(?:while|whereas|and\s+then|and|then|also)\s+(?=[A-Z])|\s*,\s+(?=[A-Z][a-z]+\s+(?:will|would|should|must|shall|needs?\s+to|has\s+to|have\s+to|can)\s)/
  );
  if (parts.length === 1) return [sentence];

  // Rebuild clauses:
  //   - If a fragment has a connector verb, it's a standalone clause
  //   - If not (e.g. bare name "Mandu"), prepend it to the next clause as a
  //     comma-separated name list so splitNames() can handle it later
  const clauses = [];
  let namePrefix = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (CONNECTOR_VERB_RE.test(part)) {
      // Real clause — attach any accumulated name prefix
      if (namePrefix) {
        clauses.push(namePrefix + ", " + part);
        namePrefix = "";
      } else {
        clauses.push(part);
      }
    } else if (i < parts.length - 1) {
      // No verb — likely a name fragment, prepend to next clause
      namePrefix = namePrefix ? namePrefix + ", " + part : part;
    } else {
      // Last fragment, no verb — attach to previous clause
      if (clauses.length > 0) {
        clauses[clauses.length - 1] += " and " + part;
      } else {
        clauses.push(part);
      }
    }
  }

  // If only name prefixes were found (no verb clauses), return original
  if (clauses.length === 0) return [sentence];
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

  // Expand contractions first so "I'll" → "I will" matches all verb patterns
  const expanded = expandContractions(transcript);
  const sentences = splitTranscriptToSentences(expanded);
  const tasks = [];

  for (const sentence of sentences) {
    // 1. Strip leading filler words ("And", "Also", "Okay so yeah", …)
    const stripped = stripLeadingFillers(sentence);

    // 2. Split compound assignments ("A will do X, and B will do Y")
    const clauses = splitCompoundAssignments(stripped);

    for (const clause of clauses) {
      const result = extractSingleTask(clause);
      if (!result) continue;
      // extractSingleTask returns a single task or an array (multi-assignee)
      if (Array.isArray(result)) {
        tasks.push(...result);
      } else {
        tasks.push(result);
      }
    }
  }

  return tasks;
}

// ─── Expand common contractions ──────────────────────────────────────────────
// Deepgram transcripts are full of "I'll", "we'll", "they'll" which break
// every verb-pattern regex. Expand them before any splitting.
function expandContractions(text) {
  return text
    .replace(/\bI'll\b/gi,     "I will")
    .replace(/\bwe'll\b/gi,    "we will")
    .replace(/\byou'll\b/gi,   "you will")
    .replace(/\bthey'll\b/gi,  "they will")
    .replace(/\bhe'll\b/gi,    "he will")
    .replace(/\bshe'll\b/gi,   "she will")
    .replace(/\blet's\b/gi,    "let us")
    .replace(/\bwon't\b/gi,    "will not")
    .replace(/\bcan't\b/gi,    "cannot")
    .replace(/\bshouldn't\b/gi,"should not")
    .replace(/\bwouldn't\b/gi, "would not")
    .replace(/\bdon't\b/gi,    "do not")
    .replace(/\bdoesn't\b/gi,  "does not");
}

// ─── Split transcript into atomic sentences ──────────────────────────────────
// Deepgram's smart_format uses commas and minimal periods, so real transcripts
// often arrive as one long comma-separated string. The sentence splitter handles
// only hard boundaries (., !, ?, newlines) and connectors (while, then, etc.).
// Comma-based task splitting is handled later by splitCompoundAssignments()
// which has the context to distinguish "Mandu, Aditya will do X" (name list)
// from "Christy will do X, Aditya will do Y" (separate tasks).
function splitTranscriptToSentences(transcript) {
  // First pass: split on sentence terminators
  const roughSentences = transcript
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  // Second pass: split on semicolons and mid-sentence connectors when they
  // introduce a new clause with a connector verb
  const CLAUSE_SPLIT_RE =
    /\s*[;]\s*|\s+(?:while|whereas|then|also|okay|ok)\s+(?=\S+\s+(?:will|would|should|must|shall|needs?\s+to|has\s+to|have\s+to|is\s+going\s+to|can)\s)/i;

  const sentences = [];
  for (const s of roughSentences) {
    const subParts = s.split(CLAUSE_SPLIT_RE);
    for (const sub of subParts) {
      const trimmed = sub.trim();
      if (trimmed.length > 5) sentences.push(trimmed);
    }
  }

  return sentences;
}

// ─── Extract a single task from one clause ───────────────────────────────────
// Tries three strategies in order:
//   1. Indirect assignment: "I'll ask Hardik to submit the report"
//   2. Direct connector:    "Christy should submit the report"
//   3. Pronoun subject:     "We will do this" / "You should update attendance"
function extractSingleTask(clause) {
  // Strategy 1: Indirect assignment — "ask Hardik to submit"
  for (const pattern of INDIRECT_PATTERNS) {
    const match = clause.match(pattern);
    if (!match) continue;

    const name = cleanPersonName(match[1]);
    const taskPart = match[2].trim();
    if (!taskPart || taskPart.length < 3) continue;
    if (!looksLikeName(name)) continue;

    return {
      title: cleanTaskTitle(capitalize(taskPart)),
      assigned_to: name,
      dueDate: "",
      priority: "Medium",
      description: clause,
    };
  }

  // Strategy 2: Direct connector — "Christy should submit"
  // Try ALL connectors — don't stop at first regex match, because a later
  // connector may produce a valid name where an earlier one captured junk.
  // e.g. "Monica needs to prepare X, and yeah we should review Y"
  //   → "should" matches first but group1 is invalid
  //   → "needs to" matches second with valid group1 = "Monica"
  let bestMatch = null;

  for (const pattern of CONNECTORS) {
    const match = clause.match(pattern);
    if (!match) continue;

    const rawNames = match[1].trim();
    const taskPart = match[2].trim();
    if (!taskPart || taskPart.length < 3) continue;

    const names = splitNames(rawNames)
      .map(cleanPersonName)
      .filter(looksLikeName);

    if (names.length > 0) {
      // Pick the match with the shortest group1 (most specific name match)
      if (!bestMatch || rawNames.length < bestMatch.rawNames.length) {
        bestMatch = { names, taskPart, rawNames, clause };
      }
    }
  }

  if (bestMatch) {
    const results = [];
    let mainTitle = bestMatch.taskPart;

    // Check if the task part contains an embedded second clause joined by
    // ", and" / ", and then" / ", and yeah" etc. If the tail after the comma
    // contains a connector verb, split it out as a separate task.
    const tailSplitMatch = mainTitle.match(
      /^(.+?)\s*,\s+(?:and\s+(?:yeah\s+|also\s+|then\s+)?)?(\S+\s+(?:will|would|should|must|shall|needs?\s+to|has\s+to|have\s+to|can)\s+.+)$/i
    );
    if (tailSplitMatch) {
      mainTitle = tailSplitMatch[1];
      const tailClause = tailSplitMatch[2];
      // Recursively extract the tail as its own task
      const tailTask = extractSingleTask(stripLeadingFillers(tailClause));
      if (tailTask) {
        if (Array.isArray(tailTask)) results.push(...tailTask);
        else results.push(tailTask);
      }
    }

    for (const name of bestMatch.names) {
      results.push({
        title: cleanTaskTitle(capitalize(mainTitle)),
        assigned_to: name,
        dueDate: "",
        priority: "Medium",
        description: bestMatch.clause,
      });
    }
    return results;
  }

  // Strategy 3: Pronoun / generic subject — "We will do this", "You should update"
  for (const pattern of CONNECTORS) {
    const match = clause.match(pattern);
    if (!match) continue;

    const rawNames = match[1].trim();
    const taskPart = match[2].trim();
    if (!taskPart || taskPart.length < 3) continue;

    const subjectLower = rawNames.toLowerCase().trim();
    const isPronoun = /^(i|we|you|i will|we will|you will|let us|one|someone)$/i.test(subjectLower);
    const isGeneric = NOT_A_NAME.test(rawNames.trim());

    if (isPronoun || isGeneric) {
      const embeddedName = extractEmbeddedName(taskPart);
      return {
        title: cleanTaskTitle(capitalize(taskPart)),
        assigned_to: embeddedName || "Unassigned",
        dueDate: "",
        priority: "Medium",
        description: clause,
      };
    }
  }

  return null;
}

// ─── Find a name embedded inside a task description ──────────────────────────
// "do this and tell Hardik to verify" → "Hardik"
// "submit the report for Monica"      → "Monica"
function extractEmbeddedName(text) {
  const words = text.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[,;:'"()]+/g, "");
    if (looksLikeName(clean)) return clean;
  }
  return null;
}

// ─── Clean task title of leading filler verbs ─────────────────────────────────
// "would submit report" → "Submit report"
// "have to complete review" → "Complete review"
function cleanTaskTitle(title) {
  return capitalize(
    title
      .replace(/^(?:would|have\s+to|has\s+to|needs?\s+to|going\s+to|do\s+this\s+and\s+)\s*/i, "")
      .replace(/\s*[,;]\s*(?:and\s*)?$/i, "")   // strip trailing ", and" / ", " / "; and"
      .trim()
  );
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
      assignee_name: matchedName || "Unassigned",
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
