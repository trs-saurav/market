import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const PYTHON_API = process.env.PYTHON_API_URL ?? "http://localhost:8000";

/** Helper: verify session and return userId, or throw a 401 response */
async function requireUserId(): Promise<string | NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    if (userId instanceof NextResponse) return userId;

    const body = await request.json();
    const { salesData } = body;

    if (!Array.isArray(salesData) || salesData.length === 0) {
      return NextResponse.json({ error: "Invalid sales data" }, { status: 400 });
    }

    const res = await fetch(`${PYTHON_API}/api/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": userId,
      },
      body: JSON.stringify({ salesData }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await requireUserId();
    if (userId instanceof NextResponse) return userId;

    const res = await fetch(`${PYTHON_API}/api/sales`, {
      headers: { "X-User-ID": userId },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
