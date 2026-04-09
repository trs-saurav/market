import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/db";
import Sale from "@/models/Sale";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { salesData } = await request.json();
    if (!Array.isArray(salesData) || salesData.length === 0) {
      return NextResponse.json({ error: "Invalid sales data" }, { status: 400 });
    }

    await connectToDatabase();
    
    const userId = (session.user as any).id;
    const saleDocuments = salesData.map((items: string[]) => ({
      user: userId,
      items: items
    }));

    await Sale.insertMany(saleDocuments);

    return NextResponse.json({ message: `${saleDocuments.length} sales records saved.` }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const userId = (session.user as any).id;
    const sales = await Sale.find({ user: userId }).sort({ date: -1 });

    return NextResponse.json({ sales });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
