import { NextResponse } from "next/server";
import { getEventMatches } from "@/lib/tba";

export async function GET(_request: Request, { params }: { params: Promise<{ eventKey: string }> }) {
  try {
    const { eventKey } = await params;
    const matches = await getEventMatches(eventKey);
    return NextResponse.json(matches);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown TBA error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
