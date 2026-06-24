import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
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
hoursOnSite: ONLY calculate this as (departureTime minus arrivalTime) when BOTH are explicitly stated in the transcript. If either time is absent or unclear, set hoursOnSite to null. NEVER estimate or guess a duration. Do not infer missing times from context.
Use today's date if a relative date like "today" is mentioned.
Return only the JSON object, no markdown, no explanation.`;

export async function POST(req: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!groqKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }
  if (!anthropicKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioBlob = formData.get("audio");
  if (!audioBlob || !(audioBlob instanceof Blob)) {
    return NextResponse.json({ error: "No audio field in form data" }, { status: 400 });
  }

  try {
    const buffer = await audioBlob.arrayBuffer();
    const audioFile = new File([buffer], "audio.webm", { type: audioBlob.type || "audio/webm" });

    const groq = new Groq({ apiKey: groqKey });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      response_format: "text",
    });

    const transcript = typeof transcription === "string" ? transcription : (transcription as { text: string }).text;

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const today = new Date().toISOString().slice(0, 10);
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today's date is ${today}. Use this as the date anchor when the transcript mentions only a time (e.g. "7:30am" becomes "${today}T07:30:00").\n\nTranscript:\n${transcript}`,
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const extracted = JSON.parse(jsonText);

    // If either time is missing, clear hoursOnSite — never allow an estimated value
    if (!extracted.arrivalTime || !extracted.departureTime) {
      extracted.hoursOnSite = null;
    }
    // Recalculate hoursOnSite from the two times if both are present
    if (extracted.arrivalTime && extracted.departureTime) {
      const arrival = new Date(extracted.arrivalTime).getTime();
      const departure = new Date(extracted.departureTime).getTime();
      if (!isNaN(arrival) && !isNaN(departure) && departure > arrival) {
        extracted.hoursOnSite = ((departure - arrival) / 3_600_000).toFixed(2);
      } else {
        extracted.hoursOnSite = null;
      }
    }

    return NextResponse.json({ ...extracted, rawTranscript: transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
