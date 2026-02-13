import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const today = new Date().toISOString().slice(0, 10);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(cors({ origin: "*" }));
app.use(express.json());

// Serve the frontend files from the project root
app.use(express.static(path.join(__dirname, "..")));

function emptyFields() {
  return {
    from: null,
    to: null,
    trip_type: null,
    departure: null,
    return: null,
    passengers: null,
    travel_class: null
  };
}

function isConfirmMessage(message) {
  return /^(yes|y|confirm|looks good|go ahead|submit|ok|ja|bekrafta|bekräfta)$/i.test(message.trim());
}

function normalizeTravelClass(value) {
  if (!value) {
    return null;
  }
  const v = String(value).toLowerCase();
  if (v.includes("business")) {
    return "Business";
  }
  if (v.includes("premium")) {
    return "Premium Economy";
  }
  if (v.includes("economy")) {
    return "Economy";
  }
  return null;
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function addDaysIso(isoDate, offsetDays) {
  if (!isoDate || !Number.isInteger(offsetDays)) {
    return null;
  }
  const anchor = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(anchor.getTime())) {
    return null;
  }
  anchor.setUTCDate(anchor.getUTCDate() + offsetDays);
  return anchor.toISOString().slice(0, 10);
}

function mergeFields(base, incoming) {
  const merged = { ...base };
  for (const key of Object.keys(merged)) {
    const value = incoming[key];
    if (value !== null && value !== undefined && value !== "") {
      merged[key] = value;
    }
  }
  return merged;
}

function evaluateMissing(fields) {
  const missing = [];
  if (!fields.from) {
    missing.push("from");
  }
  if (!fields.to) {
    missing.push("to");
  }
  if (!fields.departure) {
    missing.push("departure");
  }
  if (!fields.trip_type) {
    missing.push("trip_type");
  }
  if (!fields.passengers) {
    missing.push("passengers");
  }
  if (!fields.travel_class) {
    missing.push("travel_class");
  }
  if (fields.trip_type === "round_trip" && !fields.return) {
    missing.push("return");
  }
  return missing;
}

function fieldQuestion(field) {
  if (field === "from") {
    return "What is your departure city?";
  }
  if (field === "to") {
    return "What is your destination city?";
  }
  if (field === "departure") {
    return "What is your departure date? Example: 2026-08-29.";
  }
  if (field === "trip_type") {
    return "Is this one-way or round-trip?";
  }
  if (field === "return") {
    return "What is your return date?";
  }
  if (field === "passengers") {
    return "How many passengers (1 to 9)?";
  }
  if (field === "travel_class") {
    return "Which class do you want: Economy, Premium Economy, or Business?";
  }
  return "Please provide the missing booking details.";
}

function buildSummary(fields) {
  const tripLabel = fields.trip_type === "one_way" ? "one-way" : "round-trip";
  const returnPart = fields.trip_type === "round_trip" ? `, return ${fields.return}` : "";
  return `I can fill: ${fields.from} to ${fields.to}, ${tripLabel}, departure ${fields.departure}${returnPart}, ${fields.passengers} passenger(s), ${fields.travel_class}. Confirm with yes/ja?`;
}

function aiUnavailableResponse() {
  return {
    type: "ai_unavailable",
    assistant_message: "AI parsing is unavailable right now. Add a valid OPENAI_API_KEY in server/.env and restart the backend."
  };
}

async function extractWithOpenAI(message, context) {
  const schema = {
    name: "flight_request",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        fields: {
          type: "object",
          additionalProperties: false,
          properties: {
            from: { type: ["string", "null"] },
            to: { type: ["string", "null"] },
            trip_type: { type: ["string", "null"], enum: ["one_way", "round_trip", null] },
            departure: { type: ["string", "null"] },
            return: { type: ["string", "null"] },
            passengers: { type: ["number", "null"] },
            travel_class: { type: ["string", "null"], enum: ["Economy", "Premium Economy", "Business", null] }
          },
          required: ["from", "to", "trip_type", "departure", "return", "passengers", "travel_class"]
        },
        missing_fields: {
          type: "array",
          items: { type: "string" }
        },
        ambiguities: {
          type: "array",
          items: { type: "string" }
        },
        assistant_message: { type: "string" },
        relative_date_inference: {
          type: "object",
          additionalProperties: false,
          properties: {
            return_offset_days: { type: ["integer", "null"] },
            anchor: { type: ["string", "null"], enum: ["departure", null] }
          },
          required: ["return_offset_days", "anchor"]
        }
      },
      required: ["fields", "missing_fields", "ambiguities", "assistant_message", "relative_date_inference"]
    },
    strict: true
  };

  const prompt = [
    `Today is ${today}.`,
    "Extract flight booking fields from user text in English or Swedish.",
    "Understand natural phrasing such as '29th of August 2026' and '29 augusti 2026'.",
    "Understand relative return phrases such as 'return two days later' or 'tillbaka tva dagar senare'.",
    "Use context.pending_fields as memory.",
    "Normalize explicit dates to YYYY-MM-DD.",
    "If return date is relative to departure, set relative_date_inference.return_offset_days and anchor='departure'.",
    "If something is unclear, list it in ambiguities.",
    "Keep unknown fields null."
  ].join(" ");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: JSON.stringify({ message, context })
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: schema
    }
  });

  const content = completion.choices[0].message.content;
  return JSON.parse(content);
}

async function extractWithRetry(message, context) {
  try {
    return await extractWithOpenAI(message, context);
  } catch (firstError) {
    return extractWithOpenAI(message, context);
  }
}

app.post("/api/agent", async (req, res) => {
  const { message, context } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      type: "need_info",
      assistant_message: "Please send a message with your trip details."
    });
  }

  const pending = (context && context.pending_fields) || emptyFields();
  const awaitingConfirmation = Boolean(context && context.awaiting_confirmation);

  if (awaitingConfirmation && isConfirmMessage(message)) {
    return res.json({
      type: "confirmed_fill",
      assistant_message: "Confirmed. I will fill the form and run search now.",
      proposed_fields: pending
    });
  }

  if (!openai) {
    return res.status(503).json(aiUnavailableResponse());
  }

  let extracted;
  try {
    extracted = await extractWithRetry(message, context);
  } catch (error) {
    return res.status(503).json(aiUnavailableResponse());
  }

  const normalizedFields = {
    from: extracted.fields?.from || null,
    to: extracted.fields?.to || null,
    trip_type: extracted.fields?.trip_type || null,
    departure: toIsoDate(extracted.fields?.departure),
    return: toIsoDate(extracted.fields?.return),
    passengers: extracted.fields?.passengers ? Number(extracted.fields.passengers) : null,
    travel_class: normalizeTravelClass(extracted.fields?.travel_class)
  };

  const merged = mergeFields(pending, normalizedFields);
  const inferred = extracted.relative_date_inference || { return_offset_days: null, anchor: null };

  if (!merged.return && inferred.anchor === "departure" && Number.isInteger(inferred.return_offset_days)) {
    merged.return = addDaysIso(merged.departure, inferred.return_offset_days);
  }

  if (merged.trip_type === "one_way") {
    merged.return = null;
  }

  const missing = evaluateMissing(merged);
  const ambiguities = Array.isArray(extracted.ambiguities) ? extracted.ambiguities : [];

  if (missing.length > 0 || ambiguities.length > 0) {
    const nextField = ambiguities[0] || missing[0];
    return res.json({
      type: "need_info",
      assistant_message: fieldQuestion(nextField),
      missing_fields: missing,
      ambiguities,
      proposed_fields: merged
    });
  }

  if (merged.passengers < 1 || merged.passengers > 9) {
    return res.json({
      type: "need_info",
      assistant_message: "Passengers must be between 1 and 9. How many passengers?",
      missing_fields: ["passengers"],
      proposed_fields: merged
    });
  }

  if (merged.from && merged.to && merged.from.toLowerCase() === merged.to.toLowerCase()) {
    return res.json({
      type: "need_info",
      assistant_message: "Departure and destination cannot be the same. Please provide different cities.",
      missing_fields: ["from", "to"],
      proposed_fields: merged
    });
  }

  if (merged.trip_type === "round_trip" && merged.return && merged.departure) {
    if (new Date(merged.return) <= new Date(merged.departure)) {
      return res.json({
        type: "need_info",
        assistant_message: "Return date must be after departure date. Please provide a valid return date.",
        missing_fields: ["return"],
        proposed_fields: merged
      });
    }
  }

  return res.json({
    type: "ready_to_fill",
    assistant_message: buildSummary(merged),
    missing_fields: [],
    ambiguities: [],
    proposed_fields: merged
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Agent server running on http://localhost:${port}`);
});
