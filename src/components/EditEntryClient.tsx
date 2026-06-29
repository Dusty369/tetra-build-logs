"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LogEntryForm, { LogEntryPayload } from "./LogEntryForm";

export interface SerializedEntry {
  id: string;
  jobId: string;
  date: string;
  arrivalTime: string | null;
  departureTime: string | null;
  hoursOnSite: string | null;
  notes: string | null;
  materialsToOrder: string[];
  rawTranscript: string | null;
  job: {
    id: string;
    name: string;
    status: string;
  };
}

interface JobOption {
  id: string;
  name: string;
  status: string;
}

interface EditEntryClientProps {
  entry: SerializedEntry;
  jobs: JobOption[];
}

function toTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export default function EditEntryClient({ entry, jobs }: EditEntryClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(payload: LogEntryPayload) {
    setSaving(true);
    try {
      const res = await fetch(`/api/log/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          rawTranscript: entry.rawTranscript,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/log/${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 pt-10 pb-24">
      <h1 className="text-xl font-bold mb-6">Edit Log Entry</h1>
      <LogEntryForm
        jobs={jobs}
        initialJobId={entry.jobId}
        initialJobName={entry.job.name}
        initialDate={toDateInput(entry.date)}
        initialArrival={toTimeInput(entry.arrivalTime)}
        initialDeparture={toTimeInput(entry.departureTime)}
        initialHours={entry.hoursOnSite ?? ""}
        initialNotes={entry.notes ?? ""}
        initialMaterials={entry.materialsToOrder}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
        deleting={deleting}
      />
    </main>
  );
}
