import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/db";
import Sale from "@/models/Sale";
import { getFrequentItemsets, getRecommendations } from "@/lib/ml";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cart } = await request.json();
    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    await connectToDatabase();
    
    const userId = (session.user as any).id;
    const sales = await Sale.find({ user: userId });
    
    if (sales.length < 2) {
      return NextResponse.json({ message: "Not enough data to calculate suggestions. Add at least 2 transactions.", recommendations: [] });
    }

    const transactions = sales.map(s => s.items);
    const minSupport = Math.max(0.01, 2 / transactions.length); 
    const result: any = await getFrequentItemsets(transactions, minSupport);
    const recommendations = getRecommendations(result, cart);

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
