"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogEntryForm, { LogEntryPayload } from "@/components/LogEntryForm";

interface JobOption {
  id: string;
  name: string;
  status: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function NewLogEntryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
        body: JSON.stringify({ ...payload, rawTranscript: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 pt-10 pb-24">
      <h1 className="text-xl font-bold mb-6">New Log Entry</h1>
      <LogEntryForm
        jobs={jobs}
        initialDate={today}
        onSave={handleSave}
        saving={saving}
      />
    </main>
  );
}
