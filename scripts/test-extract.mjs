import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are extracting structured data from a construction site visit voice transcript.
Return ONLY valid JSON with these exact keys (use null for missing values):
{
  "jobName": string | null,
  "date": ISO date string (YYYY-MM-DD) | null,
  "arrivalTime": ISO datetime string | null,
  "departureTime": ISO datetime string | null,
  "notes": string | null,
  "materialsToOrder": string[],
  "hoursOnSite": decimal string like "3.5" | null
}
If arrival and departure times are mentioned but hoursOnSite is not, calculate it.
Use today's date if a relative date like "today" is mentioned.
Return only the JSON object, no markdown, no explanation.`;

const SAMPLE_TRANSCRIPT =
  "I arrived at the Johnson Street renovation at 8am, left at 4pm. " +
  "Need to order 20 bags of cement and 5 sheets of plywood. " +
  "The framing on the east wall is done.";

const EXPECTED_KEYS = [
  "jobName",
  "date",
  "arrivalTime",
  "departureTime",
  "notes",
  "materialsToOrder",
  "hoursOnSite",
];

function validateShape(obj) {
  const missing = EXPECTED_KEYS.filter((k) => !(k in obj));
  if (missing.length) throw new Error(`Missing keys: ${missing.join(", ")}`);
  if (!Array.isArray(obj.materialsToOrder))
    throw new Error("materialsToOrder must be an array");
  if (obj.hoursOnSite !== null && typeof obj.hoursOnSite !== "string")
    throw new Error("hoursOnSite must be a string or null");
  return true;
}

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.log("ANTHROPIC_API_KEY not set — validating shape with mock response only.\n");
  const mock = {
    jobName: "Johnson Street Renovation",
    date: "2026-06-24",
    arrivalTime: "2026-06-24T08:00:00.000Z",
    departureTime: "2026-06-24T16:00:00.000Z",
    notes: "The framing on the east wall is done.",
    materialsToOrder: ["20 bags of cement", "5 sheets of plywood"],
    hoursOnSite: "8.00",
  };
  validateShape(mock);
  console.log("Shape validation passed:");
  console.log(JSON.stringify(mock, null, 2));
  process.exit(0);
}

const anthropic = new Anthropic({ apiKey });

const message = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 1024,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: `Transcript:\n${SAMPLE_TRANSCRIPT}` }],
});

const raw = message.content[0].type === "text" ? message.content[0].text : "";
console.log("Raw response:", raw, "\n");

const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
const parsed = JSON.parse(jsonText);
validateShape(parsed);
console.log("Extracted JSON (shape valid):");
console.log(JSON.stringify(parsed, null, 2));
