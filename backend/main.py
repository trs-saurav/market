"""
Market Basket Analyzer — Python FastAPI Backend
================================================
Endpoints
---------
POST /api/auth/register   – user registration
POST /api/auth/login      – credential verification (called by Next.js next-auth authorize)
GET  /api/sales           – list user's sales records
POST /api/sales           – bulk-insert sale transactions
POST /api/suggest         – cart-based Apriori recommendations
GET  /api/analysis        – full DS pipeline (Apriori + rules + evaluation)

Auth model
----------
next-auth manages the session cookie on the frontend.
Its `authorize` callback calls POST /api/auth/login on this server.
All business endpoints (sales, suggest, analysis) are called by Next.js proxy
routes that inject the verified user id via the `X-User-ID` header — the
frontend never talks to this server directly, so no CORS cookie headaches.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt as _bcrypt
from pydantic import BaseModel

# ── Environment ───────────────────────────────────────────────────────────────
# Load .env.local from the project root (one directory above this file)
_root = os.path.join(os.path.dirname(__file__), "..")
load_dotenv(os.path.join(_root, ".env.local"))

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB  = os.getenv("MONGODB_DB", "market")   # override with MONGODB_DB env var

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not set – check .env.local")

# ── Database lifecycle ────────────────────────────────────────────────────────
_motor_client: AsyncIOMotorClient | None = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _motor_client, db
    _motor_client = AsyncIOMotorClient(MONGODB_URI)
    db = _motor_client[MONGODB_DB]
    yield
    _motor_client.close()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Market Basket Analyzer API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Helper: serialise MongoDB documents ──────────────────────────────────────
def _serial(doc: dict) -> dict:
    out: dict = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = _serial(v)
        elif isinstance(v, list):
            out[k] = [
                _serial(i) if isinstance(i, dict)
                else str(i) if isinstance(i, ObjectId)
                else i
                for i in v
            ]
        else:
            out[k] = v
    return out


# ══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

class RegisterBody(BaseModel):
    email: str
    password: str
    name: str


class LoginBody(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register", status_code=201)
async def register(body: RegisterBody):
    existing = await db["users"].find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = _hash_password(body.password)
    now = _utcnow()
    result = await db["users"].insert_one(
        {"email": body.email, "name": body.name, "password": hashed,
         "createdAt": now, "updatedAt": now}
    )
    return {"message": "User registered successfully", "id": str(result.inserted_id)}


@app.post("/api/auth/login")
async def login(body: LoginBody):
    """
    Called exclusively by the Next.js next-auth `authorize` callback.
    Returns plain user info — next-auth then creates the encrypted JWT session.
    """
    user = await db["users"].find_one({"email": body.email})
    if not user or not _verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "id":    str(user["_id"]),
        "email": user["email"],
        "name":  user.get("name", ""),
    }


# ══════════════════════════════════════════════════════════════════════════════
# SALES ROUTES
# ══════════════════════════════════════════════════════════════════════════════

class SalesBody(BaseModel):
    salesData: list[list[str]]


@app.post("/api/sales", status_code=201)
async def create_sales(body: SalesBody, x_user_id: str = Header(...)):
    if not body.salesData:
        raise HTTPException(status_code=400, detail="Invalid sales data")

    now = _utcnow()
    docs = [
        {"user": ObjectId(x_user_id), "items": items, "date": now,
         "createdAt": now, "updatedAt": now}
        for items in body.salesData
    ]
    result = await db["sales"].insert_many(docs)
    return JSONResponse(
        content={"message": f"{len(result.inserted_ids)} sales records saved."},
        status_code=201,
    )


@app.get("/api/sales")
async def get_sales(x_user_id: str = Header(...)):
    cursor = db["sales"].find({"user": ObjectId(x_user_id)}).sort("date", -1)
    sales = [_serial(doc) async for doc in cursor]
    return {"sales": sales}


# ══════════════════════════════════════════════════════════════════════════════
# APRIORI ALGORITHM  (full port of the TypeScript implementation)
# ══════════════════════════════════════════════════════════════════════════════

def _compute_support(transactions: list[list[str]], itemset: list[str]) -> float:
    count = sum(1 for t in transactions if all(item in t for item in itemset))
    return count / len(transactions)


def _apriori(transactions: list[list[str]], min_support: float) -> list[dict]:
    all_items: set[str] = {item for t in transactions for item in t}

    # Frequent 1-itemsets
    current: list[list[str]] = []
    for item in all_items:
        if _compute_support(transactions, [item]) >= min_support:
            current.append([item])

    all_frequent: list[dict] = [
        {"items": is_, "support": _compute_support(transactions, is_)}
        for is_ in current
    ]

    # Generate k-itemsets (k = 2…4, matching original TS cap)
    k = 2
    while current and k <= 4:
        seen: set[str] = set()
        candidates: list[list[str]] = []
        for i in range(len(current)):
            for j in range(i + 1, len(current)):
                merged = sorted(set(current[i]) | set(current[j]))
                if len(merged) == k:
                    key = ",".join(merged)
                    if key not in seen:
                        seen.add(key)
                        candidates.append(merged)

        current = []
        for candidate in candidates:
            sup = _compute_support(transactions, candidate)
            if sup >= min_support:
                current.append(candidate)
                all_frequent.append({"items": candidate, "support": sup})
        k += 1

    return all_frequent


def _get_subsets(arr: list[str]) -> list[list[str]]:
    n = len(arr)
    return [
        [arr[j] for j in range(n) if i & (1 << j)]
        for i in range(1, (1 << n) - 1)
    ]


def _generate_rules(
    frequent_itemsets: list[dict],
    transactions: list[list[str]],
    min_confidence: float,
) -> list[dict]:
    rules: list[dict] = []
    for fi in frequent_itemsets:
        items = fi["items"]
        if len(items) < 2:
            continue
        for antecedent in _get_subsets(items):
            if not antecedent or len(antecedent) == len(items):
                continue
            consequent = [x for x in items if x not in antecedent]
            ant_sup  = _compute_support(transactions, antecedent)
            cons_sup = _compute_support(transactions, consequent)
            confidence = fi["support"] / ant_sup if ant_sup > 0 else 0.0
            lift = confidence / cons_sup if cons_sup > 0 else 0.0
            if confidence >= min_confidence:
                rules.append({
                    "antecedent": sorted(antecedent),
                    "consequent": sorted(consequent),
                    "support":    fi["support"],
                    "confidence": confidence,
                    "lift":       lift,
                })
    return sorted(rules, key=lambda r: r["lift"], reverse=True)


# ══════════════════════════════════════════════════════════════════════════════
# ANALYSIS ROUTE
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/analysis")
async def get_analysis(x_user_id: str = Header(...)):
    cursor = db["sales"].find({"user": ObjectId(x_user_id)})
    sales = [doc async for doc in cursor]

    if len(sales) < 3:
        return {"error": "Need at least 3 transactions for analysis", "steps": []}

    transactions: list[list[str]] = [list(s["items"]) for s in sales]

    # ── Step 1: Data Summary ──────────────────────────────────────────────────
    flat: list[str] = [item for t in transactions for item in t]
    unique_items = list(set(flat))
    basket_sizes = [len(t) for t in transactions]

    item_counts: dict[str, int] = {}
    for item in flat:
        item_counts[item] = item_counts.get(item, 0) + 1

    item_frequency = sorted(
        [
            {"item": item, "frequency": cnt,
             "support": round(cnt / len(transactions) * 100, 2)}
            for item, cnt in item_counts.items()
        ],
        key=lambda x: x["frequency"],
        reverse=True,
    )

    # Co-occurrence matrix (top-12 items)
    top12 = [x["item"] for x in item_frequency[:12]]
    co_occurrence: dict[str, dict[str, int]] = {}
    for a in top12:
        co_occurrence[a] = {}
        for b in top12:
            if a == b:
                co_occurrence[a][b] = 0
            else:
                co_occurrence[a][b] = sum(
                    1 for t in transactions if a in t and b in t
                )

    # ── Step 2: Apriori ───────────────────────────────────────────────────────
    MIN_SUPPORT = max(0.05, 2 / len(transactions))
    frequent_itemsets = _apriori(transactions, MIN_SUPPORT)

    # ── Step 3: Rules ─────────────────────────────────────────────────────────
    MIN_CONFIDENCE = 0.3
    rules = _generate_rules(frequent_itemsets, transactions, MIN_CONFIDENCE)

    # ── Step 4: Evaluation ────────────────────────────────────────────────────
    avg_confidence = sum(r["confidence"] for r in rules) / len(rules) if rules else 0.0
    avg_lift       = sum(r["lift"]       for r in rules) / len(rules) if rules else 0.0
    max_lift       = max((r["lift"] for r in rules), default=0.0)
    lift_above_one = [r for r in rules if r["lift"] > 1]
    strong_rules   = [r for r in rules if r["confidence"] >= 0.5 and r["lift"] >= 1.5]

    size_dist: dict[str, int] = {}
    for s in basket_sizes:
        size_dist[str(s)] = size_dist.get(str(s), 0) + 1

    return {
        "steps": [
            {
                "title": "Data Summary",
                "data": {
                    "totalTransactions":   len(transactions),
                    "uniqueProducts":      len(unique_items),
                    "totalItemOccurrences": len(flat),
                    "avgBasketSize":       round(sum(basket_sizes) / len(basket_sizes), 2),
                    "minBasketSize":       min(basket_sizes),
                    "maxBasketSize":       max(basket_sizes),
                },
            },
            {"title": "Item Frequency",               "data": item_frequency[:15]},
            {"title": "Transaction Size Distribution", "data": size_dist},
            {"title": "Co-occurrence Matrix",         "data": {"items": top12, "matrix": co_occurrence}},
            {
                "title": "Frequent Itemsets",
                "data": {
                    "minSupport": round(MIN_SUPPORT * 100, 1),
                    "total": len(frequent_itemsets),
                    "itemsets": [
                        {"items": fi["items"],
                         "support": round(fi["support"] * 100, 2),
                         "length": len(fi["items"])}
                        for fi in sorted(frequent_itemsets,
                                         key=lambda x: x["support"], reverse=True)[:25]
                    ],
                },
            },
            {
                "title": "Association Rules",
                "data": {
                    "minConfidence": MIN_CONFIDENCE * 100,
                    "total": len(rules),
                    "rules": [
                        {
                            "if_buys":   ", ".join(r["antecedent"]),
                            "then_buys": ", ".join(r["consequent"]),
                            "support":    round(r["support"]    * 100, 2),
                            "confidence": round(r["confidence"] * 100, 1),
                            "lift":       round(r["lift"], 2),
                        }
                        for r in rules[:25]
                    ],
                },
            },
            {
                "title": "Model Evaluation",
                "data": {
                    "totalRules":         len(rules),
                    "avgConfidence":      round(avg_confidence * 100, 1),
                    "avgLift":            round(avg_lift, 2),
                    "maxLift":            round(max_lift, 2),
                    "rulesWithPositiveLift": len(lift_above_one),
                    "positivePercentage": round(
                        len(lift_above_one) / len(rules) * 100, 1
                    ) if rules else 0,
                    "strongRulesCount": len(strong_rules),
                    "strongRules": [
                        {
                            "rule": (
                                f"{', '.join(r['antecedent'])} → "
                                f"{', '.join(r['consequent'])}"
                            ),
                            "confidence": round(r["confidence"] * 100, 1),
                            "lift":       round(r["lift"], 2),
                        }
                        for r in strong_rules[:10]
                    ],
                },
            },
        ]
    }


# ══════════════════════════════════════════════════════════════════════════════
# SUGGEST ROUTE
# ══════════════════════════════════════════════════════════════════════════════

class SuggestBody(BaseModel):
    cart: list[str]


def _get_recommendations(
    frequent_itemsets: list[dict], current_cart: list[str]
) -> list[dict]:
    recs: dict[str, float] = {}
    for fi in frequent_itemsets:
        itemset = fi["items"]
        if (all(c in itemset for c in current_cart)
                and len(itemset) > len(current_cart)):
            for item in itemset:
                if item not in current_cart:
                    if item not in recs or recs[item] < fi["support"]:
                        recs[item] = fi["support"]
    return sorted(
        [{"item": item, "confidence": conf} for item, conf in recs.items()],
        key=lambda x: x["confidence"],
        reverse=True,
    )


@app.post("/api/suggest")
async def suggest(body: SuggestBody, x_user_id: str = Header(...)):
    if not body.cart:
        return {"recommendations": []}

    cursor = db["sales"].find({"user": ObjectId(x_user_id)})
    sales = [doc async for doc in cursor]

    if len(sales) < 2:
        return {
            "message": (
                "Not enough data to calculate suggestions. "
                "Add at least 2 transactions."
            ),
            "recommendations": [],
        }

    transactions = [list(s["items"]) for s in sales]
    min_support  = max(0.01, 2 / len(transactions))
    frequent     = _apriori(transactions, min_support)
    return {"recommendations": _get_recommendations(frequent, body.cart)}
