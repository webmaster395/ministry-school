import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Cette fonctionnalité n’est pas disponible." }, { status: 404 });
}
