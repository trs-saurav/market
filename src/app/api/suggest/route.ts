import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const PYTHON_API = process.env.PYTHON_API_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cart } = body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const res = await fetch(`${PYTHON_API}/api/suggest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": userId,
      },
      body: JSON.stringify({ cart }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
