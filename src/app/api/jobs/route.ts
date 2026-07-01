import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      select: { id: true, name: true, status: true, latitude: true, longitude: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(jobs);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
