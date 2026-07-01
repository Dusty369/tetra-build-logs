import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface SaveBody {
  jobId?: string;
  newJobName?: string;
  date: string;
  arrivalTime?: string;
  departureTime?: string;
  hoursOnSite?: string;
  notes?: string;
  materialsToOrder?: string[];
  rawTranscript?: string;
  lat?: number | null;
  lng?: number | null;
}

export async function POST(req: NextRequest) {
  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  try {
    let jobId = body.jobId;

    if (!jobId) {
      const jobName = body.newJobName?.trim();
      if (!jobName) {
        return NextResponse.json({ error: "jobId or newJobName is required" }, { status: 400 });
      }
      const existing = await prisma.job.findFirst({ where: { name: jobName } });
      if (existing) {
        jobId = existing.id;
        if (body.lat != null && body.lng != null && existing.latitude == null) {
          await prisma.job.update({
            where: { id: existing.id },
            data: { latitude: body.lat, longitude: body.lng },
          });
        }
      } else {
        const created = await prisma.job.create({
          data: {
            name: jobName,
            latitude: body.lat ?? null,
            longitude: body.lng ?? null,
          },
        });
        jobId = created.id;
      }
    } else {
      if (body.lat != null && body.lng != null) {
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (job && job.latitude == null) {
          await prisma.job.update({
            where: { id: jobId },
            data: { latitude: body.lat, longitude: body.lng },
          });
        }
      }
    }

    const logEntry = await prisma.logEntry.create({
      data: {
        jobId,
        date: new Date(body.date),
        arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : null,
        departureTime: body.departureTime ? new Date(body.departureTime) : null,
        hoursOnSite: body.hoursOnSite ? new Prisma.Decimal(body.hoursOnSite) : null,
        notes: body.notes ?? null,
        materialsToOrder: body.materialsToOrder ?? [],
        rawTranscript: body.rawTranscript ?? null,
      },
    });

    return NextResponse.json({ jobId, logEntryId: logEntry.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
