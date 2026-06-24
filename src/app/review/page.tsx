"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

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

function computeHours(arrival: string, departure: string): string {
  if (!arrival || !departure) return "";
  const a = new Date(arrival).getTime();
  const d = new Date(departure).getTime();
  if (isNaN(a) || isNaN(d) || d <= a) return "";
  return ((d - a) / 3600000).toFixed(2);
}

function toTimeInput(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

function timeInputToISO(date: string, time: string): string | null {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function ReviewPage() {
  const router = useRouter();
  const [log, setLog] = useState<ExtractedLog | null>(null);
  const [jobs, setJobs] = useState<JobOption[]>([]);

  const [jobQuery, setJobQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [hoursOnSite, setHoursOnSite] = useState("");
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingLog");
    if (raw) {
      const parsed: ExtractedLog = JSON.parse(raw);
      setLog(parsed);
      setJobQuery(parsed.jobName ?? "");
      setDate(toDateInput(parsed.date));
      setArrivalTime(toTimeInput(parsed.arrivalTime));
      setDepartureTime(toTimeInput(parsed.departureTime));
      setHoursOnSite(parsed.hoursOnSite ?? "");
      setNotes(parsed.notes ?? "");
      setMaterials(parsed.materialsToOrder ?? []);
    }

    fetch("/api/jobs")
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (arrivalTime && departureTime) {
      const computed = computeHours(
        timeInputToISO(date, arrivalTime) ?? "",
        timeInputToISO(date, departureTime) ?? ""
      );
      if (computed) setHoursOnSite(computed);
    }
  }, [arrivalTime, departureTime, date]);

  const filteredJobs = jobQuery
    ? jobs.filter((j) => j.name.toLowerCase().includes(jobQuery.toLowerCase()))
    : jobs;

  async function handleSave() {
    if (!date) {
      alert("Date is required");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      date: new Date(date).toISOString(),
      arrivalTime: timeInputToISO(date, arrivalTime),
      departureTime: timeInputToISO(date, departureTime),
      hoursOnSite: hoursOnSite || null,
      notes: notes || null,
      materialsToOrder: materials.filter(Boolean),
      rawTranscript: log?.rawTranscript ?? null,
    };
    if (selectedJobId) {
      body.jobId = selectedJobId;
    } else {
      body.newJobName = jobQuery.trim() || "Unnamed Job";
    }

    try {
      const res = await fetch("/api/log/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      <div className="space-y-5">
        {/* Job Name */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs text-zinc-400 mb-1">Job</label>
          <input
            type="text"
            value={jobQuery}
            onChange={(e) => {
              setJobQuery(e.target.value);
              setSelectedJobId(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search or create job…"
            className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-600"
          />
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-zinc-800 rounded-lg shadow-xl overflow-hidden border border-zinc-700">
              {filteredJobs.map((j) => (
                <button
                  key={j.id}
                  onMouseDown={() => {
                    setSelectedJobId(j.id);
                    setJobQuery(j.name);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-700 transition-colors"
                >
                  {j.name}
                </button>
              ))}
              {jobQuery && !filteredJobs.find((j) => j.name.toLowerCase() === jobQuery.toLowerCase()) && (
                <button
                  onMouseDown={() => {
                    setSelectedJobId(null);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-green-400 hover:bg-zinc-700 transition-colors"
                >
                  + Create &ldquo;{jobQuery}&rdquo;
                </button>
              )}
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-600"
          />
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Arrival</label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Departure</label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>
        </div>

        {/* Hours */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Hours on Site</label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={hoursOnSite}
            onChange={(e) => setHoursOnSite(e.target.value)}
            className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-600"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
          />
        </div>

        {/* Materials */}
        <div>
          <label className="block text-xs text-zinc-400 mb-2">Materials to Order</label>
          <div className="space-y-2">
            {materials.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={m}
                  onChange={(e) => {
                    const next = [...materials];
                    next[i] = e.target.value;
                    setMaterials(next);
                  }}
                  className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <button
                  onClick={() => setMaterials(materials.filter((_, j) => j !== i))}
                  className="text-zinc-500 hover:text-red-400 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setMaterials([...materials, ""])}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              + Add material
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
        >
          {saving ? "Saving…" : "Save Log Entry"}
        </button>
      </div>
    </main>
  );
}
