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
If arrival and departure times are mentioned but hoursOnSite is not, calculate it.
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
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Transcript:\n${transcript}` }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const extracted = JSON.parse(jsonText);

    return NextResponse.json({ ...extracted, rawTranscript: transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
