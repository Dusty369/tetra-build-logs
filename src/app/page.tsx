import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RecordButton from "@/components/RecordButton";
import { JobStatus } from "@prisma/client";

const statusStyles: Record<JobStatus, string> = {
  ACTIVE: "bg-green-800 text-green-200",
  ON_HOLD: "bg-amber-800 text-amber-200",
  COMPLETE: "bg-zinc-700 text-zinc-300",
};

async function getJobs() {
  try {
    return await prisma.job.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    return [];
  }
}

export default async function Home() {
  const jobs = await getJobs();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-32">
      <header className="px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Build Logs</h1>
      </header>

      <section className="px-4 space-y-3">
        {jobs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No jobs yet. Record your first site visit.</p>
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block bg-zinc-900 rounded-xl px-4 py-4 active:bg-zinc-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{job.name}</p>
                  {job.client && (
                    <p className="text-sm text-zinc-400 mt-0.5">{job.client}</p>
                  )}
                  {job.address && (
                    <p className="text-xs text-zinc-500 mt-0.5">{job.address}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyles[job.status]}`}>
                  {job.status.replace("_", " ")}
                </span>
              </div>
            </Link>
          ))
        )}
      </section>

      <RecordButton />
    </main>
  );
}
