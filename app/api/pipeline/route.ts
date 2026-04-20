import { NextRequest, NextResponse } from "next/server";
import { patchProyecto } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const { recordId, fields } = await req.json();
  if (!recordId || !fields) return NextResponse.json({ ok: false }, { status: 400 });
  const ok = await patchProyecto(recordId, fields);
  return NextResponse.json({ ok });
}
