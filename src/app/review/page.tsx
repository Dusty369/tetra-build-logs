"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogEntryForm, { LogEntryPayload } from "@/components/LogEntryForm";
import { haversineMetres } from "@/lib/haversine";

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
  latitude: number | null;
  longitude: number | null;
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [gpsMatchedJob, setGpsMatchedJob] = useState<JobOption | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingLog");
    let parsedCoords: { lat: number; lng: number } | null = null;
    if (raw) {
      const parsed = JSON.parse(raw) as ExtractedLog & {
        _coords?: { lat: number; lng: number } | null;
      };
      const { _coords, ...rest } = parsed;
      setLog(rest as ExtractedLog);
      if (_coords) {
        setCoords(_coords);
        parsedCoords = _coords;
      }
    }

    fetch("/api/jobs")
      .then((r) => r.json())
      .then((fetchedJobs: JobOption[]) => {
        setJobs(fetchedJobs);

        if (parsedCoords && fetchedJobs.length > 0) {
          let nearest: JobOption | null = null;
          let nearestDist = Infinity;
          for (const job of fetchedJobs) {
            if (job.latitude == null || job.longitude == null) continue;
            const d = haversineMetres(
              parsedCoords.lat,
              parsedCoords.lng,
              job.latitude,
              job.longitude
            );
            if (d < nearestDist) {
              nearestDist = d;
              nearest = job;
            }
          }
          if (nearest && nearestDist <= 150) {
            setGpsMatchedJob(nearest);
          }
        }
      })
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
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
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
        initialJobId={gpsMatchedJob?.id}
        initialJobName={gpsMatchedJob ? gpsMatchedJob.name : (log.jobName ?? "")}
        initialDate={toDateInput(log.date)}
        initialArrival={toTimeInput(log.arrivalTime)}
        initialDeparture={toTimeInput(log.departureTime)}
        initialHours={log.hoursOnSite ?? ""}
        initialNotes={log.notes ?? ""}
        initialMaterials={log.materialsToOrder ?? []}
        locationMatched={!!gpsMatchedJob}
        onSave={handleSave}
        saving={saving}
      />
    </main>
  );
}
