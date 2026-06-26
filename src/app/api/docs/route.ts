import { NextResponse } from "next/server";
import { fetchAllDocs } from "@/lib/docsFetcher";

export async function GET() {
  try {
    const docs = await fetchAllDocs();
    return NextResponse.json(docs);
  } catch (error: any) {
    console.error("Error in GET /api/docs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch docs" },
      { status: 500 }
    );
  }
}
