"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogEntryForm, { LogEntryPayload } from "@/components/LogEntryForm";

interface ExtractedLog {
  jobName: string | null;
  date: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
  notes: string | null;
  materialsToOrder: string[];
  hoursOnSite: string | null;
  rawTranscript?: string;
  error?: string;
}

interface JobOption {
  id: string;
  name: string;
  status: string;
}

function toTimeInput(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  try {
    return iso.slice(0, 10);
  } catch {
    return "";
  }
}

export default function ReviewPage() {
  const router = useRouter();
  const [log, setLog] = useState<ExtractedLog | null>(null);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingLog");
    if (raw) {
      const parsed: ExtractedLog = JSON.parse(raw);
      setLog(parsed);
    }

    fetch("/api/jobs")
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => {});
  }, []);

  async function handleSave(payload: LogEntryPayload) {
    setSaving(true);
    try {
      const res = await fetch("/api/log/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          rawTranscript: log?.rawTranscript ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.removeItem("pendingLog");
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  if (!log) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500">No pending log. Go back and record a visit.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 pt-10 pb-24">
      <h1 className="text-xl font-bold mb-6">Review Log</h1>

      {log.error && (
        <p className="mb-4 text-red-400 text-sm bg-red-950 rounded-lg px-3 py-2">
          Extraction issue: {log.error}
        </p>
      )}

      <LogEntryForm
        jobs={jobs}
        initialJobName={log.jobName ?? ""}
        initialDate={toDateInput(log.date)}
        initialArrival={toTimeInput(log.arrivalTime)}
        initialDeparture={toTimeInput(log.departureTime)}
        initialHours={log.hoursOnSite ?? ""}
        initialNotes={log.notes ?? ""}
        initialMaterials={log.materialsToOrder ?? []}
        onSave={handleSave}
        saving={saving}
      />
    </main>
  );
}
