"use client";

import { useEffect, useRef, useState } from "react";

export interface LogEntryPayload {
  jobId?: string;
  newJobName?: string;
  date: string;
  arrivalTime: string | null;
  departureTime: string | null;
  hoursOnSite: string | null;
  notes: string | null;
  materialsToOrder: string[];
}

interface JobOption {
  id: string;
  name: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LogEntryFormProps {
  jobs: JobOption[];
  initialJobId?: string;
  initialJobName?: string;
  initialDate?: string;
  initialArrival?: string;
  initialDeparture?: string;
  initialHours?: string;
  initialNotes?: string;
  initialMaterials?: string[];
  locationMatched?: boolean;
  onSave: (payload: LogEntryPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving: boolean;
  deleting?: boolean;
}

function computeHours(arrival: string, departure: string): string {
  if (!arrival || !departure) return "";
  const a = new Date(arrival).getTime();
  const d = new Date(departure).getTime();
  if (isNaN(a) || isNaN(d) || d <= a) return "";
  return ((d - a) / 3600000).toFixed(2);
}

function timeInputToISO(date: string, time: string): string | null {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function LogEntryForm({
  jobs,
  initialJobId,
  initialJobName = "",
  initialDate = "",
  initialArrival = "",
  initialDeparture = "",
  initialHours = "",
  initialNotes = "",
  initialMaterials = [],
  locationMatched,
  onSave,
  onDelete,
  saving,
  deleting,
}: LogEntryFormProps) {
  const [jobQuery, setJobQuery] = useState(initialJobName);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    initialJobId ?? null
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const [date, setDate] = useState(initialDate);
  const [arrivalTime, setArrivalTime] = useState(initialArrival);
  const [departureTime, setDepartureTime] = useState(initialDeparture);
  const [hoursOnSite, setHoursOnSite] = useState(initialHours);
  const [notes, setNotes] = useState(initialNotes);
  const [materials, setMaterials] = useState<string[]>(initialMaterials);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // On first mount: compute hours if both times are preset.
  // After mount: recompute when times change, and clear if either is removed.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      if (arrivalTime && departureTime) {
        const computed = computeHours(
          timeInputToISO(date, arrivalTime) ?? "",
          timeInputToISO(date, departureTime) ?? ""
        );
        if (computed) setHoursOnSite(computed);
      }
      return;
    }
    if (arrivalTime && departureTime) {
      const computed = computeHours(
        timeInputToISO(date, arrivalTime) ?? "",
        timeInputToISO(date, departureTime) ?? ""
      );
      if (computed) setHoursOnSite(computed);
    } else {
      setHoursOnSite("");
    }
  }, [arrivalTime, departureTime, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredJobs = jobQuery
    ? jobs.filter((j) =>
        j.name.toLowerCase().includes(jobQuery.toLowerCase())
      )
    : jobs;

  async function handleSave() {
    if (!date) {
      alert("Date is required");
      return;
    }
    const payload: LogEntryPayload = {
      date: new Date(date).toISOString(),
      arrivalTime: timeInputToISO(date, arrivalTime),
      departureTime: timeInputToISO(date, departureTime),
      hoursOnSite: hoursOnSite || null,
      notes: notes || null,
      materialsToOrder: materials.filter(Boolean),
    };
    if (selectedJobId) {
      payload.jobId = selectedJobId;
    } else {
      payload.newJobName = jobQuery.trim() || "Unnamed Job";
    }
    await onSave(payload);
  }

  return (
    <>
      <div className="space-y-5">
        {/* Job */}
        <div className="relative">
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
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Search or create job…"
            className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-600"
          />
          {locationMatched && (
            <p className="text-xs text-blue-400 mt-1">Matched by location</p>
          )}
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
              {jobQuery &&
                !filteredJobs.find(
                  (j) =>
                    j.name.toLowerCase() === jobQuery.toLowerCase()
                ) && (
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
            <label className="block text-xs text-zinc-400 mb-1">
              Departure
            </label>
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
          <label className="block text-xs text-zinc-400 mb-1">
            Hours on Site
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={hoursOnSite}
            onChange={(e) => setHoursOnSite(e.target.value)}
            placeholder="Enter hours manually"
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
          <label className="block text-xs text-zinc-400 mb-2">
            Materials to Order
          </label>
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
                  onClick={() =>
                    setMaterials(materials.filter((_, j) => j !== i))
                  }
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

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800">
        {onDelete ? (
          <div className="flex gap-3">
            {confirmDelete ? (
              <>
                <button
                  onClick={async () => {
                    if (onDelete) await onDelete();
                  }}
                  disabled={deleting}
                  className="flex-1 bg-red-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform text-sm"
                >
                  {deleting ? "Deleting…" : "Confirm delete?"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-5 bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl active:scale-95 transition-transform text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-5 bg-zinc-800 text-red-400 font-semibold py-3 rounded-xl active:scale-95 transition-transform text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform text-sm"
                >
                  {saving ? "Saving…" : "Save Log Entry"}
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
          >
            {saving ? "Saving…" : "Save Log Entry"}
          </button>
        )}
      </div>
    </>
  );
}
