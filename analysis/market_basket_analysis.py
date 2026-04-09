"""
================================================================================
    MARKET BASKET ANALYSIS — Data Science & Mining Project
================================================================================

    Project  : Market Basket Analyzer (PWA)
    Algorithm: Apriori for Association Rule Mining
    Dataset  : Sample Grocery Store Transactions

    This script demonstrates the complete data science pipeline:
        1. Data Collection & Loading
        2. Data Preprocessing & Cleaning
        3. Exploratory Data Analysis (EDA)
        4. Transaction Encoding (One-Hot)
        5. Frequent Itemset Mining (Apriori Algorithm)
        6. Association Rule Generation
        7. Visualization of Results
        8. Model Evaluation & Interpretation

================================================================================
"""

# ─── Step 0: Import Libraries ─────────────────────────────────────────────────

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
from collections import Counter
import warnings

warnings.filterwarnings("ignore")
plt.style.use("ggplot")
sns.set_palette("viridis")

print("=" * 70)
print("   MARKET BASKET ANALYSIS — Data Science & Mining Project")
print("=" * 70)


# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: DATA COLLECTION & LOADING
# ──────────────────────────────────────────────────────────────────────────────

print("\n📦 STEP 1: Data Collection & Loading")
print("-" * 50)

# We simulate a realistic grocery store transaction dataset.
# In our web app, this data comes from user-uploaded CSV files
# or manual entries stored in MongoDB.

raw_transactions = [
    ["milk", "bread", "eggs"],
    ["milk", "bread", "butter"],
    ["bread", "butter", "cheese"],
    ["milk", "eggs", "cheese"],
    ["sugar", "coffee"],
    ["sugar", "coffee", "milk", "biscuits"],
    ["coffee", "bread", "butter"],
    ["bread", "eggs", "milk", "apple"],
    ["apple", "banana", "orange"],
    ["milk", "bread", "apple"],
    ["coffee", "sugar", "biscuits"],
    ["milk", "diapers", "baby wipes"],
    ["bread", "diapers", "baby wipes", "milk"],
    ["beer", "chips", "salsa"],
    ["beer", "chips"],
    ["pizza", "beer", "chips"],
    ["milk", "bread", "salsa"],
    ["coffee", "sugar", "milk", "cookies"],
    ["milk", "cereals"],
    ["cereals", "milk", "banana"],
    ["eggs", "bacon", "bread"],
    ["bacon", "eggs", "coffee"],
    ["milk", "bread", "butter", "eggs", "coffee"],
    ["pizza", "soda"],
    ["pizza", "soda", "chips"],
    ["milk", "bread", "butter", "jam"],
    ["tea", "sugar", "biscuits"],
    ["bread", "cheese", "ham"],
    ["milk", "cereals", "banana", "yogurt"],
    ["coffee", "milk", "sugar", "cream"],
    ["eggs", "bread", "milk", "juice"],
    ["beer", "chips", "popcorn"],
    ["pizza", "beer", "soda", "chips"],
    ["milk", "bread", "eggs", "cheese"],
    ["butter", "bread", "jam", "milk"],
    ["coffee", "sugar", "cream"],
    ["diapers", "baby wipes", "milk", "bread"],
    ["apple", "banana", "yogurt"],
    ["bacon", "eggs", "bread", "butter"],
    ["milk", "bread", "coffee", "sugar"],
]

# Convert to a DataFrame for analysis
df_transactions = pd.DataFrame(
    {"Transaction_ID": range(1, len(raw_transactions) + 1), "Items": raw_transactions}
)

print(f"   Total Transactions Loaded : {len(raw_transactions)}")
print(f"   Sample Transaction        : {raw_transactions[0]}")
print(f"\n   First 5 rows of the dataset:")
print(df_transactions.head().to_string(index=False))


# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: DATA PREPROCESSING & CLEANING
# ──────────────────────────────────────────────────────────────────────────────

print("\n\n🧹 STEP 2: Data Preprocessing & Cleaning")
print("-" * 50)

# 2a. Lowercase normalization (already done, but demonstrated here)
cleaned_transactions = []
for transaction in raw_transactions:
    cleaned = [item.strip().lower() for item in transaction]
    cleaned = list(set(cleaned))  # Remove duplicates within a transaction
    cleaned_transactions.append(cleaned)

# 2b. Compute basic stats
all_items = [item for t in cleaned_transactions for item in t]
unique_items = set(all_items)

print(f"   Total item occurrences    : {len(all_items)}")
print(f"   Unique items              : {len(unique_items)}")
print(f"   Avg items per transaction : {np.mean([len(t) for t in cleaned_transactions]):.2f}")
print(f"   Min basket size           : {min(len(t) for t in cleaned_transactions)}")
print(f"   Max basket size           : {max(len(t) for t in cleaned_transactions)}")
print(f"\n   All unique items: {sorted(unique_items)}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: EXPLORATORY DATA ANALYSIS (EDA)
# ──────────────────────────────────────────────────────────────────────────────

print("\n\n📊 STEP 3: Exploratory Data Analysis (EDA)")
print("-" * 50)

# 3a. Item Frequency Analysis
item_counts = Counter(all_items)
item_freq_df = pd.DataFrame(
    item_counts.most_common(), columns=["Item", "Frequency"]
)
item_freq_df["Support (%)"] = (
    item_freq_df["Frequency"] / len(cleaned_transactions) * 100
).round(2)

print("\n   Top 10 Most Frequent Items:")
print(item_freq_df.head(10).to_string(index=False))

# 3b. Transaction Size Distribution
basket_sizes = [len(t) for t in cleaned_transactions]
size_dist = Counter(basket_sizes)

print(f"\n   Transaction Size Distribution:")
for size in sorted(size_dist.keys()):
    bar = "█" * size_dist[size]
    print(f"     {size} items: {bar} ({size_dist[size]} transactions)")

# ─── Plot 1: Item Frequency Bar Chart ────────────────────────────────────────

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# Bar chart of top 15 items
top_items = item_freq_df.head(15)
axes[0].barh(top_items["Item"], top_items["Frequency"], color=sns.color_palette("viridis", 15))
axes[0].set_xlabel("Frequency", fontsize=12)
axes[0].set_ylabel("Product", fontsize=12)
axes[0].set_title("Top 15 Most Frequent Items", fontsize=14, fontweight="bold")
axes[0].invert_yaxis()

# Transaction size histogram
axes[1].hist(basket_sizes, bins=range(1, max(basket_sizes) + 2), 
             color="#7c3aed", edgecolor="white", alpha=0.85, align="left")
axes[1].set_xlabel("Number of Items", fontsize=12)
axes[1].set_ylabel("Number of Transactions", fontsize=12)
axes[1].set_title("Transaction Size Distribution", fontsize=14, fontweight="bold")
axes[1].set_xticks(range(1, max(basket_sizes) + 1))

plt.tight_layout()
plt.savefig("analysis/01_eda_item_frequency.png", dpi=150, bbox_inches="tight")
plt.show()
print("\n   ✅ Saved: analysis/01_eda_item_frequency.png")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 4: TRANSACTION ENCODING (One-Hot Encoding)
# ──────────────────────────────────────────────────────────────────────────────

print("\n\n🔢 STEP 4: Transaction Encoding (One-Hot)")
print("-" * 50)

# The Apriori algorithm requires a binary matrix where:
#   - Each row   = a transaction
#   - Each column = a product
#   - Value 1 means the product was in that transaction

te = TransactionEncoder()
te_array = te.fit(cleaned_transactions).transform(cleaned_transactions)
df_encoded = pd.DataFrame(te_array, columns=te.columns_)

print(f"   Encoded matrix shape: {df_encoded.shape}")
print(f"   (Rows = transactions, Columns = unique items)\n")
print("   Preview of One-Hot Encoded Data (first 5 transactions):")
print(df_encoded.head().to_string())

# ─── Plot 2: Heatmap of Item Co-occurrence ───────────────────────────────────

co_occurrence = df_encoded.T.dot(df_encoded)
np.fill_diagonal(co_occurrence.values, 0)

# Show only top 12 items for readability
top_12_items = item_freq_df.head(12)["Item"].tolist()
co_top = co_occurrence.loc[top_12_items, top_12_items]

plt.figure(figsize=(10, 8))
sns.heatmap(
    co_top, annot=True, fmt="d", cmap="YlOrRd",
    linewidths=0.5, square=True, cbar_kws={"label": "Co-occurrence Count"}
)
plt.title("Item Co-occurrence Matrix (Top 12 Products)", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.savefig("analysis/02_cooccurrence_heatmap.png", dpi=150, bbox_inches="tight")
plt.show()
print("   ✅ Saved: analysis/02_cooccurrence_heatmap.png")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 5: FREQUENT ITEMSET MINING (Apriori Algorithm)
# ──────────────────────────────────────────────────────────────────────────────

print("\n\n⚙️  STEP 5: Frequent Itemset Mining (Apriori Algorithm)")
print("-" * 50)

# The Apriori algorithm discovers item combinations that appear
# together frequently in transactions. The key parameter is
# `min_support` — the minimum fraction of transactions that must
# contain the itemset for it to be considered "frequent".

MIN_SUPPORT = 0.10  # 10% minimum support

print(f"   Minimum Support Threshold : {MIN_SUPPORT} ({MIN_SUPPORT*100:.0f}%)")
print(f"   This means an itemset must appear in at least "
      f"{int(MIN_SUPPORT * len(cleaned_transactions))} of "
      f"{len(cleaned_transactions)} transactions.\n")

frequent_itemsets = apriori(
    df_encoded, min_support=MIN_SUPPORT, use_colnames=True, max_len=4
)
frequent_itemsets["length"] = frequent_itemsets["itemsets"].apply(len)
frequent_itemsets = frequent_itemsets.sort_values("support", ascending=False)

print(f"   Total Frequent Itemsets Found: {len(frequent_itemsets)}")
print(f"\n   Frequent Itemsets (sorted by support):")
print(
    frequent_itemsets[["itemsets", "support", "length"]]
    .head(20)
    .to_string(index=False)
)

# ─── Plot 3: Support of Top Frequent Itemsets ────────────────────────────────

top_fi = frequent_itemsets.head(20).copy()
top_fi["itemsets_str"] = top_fi["itemsets"].apply(lambda x: ", ".join(sorted(x)))

plt.figure(figsize=(12, 6))
colors = ["#7c3aed" if l == 1 else "#a78bfa" if l == 2 else "#c4b5fd" 
          for l in top_fi["length"]]
plt.barh(top_fi["itemsets_str"], top_fi["support"], color=colors, edgecolor="white")
plt.xlabel("Support", fontsize=12)
plt.ylabel("Itemset", fontsize=12)
plt.title("Top 20 Frequent Itemsets by Support", fontsize=14, fontweight="bold")
plt.gca().invert_yaxis()

# Legend
from matplotlib.patches import Patch
legend_elements = [
    Patch(facecolor="#7c3aed", label="1-item"),
    Patch(facecolor="#a78bfa", label="2-item"),
    Patch(facecolor="#c4b5fd", label="3+ items"),
]
plt.legend(handles=legend_elements, loc="lower right")
plt.tight_layout()
plt.savefig("analysis/03_frequent_itemsets.png", dpi=150, bbox_inches="tight")
plt.show()
print("   ✅ Saved: analysis/03_frequent_itemsets.png")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 6: ASSOCIATION RULE GENERATION
# ──────────────────────────────────────────────────────────────────────────────

print("\n\n🔗 STEP 6: Association Rule Generation")
print("-" * 50)

# Association rules are generated from frequent itemsets.
# Key metrics:
#   - Confidence: P(Y|X) — probability of buying Y given X is bought
#   - Lift:       How much more likely Y is when X is present vs random
#                 lift > 1 = positive correlation
#                 lift = 1 = independent
#                 lift < 1 = negative correlation
#   - Conviction: Sensitivity to rule direction

MIN_CONFIDENCE = 0.3  # 30% minimum confidence

rules = association_rules(
    frequent_itemsets, metric="confidence", min_threshold=MIN_CONFIDENCE
)
rules = rules.sort_values("lift", ascending=False)

print(f"   Minimum Confidence Threshold: {MIN_CONFIDENCE} ({MIN_CONFIDENCE*100:.0f}%)")
print(f"   Total Association Rules Found: {len(rules)}")

# Format for display
rules_display = rules[
    ["antecedents", "consequents", "support", "confidence", "lift"]
].copy()
rules_display["antecedents"] = rules_display["antecedents"].apply(
    lambda x: ", ".join(sorted(x))
)
rules_display["consequents"] = rules_display["consequents"].apply(
    lambda x: ", ".join(sorted(x))
)
rules_display.columns = ["If Customer Buys", "Then Also Buys", "Support", "Confidence", "Lift"]

print(f"\n   Top 20 Association Rules (sorted by Lift):")
print(rules_display.head(20).to_string(index=False))


# ──────────────────────────────────────────────────────────────────────────────
# STEP 7: VISUALIZATION OF RESULTS
# ──────────────────────────────────────────────────────────────────────────────

print("\n\n📈 STEP 7: Visualization of Results")
print("-" * 50)

# ─── Plot 4: Scatter Plot — Support vs Confidence colored by Lift ────────────

plt.figure(figsize=(10, 7))
scatter = plt.scatter(
    rules["support"],
    rules["confidence"],
    c=rules["lift"],
    cmap="plasma",
    s=rules["lift"] * 60,
    alpha=0.7,
    edgecolors="white",
    linewidths=0.5,
)
plt.colorbar(scatter, label="Lift")
plt.xlabel("Support", fontsize=12)
plt.ylabel("Confidence", fontsize=12)
plt.title("Association Rules: Support vs Confidence (size & color = Lift)",
          fontsize=14, fontweight="bold")
plt.tight_layout()
plt.savefig("analysis/04_support_vs_confidence.png", dpi=150, bbox_inches="tight")
plt.show()
print("   ✅ Saved: analysis/04_support_vs_confidence.png")

# ─── Plot 5: Top 15 Rules by Lift ────────────────────────────────────────────

top_rules = rules.head(15).copy()
top_rules["rule"] = top_rules.apply(
    lambda r: f"{', '.join(sorted(r['antecedents']))} → {', '.join(sorted(r['consequents']))}",
    axis=1,
)

plt.figure(figsize=(12, 7))
bars = plt.barh(top_rules["rule"], top_rules["lift"], color="#7c3aed", edgecolor="white")
plt.axvline(x=1, color="red", linestyle="--", alpha=0.5, label="Lift = 1 (independent)")
plt.xlabel("Lift", fontsize=12)
plt.ylabel("Rule (Antecedent → Consequent)", fontsize=12)
plt.title("Top 15 Association Rules by Lift", fontsize=14, fontweight="bold")
plt.legend()
plt.gca().invert_yaxis()
plt.tight_layout()
plt.savefig("analysis/05_top_rules_by_lift.png", dpi=150, bbox_inches="tight")
plt.show()
print("   ✅ Saved: analysis/05_top_rules_by_lift.png")

# ─── Plot 6: Confidence vs Lift with rule annotations ────────────────────────

plt.figure(figsize=(10, 7))
plt.scatter(
    rules["confidence"], rules["lift"],
    c="#7c3aed", s=100, alpha=0.6, edgecolors="white"
)

# Annotate top 5 rules
for i, row in rules.head(5).iterrows():
    label = f"{', '.join(sorted(row['antecedents']))}→{', '.join(sorted(row['consequents']))}"
    plt.annotate(
        label,
        (row["confidence"], row["lift"]),
        textcoords="offset points",
        xytext=(10, 5),
        fontsize=8,
        arrowprops=dict(arrowstyle="->", color="gray"),
    )

plt.axhline(y=1, color="red", linestyle="--", alpha=0.4)
plt.xlabel("Confidence", fontsize=12)
plt.ylabel("Lift", fontsize=12)
plt.title("Confidence vs Lift (annotated top 5 rules)", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.savefig("analysis/06_confidence_vs_lift.png", dpi=150, bbox_inches="tight")
plt.show()
print("   ✅ Saved: analysis/06_confidence_vs_lift.png")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 8: MODEL EVALUATION & INTERPRETATION
# ──────────────────────────────────────────────────────────────────────────────

print("\n\n🎯 STEP 8: Model Evaluation & Interpretation")
print("-" * 50)

# Summary statistics of the rules
print(f"\n   ── Rule Quality Summary ──")
print(f"   Total rules generated     : {len(rules)}")
print(f"   Avg Confidence            : {rules['confidence'].mean():.3f}")
print(f"   Avg Lift                  : {rules['lift'].mean():.3f}")
print(f"   Max Lift                  : {rules['lift'].max():.3f}")
print(f"   Rules with Lift > 1       : {(rules['lift'] > 1).sum()} "
      f"({(rules['lift'] > 1).mean()*100:.1f}%)")
print(f"   Rules with Confidence > 50%: {(rules['confidence'] > 0.5).sum()}")

# Strong rules (both high confidence and high lift)
strong_rules = rules[(rules["confidence"] >= 0.5) & (rules["lift"] >= 1.5)]
print(f"\n   ── Strong Rules (confidence ≥ 50%, lift ≥ 1.5) ──")
print(f"   Found: {len(strong_rules)} strong rules\n")

if len(strong_rules) > 0:
    for _, row in strong_rules.iterrows():
        ant = ", ".join(sorted(row["antecedents"]))
        con = ", ".join(sorted(row["consequents"]))
        print(f"   • {ant} → {con}")
        print(f"     Confidence: {row['confidence']:.1%}  |  "
              f"Lift: {row['lift']:.2f}  |  "
              f"Support: {row['support']:.1%}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 9: PRACTICAL RECOMMENDATION DEMO
# ──────────────────────────────────────────────────────────────────────────────

print("\n\n🛒 STEP 9: Practical Recommendation Demo")
print("-" * 50)
print("   Simulating the recommendation engine used in the web app:\n")


def recommend_products(cart_items, rules_df, top_n=5):
    """
    Given a list of items in a customer's cart, find association rules
    where the antecedent is a subset of the cart, and recommend the
    consequent items (not already in the cart).
    """
    cart_set = set(item.lower() for item in cart_items)
    recommendations = {}

    for _, row in rules_df.iterrows():
        antecedent = set(row["antecedents"])
        consequent = set(row["consequents"])

        # Check if antecedent is a subset of the cart
        if antecedent.issubset(cart_set):
            # Suggest items not already in the cart
            new_items = consequent - cart_set
            for item in new_items:
                if item not in recommendations or recommendations[item] < row["lift"]:
                    recommendations[item] = row["lift"]

    # Sort by lift and return top N
    sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
    return sorted_recs[:top_n]


# Demo: Test with different carts
test_carts = [
    ["milk"],
    ["bread", "butter"],
    ["coffee", "sugar"],
    ["eggs", "bacon"],
    ["pizza", "beer"],
    ["diapers"],
]

for cart in test_carts:
    recs = recommend_products(cart, rules)
    print(f"   Cart: {cart}")
    if recs:
        for item, lift in recs:
            confidence_bar = "█" * int(min(lift, 10))
            print(f"     → Recommend: {item:15s} (lift: {lift:.2f}) {confidence_bar}")
    else:
        print(f"     → No strong recommendations found")
    print()


# ──────────────────────────────────────────────────────────────────────────────
# STEP 10: CONCLUSIONS
# ──────────────────────────────────────────────────────────────────────────────

print("=" * 70)
print("   CONCLUSIONS")
print("=" * 70)
print("""
   1. DATA COLLECTION: We collected {n_trans} transactions containing
      {n_items} unique products from a simulated grocery store.

   2. EDA: 'milk' and 'bread' are the most frequently purchased items.
      Average basket size is {avg_basket:.1f} items.

   3. APRIORI ALGORITHM: With min_support = {min_sup:.0%}, we found
      {n_fi} frequent itemsets. With min_confidence = {min_conf:.0%},
      we generated {n_rules} association rules.

   4. KEY INSIGHT: {pct_pos:.0f}% of rules have lift > 1, indicating
      genuine positive associations between products.

   5. PRACTICAL APPLICATION: This model is deployed in our Market Basket
      Analyzer PWA, where users upload sales data and receive real-time
      product pairing recommendations powered by the Apriori algorithm.

   6. BUSINESS VALUE: Retailers can use these insights to:
      - Optimize product placement (put associated items nearby)
      - Design bundle promotions (e.g., bread + butter discounts)
      - Improve cross-selling recommendations in e-commerce
""".format(
    n_trans=len(cleaned_transactions),
    n_items=len(unique_items),
    avg_basket=np.mean([len(t) for t in cleaned_transactions]),
    min_sup=MIN_SUPPORT,
    n_fi=len(frequent_itemsets),
    min_conf=MIN_CONFIDENCE,
    n_rules=len(rules),
    pct_pos=(rules["lift"] > 1).mean() * 100,
))

print("   All plots saved to the 'analysis/' folder.")
print("=" * 70)
