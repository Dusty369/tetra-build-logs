import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditEntryClient, { SerializedEntry } from "@/components/EditEntryClient";

export default async function EditEntryPage({
  params,
}: {
  params: { id: string };
}) {
  const entry = await prisma.logEntry
    .findUnique({
      where: { id: params.id },
      include: { job: true },
    })
    .catch(() => null);

  if (!entry) notFound();

  const jobs = await prisma.job.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" },
  });

  const serialized: SerializedEntry = {
    id: entry.id,
    jobId: entry.jobId,
    date: entry.date.toISOString(),
    arrivalTime: entry.arrivalTime?.toISOString() ?? null,
    departureTime: entry.departureTime?.toISOString() ?? null,
    hoursOnSite: entry.hoursOnSite?.toString() ?? null,
    notes: entry.notes,
    materialsToOrder: entry.materialsToOrder,
    rawTranscript: entry.rawTranscript,
    job: {
      id: entry.job.id,
      name: entry.job.name,
      status: entry.job.status,
    },
  };

  const serializedJobs = jobs.map((j) => ({
    id: j.id,
    name: j.name,
    status: j.status as string,
  }));

  return <EditEntryClient entry={serialized} jobs={serializedJobs} />;
}
