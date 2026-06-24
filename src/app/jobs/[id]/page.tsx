import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const statusStyles: Record<JobStatus, string> = {
  ACTIVE: "bg-green-800 text-green-200",
  ON_HOLD: "bg-amber-800 text-amber-200",
  COMPLETE: "bg-zinc-700 text-zinc-300",
};

function formatTime(dt: Date | null): string {
  if (!dt) return "—";
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dt: Date): string {
  return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function sumDecimals(vals: (Decimal | null)[]): string {
  const total = vals.reduce((acc, v) => acc + (v ? parseFloat(v.toString()) : 0), 0);
  return total.toFixed(2);
}

export default async function JobPage({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      logEntries: { orderBy: { date: "desc" } },
    },
  }).catch(() => null);

  if (!job) notFound();

  const totalHours = sumDecimals(job.logEntries.map((e) => e.hoursOnSite));

  const allMaterials = [
    ...new Set(job.logEntries.flatMap((e) => e.materialsToOrder).filter(Boolean)),
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      {/* Header */}
      <div className="px-4 pt-10 pb-6 border-b border-zinc-800">
        <Link href="/" className="text-xs text-zinc-500 mb-3 block">← All Jobs</Link>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{job.name}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap mt-1 ${statusStyles[job.status]}`}>
            {job.status.replace("_", " ")}
          </span>
        </div>
        {job.client && <p className="text-sm text-zinc-400 mt-1">{job.client}</p>}
        {job.address && <p className="text-xs text-zinc-500 mt-0.5">{job.address}</p>}
      </div>

      {/* Stats */}
      <div className="px-4 py-5 grid grid-cols-2 gap-3 border-b border-zinc-800">
        <div className="bg-zinc-900 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-400">Total Hours</p>
          <p className="text-2xl font-bold mt-1">{totalHours}</p>
          <p className="text-xs text-zinc-500">hrs</p>
        </div>
        <div className="bg-zinc-900 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-400">Site Visits</p>
          <p className="text-2xl font-bold mt-1">{job.logEntries.length}</p>
        </div>
      </div>

      {/* Materials */}
      {allMaterials.length > 0 && (
        <div className="px-4 py-5 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Materials to Order
          </h2>
          <ul className="space-y-1.5">
            {allMaterials.map((m) => (
              <li key={m} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Log Entries */}
      <div className="px-4 py-5">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Site Visits
        </h2>
        {job.logEntries.length === 0 ? (
          <p className="text-zinc-500 text-sm">No visits logged yet.</p>
        ) : (
          <div className="space-y-4">
            {job.logEntries.map((entry) => (
              <div key={entry.id} className="bg-zinc-900 rounded-xl px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{formatDate(entry.date)}</p>
                  {entry.hoursOnSite && (
                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-300">
                      {entry.hoursOnSite.toString()} hrs
                    </span>
                  )}
                </div>

                {(entry.arrivalTime || entry.departureTime) && (
                  <p className="text-xs text-zinc-400 mb-2">
                    {formatTime(entry.arrivalTime)} → {formatTime(entry.departureTime)}
                  </p>
                )}

                {entry.notes && (
                  <p className="text-sm text-zinc-300 mb-2 leading-relaxed">{entry.notes}</p>
                )}

                {entry.materialsToOrder.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-zinc-500 mb-1">Materials:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.materialsToOrder.map((m) => (
                        <span key={m} className="text-xs bg-zinc-800 text-amber-300 px-2 py-0.5 rounded-full">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
