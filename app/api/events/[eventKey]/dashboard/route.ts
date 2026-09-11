import { NextResponse } from "next/server";
import { getEventDashboard } from "@/lib/event-dashboard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventKey: string }> },
) {
  try {
    const { eventKey } = await params;
    const dashboard = await getEventDashboard(eventKey);
    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown event dashboard error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
