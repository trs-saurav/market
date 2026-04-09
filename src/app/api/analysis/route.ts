import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/db";
import Sale from "@/models/Sale";

// Full Apriori implementation in TypeScript for
// a detailed analysis endpoint that returns all DS pipeline steps
function computeSupport(transactions: string[][], itemset: string[]): number {
  let count = 0;
  for (const t of transactions) {
    if (itemset.every(item => t.includes(item))) count++;
  }
  return count / transactions.length;
}

function apriori(transactions: string[][], minSupport: number) {
  // Step 1: Get all unique items
  const allItems = new Set<string>();
  for (const t of transactions) {
    for (const item of t) allItems.add(item);
  }

  // Step 2: Find frequent 1-itemsets
  let currentItemsets: string[][] = [];
  const itemSupport: Map<string, number> = new Map();

  for (const item of allItems) {
    const sup = computeSupport(transactions, [item]);
    if (sup >= minSupport) {
      currentItemsets.push([item]);
      itemSupport.set(item, sup);
    }
  }

  const allFrequent: { items: string[]; support: number }[] = [];
  for (const itemset of currentItemsets) {
    allFrequent.push({ items: itemset, support: computeSupport(transactions, itemset) });
  }

  // Step 3: Generate higher-level itemsets
  let k = 2;
  while (currentItemsets.length > 0 && k <= 4) {
    const candidates: string[][] = [];
    for (let i = 0; i < currentItemsets.length; i++) {
      for (let j = i + 1; j < currentItemsets.length; j++) {
        const merged = [...new Set([...currentItemsets[i], ...currentItemsets[j]])].sort();
        if (merged.length === k) {
          const key = merged.join(",");
          if (!candidates.some(c => c.join(",") === key)) {
            candidates.push(merged);
          }
        }
      }
    }

    currentItemsets = [];
    for (const candidate of candidates) {
      const sup = computeSupport(transactions, candidate);
      if (sup >= minSupport) {
        currentItemsets.push(candidate);
        allFrequent.push({ items: candidate, support: sup });
      }
    }
    k++;
  }

  return allFrequent;
}

function generateRules(frequentItemsets: { items: string[]; support: number }[], transactions: string[][], minConfidence: number) {
  const rules: {
    antecedent: string[];
    consequent: string[];
    support: number;
    confidence: number;
    lift: number;
  }[] = [];

  for (const itemset of frequentItemsets) {
    if (itemset.items.length < 2) continue;

    // Generate all non-empty subsets as antecedents
    const subsets = getSubsets(itemset.items);
    for (const antecedent of subsets) {
      if (antecedent.length === 0 || antecedent.length === itemset.items.length) continue;

      const consequent = itemset.items.filter(i => !antecedent.includes(i));
      const antSupport = computeSupport(transactions, antecedent);
      const consSupport = computeSupport(transactions, consequent);
      const confidence = antSupport > 0 ? itemset.support / antSupport : 0;
      const lift = consSupport > 0 ? confidence / consSupport : 0;

      if (confidence >= minConfidence) {
        rules.push({
          antecedent: antecedent.sort(),
          consequent: consequent.sort(),
          support: itemset.support,
          confidence,
          lift,
        });
      }
    }
  }

  return rules.sort((a, b) => b.lift - a.lift);
}

function getSubsets(arr: string[]): string[][] {
  const result: string[][] = [];
  const n = arr.length;
  for (let i = 1; i < (1 << n) - 1; i++) {
    const subset: string[] = [];
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) subset.push(arr[j]);
    }
    result.push(subset);
  }
  return result;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const userId = (session.user as any).id;
    const sales = await Sale.find({ user: userId });

    if (sales.length < 3) {
      return NextResponse.json({
        error: "Need at least 3 transactions for analysis",
        steps: [],
      });
    }

    const transactions: string[][] = sales.map((s: any) => s.items);

    // ── STEP 1: Data Summary ──
    const allItems: string[] = [];
    for (const t of transactions) for (const item of t) allItems.push(item);
    const uniqueItems = [...new Set(allItems)];
    const basketSizes = transactions.map(t => t.length);

    const itemCounts: Record<string, number> = {};
    for (const item of allItems) {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    }
    const itemFrequency = Object.entries(itemCounts)
      .map(([item, count]) => ({
        item,
        frequency: count,
        support: +(count / transactions.length * 100).toFixed(2),
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Co-occurrence matrix (top 12)
    const top12 = itemFrequency.slice(0, 12).map(i => i.item);
    const coOccurrence: Record<string, Record<string, number>> = {};
    for (const a of top12) {
      coOccurrence[a] = {};
      for (const b of top12) {
        if (a === b) { coOccurrence[a][b] = 0; continue; }
        let count = 0;
        for (const t of transactions) {
          if (t.includes(a) && t.includes(b)) count++;
        }
        coOccurrence[a][b] = count;
      }
    }

    // ── STEP 2: Apriori ──
    const MIN_SUPPORT = Math.max(0.05, 2 / transactions.length);
    const frequentItemsets = apriori(transactions, MIN_SUPPORT);

    // ── STEP 3: Rules ──
    const MIN_CONFIDENCE = 0.3;
    const rules = generateRules(frequentItemsets, transactions, MIN_CONFIDENCE);

    // ── STEP 4: Evaluation ──
    const avgConfidence = rules.length > 0 ? rules.reduce((s, r) => s + r.confidence, 0) / rules.length : 0;
    const avgLift = rules.length > 0 ? rules.reduce((s, r) => s + r.lift, 0) / rules.length : 0;
    const maxLift = rules.length > 0 ? Math.max(...rules.map(r => r.lift)) : 0;
    const liftAboveOne = rules.filter(r => r.lift > 1).length;
    const strongRules = rules.filter(r => r.confidence >= 0.5 && r.lift >= 1.5);

    return NextResponse.json({
      steps: [
        {
          title: "Data Summary",
          data: {
            totalTransactions: transactions.length,
            uniqueProducts: uniqueItems.length,
            totalItemOccurrences: allItems.length,
            avgBasketSize: +(basketSizes.reduce((a, b) => a + b, 0) / basketSizes.length).toFixed(2),
            minBasketSize: Math.min(...basketSizes),
            maxBasketSize: Math.max(...basketSizes),
          },
        },
        {
          title: "Item Frequency",
          data: itemFrequency.slice(0, 15),
        },
        {
          title: "Transaction Size Distribution",
          data: basketSizes.reduce((acc: Record<number, number>, s) => {
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {}),
        },
        {
          title: "Co-occurrence Matrix",
          data: { items: top12, matrix: coOccurrence },
        },
        {
          title: "Frequent Itemsets",
          data: {
            minSupport: +(MIN_SUPPORT * 100).toFixed(1),
            total: frequentItemsets.length,
            itemsets: frequentItemsets
              .sort((a, b) => b.support - a.support)
              .slice(0, 25)
              .map(fi => ({
                items: fi.items,
                support: +(fi.support * 100).toFixed(2),
                length: fi.items.length,
              })),
          },
        },
        {
          title: "Association Rules",
          data: {
            minConfidence: MIN_CONFIDENCE * 100,
            total: rules.length,
            rules: rules.slice(0, 25).map(r => ({
              if_buys: r.antecedent.join(", "),
              then_buys: r.consequent.join(", "),
              support: +(r.support * 100).toFixed(2),
              confidence: +(r.confidence * 100).toFixed(1),
              lift: +r.lift.toFixed(2),
            })),
          },
        },
        {
          title: "Model Evaluation",
          data: {
            totalRules: rules.length,
            avgConfidence: +(avgConfidence * 100).toFixed(1),
            avgLift: +avgLift.toFixed(2),
            maxLift: +maxLift.toFixed(2),
            rulesWithPositiveLift: liftAboveOne,
            positivePercentage: rules.length > 0 ? +(liftAboveOne / rules.length * 100).toFixed(1) : 0,
            strongRulesCount: strongRules.length,
            strongRules: strongRules.slice(0, 10).map(r => ({
              rule: `${r.antecedent.join(", ")} → ${r.consequent.join(", ")}`,
              confidence: +(r.confidence * 100).toFixed(1),
              lift: +r.lift.toFixed(2),
            })),
          },
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
