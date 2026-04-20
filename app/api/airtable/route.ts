import { NextResponse } from "next/server";
import { fetchProyectos } from "@/lib/airtable";

export async function GET() {
  const data = await fetchProyectos();
  return NextResponse.json(data);
}
