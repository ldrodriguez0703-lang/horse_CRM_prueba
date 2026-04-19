import { NextResponse } from "next/server";
import { fetchSheetsData } from "@/lib/sheets";

export async function GET() {
  const data = await fetchSheetsData();
  return NextResponse.json(data);
}
