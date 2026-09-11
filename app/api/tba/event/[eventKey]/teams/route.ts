import { NextResponse } from "next/server";
import { getEventTeams } from "@/lib/tba";

export async function GET(_request: Request, { params }: { params: Promise<{ eventKey: string }> }) {
  try {
    const { eventKey } = await params;
    const teams = await getEventTeams(eventKey);
    return NextResponse.json(teams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown TBA error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
