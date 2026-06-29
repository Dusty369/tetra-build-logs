import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface UpdateBody {
  jobId?: string;
  newJobName?: string;
  date: string;
  arrivalTime?: string;
  departureTime?: string;
  hoursOnSite?: string;
  notes?: string;
  materialsToOrder?: string[];
  rawTranscript?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: UpdateBody;
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
        return NextResponse.json(
          { error: "jobId or newJobName is required" },
          { status: 400 }
        );
      }
      const existing = await prisma.job.findFirst({ where: { name: jobName } });
      if (existing) {
        jobId = existing.id;
      } else {
        const created = await prisma.job.create({ data: { name: jobName } });
        jobId = created.id;
      }
    }

    const logEntry = await prisma.logEntry.update({
      where: { id: params.id },
      data: {
        jobId,
        date: new Date(body.date),
        arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : null,
        departureTime: body.departureTime ? new Date(body.departureTime) : null,
        hoursOnSite: body.hoursOnSite
          ? new Prisma.Decimal(body.hoursOnSite)
          : null,
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.logEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
