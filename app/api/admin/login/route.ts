import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Route moved. Use /yeneAdmin/login via NextAuth." },
    { status: 404 },
  );
}
