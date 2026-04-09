"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

// Quick filter presets for suggestions
const QUICK_FILTERS = [
  { label: "Milk", items: ["milk"] },
  { label: "Bread & Butter", items: ["bread", "butter"] },
  { label: "Coffee", items: ["coffee"] },
  { label: "Eggs & Bacon", items: ["eggs", "bacon"] },
  { label: "Pizza & Beer", items: ["pizza", "beer"] },
  { label: "Baby Items", items: ["diapers"] },
  { label: "Cereals", items: ["cereals"] },
  { label: "Fruits", items: ["apple"] },
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"overview" | "add" | "suggest" | "analysis">("overview");
  const [salesItems, setSalesItems] = useState("");
  const [cartItems, setCartItems] = useState("");
  const [suggestions, setSuggestions] = useState<{ item: string; confidence: number }[]>([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const [salesCount, setSalesCount] = useState(0);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "authenticated") fetchSales();
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  async function fetchSales() {
    try {
      const res = await fetch("/api/sales");
      if (res.ok) {
        const data = await res.json();
        setSalesCount(data.sales.length);
        setRecentSales(data.sales.slice(0, 8));
      }
    } catch {}
  }

  function notify(msg: string, type: "success" | "error" | "info" = "info") {
    setUploadStatus(msg);
    setStatusType(type);
    setTimeout(() => setUploadStatus(""), 5000);
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    const items = salesItems
      .split(",")
      .map((i) => i.trim().toLowerCase())
      .filter((i) => i);
    if (!items.length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesData: [items] }),
      });
      if (res.ok) {
        notify("Transaction added successfully!", "success");
        setSalesItems("");
        fetchSales();
      } else {
        const d = await res.json();
        notify(d.error || "Failed to add transaction", "error");
      }
    } catch {
      notify("Network error. Please try again.", "error");
    }
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        try {
          const rows = text.split("\n").filter((r) => r.trim());
          const salesData = rows.map((row) =>
            row
              .split(",")
              .map((i) => i.trim().toLowerCase())
              .filter((i) => i)
          ).filter((r) => r.length > 0);

          const res = await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ salesData }),
          });

          if (res.ok) {
            notify(`${salesData.length} transactions uploaded!`, "success");
            fetchSales();
          } else {
            notify("Upload failed. Check your file format.", "error");
          }
        } catch {
          notify("Error parsing file. Use CSV format: items separated by commas, one transaction per row.", "error");
        }
      }
      setLoading(false);
    };
    reader.readAsText(file);
  }

  async function handleLoadSample() {
    setLoading(true);
    try {
      const response = await fetch("/sample-sales.csv");
      const text = await response.text();

      const rows = text.split("\n").filter((r) => r.trim());
      const salesData = rows.map((row) =>
        row
          .split(",")
          .map((i) => i.trim().toLowerCase())
          .filter((i) => i)
      ).filter((r) => r.length > 0);

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesData }),
      });

      if (res.ok) {
        notify(`Loaded ${salesData.length} sample transactions!`, "success");
        fetchSales();
      } else {
        const d = await res.json();
        notify(d.error || "Failed to load sample data.", "error");
      }
    } catch {
      notify("Error loading sample data.", "error");
    }
    setLoading(false);
  }

  async function getSuggestions(cart?: string[]) {
    const items = cart || cartItems
      .split(",")
      .map((i) => i.trim().toLowerCase())
      .filter((i) => i);
    if (!items.length) return;

    setSuggestLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: items }),
      });
      const data = await res.json();
      setSuggestions(data.recommendations || []);
      if (data.message) setMessage(data.message);
      if (!cart) setCartItems(items.join(", "));
    } catch {
      setMessage("Failed to get suggestions.");
    }
    setSuggestLoading(false);
  }

  function handleQuickFilter(items: string[]) {
    setCartItems(items.join(", "));
    getSuggestions(items);
  }

  const navItems = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      id: "add" as const,
      label: "Add Data",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      ),
    },
    {
      id: "suggest" as const,
      label: "Suggestions",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
      ),
    },
    {
      id: "analysis" as const,
      label: "Analysis",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-56" : "w-16"} transition-all duration-200 border-r border-border flex flex-col bg-surface-card`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          {sidebarOpen && <span className="text-sm font-semibold tracking-tight truncate">MarketBasket</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-primary/10 text-primary-light"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface"
              }`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-border px-3 py-3">
          {sidebarOpen && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary-light flex items-center justify-center text-xs font-bold flex-shrink-0">
                {session?.user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{session?.user?.name}</p>
                <p className="text-[10px] text-text-muted truncate">{session?.user?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-muted hover:text-danger rounded transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {sidebarOpen && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-text-muted hover:text-text-secondary transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h1 className="text-sm font-semibold">
              {activeTab === "overview" && "Dashboard"}
              {activeTab === "add" && "Add Sales Data"}
              {activeTab === "suggest" && "Product Suggestions"}
              {activeTab === "analysis" && "DS Pipeline Analysis"}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="px-2 py-1 rounded-md bg-surface-card border border-border">{salesCount} transactions</span>
          </div>
        </div>

        {/* Toast notification */}
        {uploadStatus && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-lg border text-sm flex items-center gap-2 ${
            statusType === "success" ? "bg-success/10 border-success/20 text-success" :
            statusType === "error" ? "bg-danger/10 border-danger/20 text-danger" :
            "bg-primary/10 border-primary/20 text-primary-light"
          }`}>
            {statusType === "success" && "✓"}
            {statusType === "error" && "✕"}
            {statusType === "info" && "ℹ"}
            {uploadStatus}
          </div>
        )}

        <div className="p-6">
          {/* ============ OVERVIEW TAB ============ */}
          {activeTab === "overview" && (
            <div className="max-w-4xl">
              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="rounded-xl border border-border bg-surface-card p-5">
                  <p className="text-xs text-text-muted mb-1">Total Transactions</p>
                  <p className="text-2xl font-bold">{salesCount}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-card p-5">
                  <p className="text-xs text-text-muted mb-1">Unique Products</p>
                  <p className="text-2xl font-bold">
                    {new Set(recentSales.flatMap((s) => s.items)).size || "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-card p-5">
                  <p className="text-xs text-text-muted mb-1">Algorithm</p>
                  <p className="text-2xl font-bold">Apriori</p>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="rounded-xl border border-border bg-surface-card">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold">Recent Transactions</h2>
                  <button onClick={() => setActiveTab("add")} className="text-xs text-primary-light hover:underline">
                    + Add more
                  </button>
                </div>
                {recentSales.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm text-text-muted mb-3">No transactions yet</p>
                    <button onClick={() => setActiveTab("add")} className="px-4 py-2 text-xs font-medium bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors">
                      Add your first transaction
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentSales.map((sale, idx) => (
                      <div key={idx} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-md bg-primary/10 text-primary-light flex items-center justify-center text-xs font-bold">
                            {sale.items.length}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {sale.items.slice(0, 5).map((item: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-surface border border-border text-text-secondary">
                                {item}
                              </span>
                            ))}
                            {sale.items.length > 5 && (
                              <span className="px-2 py-0.5 text-xs text-text-muted">+{sale.items.length - 5} more</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-text-muted">
                          {new Date(sale.date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ ADD DATA TAB ============ */}
          {activeTab === "add" && (
            <div className="max-w-2xl space-y-6">
              {/* Manual entry */}
              <div className="rounded-xl border border-border bg-surface-card">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold">Manual Entry</h2>
                  <p className="text-xs text-text-muted mt-0.5">Add a single transaction by listing the items purchased together</p>
                </div>
                <form onSubmit={handleManualAdd} className="p-5">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Items purchased (comma separated)</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={salesItems}
                      onChange={(e) => setSalesItems(e.target.value)}
                      placeholder="e.g. milk, bread, eggs, butter"
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={loading || !salesItems.trim()}
                      className="px-5 py-2.5 text-sm font-medium bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      {loading ? "Adding…" : "Add"}
                    </button>
                  </div>
                </form>
              </div>

              {/* File upload */}
              <div className="rounded-xl border border-border bg-surface-card">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold">Bulk Upload</h2>
                  <p className="text-xs text-text-muted mt-0.5">Upload a CSV file — each row is one transaction, items separated by commas</p>
                </div>
                <div className="p-5">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <svg className="mx-auto mb-3 text-text-muted" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <label htmlFor="csv-upload" className="text-sm text-primary-light hover:underline cursor-pointer font-medium">
                      Choose a CSV file
                    </label>
                    <p className="text-xs text-text-muted mt-1">or drag and drop</p>
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-xs text-text-muted">OR</span>
                    <div className="h-px bg-border flex-1" />
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    disabled={loading}
                    className="mt-4 w-full py-2.5 text-sm font-medium border border-border hover:border-primary/30 rounded-lg transition-colors text-text-secondary hover:text-primary-light disabled:opacity-40"
                  >
                    {loading ? "Loading…" : "Load sample grocery dataset (25 transactions)"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============ SUGGESTIONS TAB ============ */}
          {activeTab === "suggest" && (
            <div className="max-w-3xl">
              {/* Quick filters */}
              <div className="mb-6">
                <p className="text-xs font-medium text-text-muted mb-3">Quick filters — click to see recommendations</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FILTERS.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickFilter(f.items)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface-card text-text-secondary hover:border-primary/40 hover:text-primary-light transition-colors"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom search */}
              <div className="rounded-xl border border-border bg-surface-card mb-6">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold">Custom Analysis</h2>
                  <p className="text-xs text-text-muted mt-0.5">Enter items in a customer&apos;s cart to see what else they might buy</p>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); getSuggestions(); }} className="p-5">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={cartItems}
                      onChange={(e) => setCartItems(e.target.value)}
                      placeholder="e.g. coffee, sugar"
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={suggestLoading || !cartItems.trim()}
                      className="px-5 py-2.5 text-sm font-medium bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      {suggestLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analyzing
                        </span>
                      ) : "Analyze"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Results */}
              {message && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                  {message}
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="rounded-xl border border-border bg-surface-card">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-sm font-semibold">
                      Recommended Products
                      <span className="ml-2 text-xs font-normal text-text-muted">
                        ({suggestions.length} found)
                      </span>
                    </h2>
                  </div>
                  <div className="divide-y divide-border">
                    {suggestions.map((s, idx) => {
                      const pct = Math.round(s.confidence * 100);
                      return (
                        <div key={idx} className="px-5 py-3.5 flex items-center justify-between group hover:bg-surface transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-md bg-primary/10 text-primary-light flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium capitalize">{s.item}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold min-w-[3rem] text-right ${
                              pct >= 50 ? "text-success" : pct >= 25 ? "text-warning" : "text-text-muted"
                            }`}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {suggestions.length === 0 && !message && !suggestLoading && cartItems && (
                <div className="rounded-xl border border-border bg-surface-card px-5 py-12 text-center">
                  <p className="text-sm text-text-muted">No recommendations found for this combination.</p>
                  <p className="text-xs text-text-muted mt-1">Try different items or add more transaction data.</p>
                </div>
              )}

              {!cartItems && suggestions.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-surface-card/50 px-5 py-12 text-center">
                  <svg className="mx-auto mb-3 text-text-muted" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                  <p className="text-sm text-text-muted">Select a quick filter above or enter custom items to get started</p>
                </div>
              )}
            </div>
          )}

          {/* ============ ANALYSIS TAB ============ */}
          {activeTab === "analysis" && (
            <div className="max-w-4xl">
              {!analysisData && !analysisLoading && (
                <div className="rounded-xl border border-dashed border-border bg-surface-card/50 px-5 py-16 text-center">
                  <svg className="mx-auto mb-3 text-text-muted" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <p className="text-sm text-text-secondary mb-4">Run the full Apriori data science pipeline on your transaction data</p>
                  <button
                    onClick={async () => {
                      setAnalysisLoading(true);
                      try {
                        const res = await fetch("/api/analysis");
                        const data = await res.json();
                        setAnalysisData(data);
                      } catch { setAnalysisData({ error: "Failed to load analysis" }); }
                      setAnalysisLoading(false);
                    }}
                    className="px-6 py-2.5 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                  >
                    Run Full Analysis
                  </button>
                </div>
              )}

              {analysisLoading && (
                <div className="rounded-xl border border-border bg-surface-card px-5 py-16 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-text-muted">Running Apriori algorithm on your data…</p>
                </div>
              )}

              {analysisData?.error && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                  {analysisData.error}
                </div>
              )}

              {analysisData?.steps && (
                <div className="space-y-6">
                  {/* Re-run button */}
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        setAnalysisLoading(true);
                        setAnalysisData(null);
                        try {
                          const res = await fetch("/api/analysis");
                          const data = await res.json();
                          setAnalysisData(data);
                        } catch { setAnalysisData({ error: "Failed" }); }
                        setAnalysisLoading(false);
                      }}
                      className="px-4 py-1.5 text-xs font-medium border border-border hover:border-primary/30 rounded-lg text-text-muted hover:text-primary-light transition-colors"
                    >
                      Re-run Analysis
                    </button>
                  </div>

                  {/* STEP 1: Data Summary */}
                  {analysisData.steps[0] && (() => {
                    const d = analysisData.steps[0].data;
                    return (
                      <div className="rounded-xl border border-border bg-surface-card">
                        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold">1</span>
                          <h2 className="text-sm font-semibold">Data Summary</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-5">
                          {[
                            ["Total Transactions", d.totalTransactions],
                            ["Unique Products", d.uniqueProducts],
                            ["Total Item Occurrences", d.totalItemOccurrences],
                            ["Avg Basket Size", d.avgBasketSize],
                            ["Min Basket Size", d.minBasketSize],
                            ["Max Basket Size", d.maxBasketSize],
                          ].map(([label, val], i) => (
                            <div key={i} className="p-3 rounded-lg bg-surface border border-border">
                              <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
                              <p className="text-lg font-bold mt-1">{val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* STEP 2: Item Frequency */}
                  {analysisData.steps[1] && (
                    <div className="rounded-xl border border-border bg-surface-card">
                      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold">2</span>
                        <h2 className="text-sm font-semibold">Item Frequency (Top 15)</h2>
                      </div>
                      <div className="p-5 space-y-2">
                        {analysisData.steps[1].data.map((item: any, i: number) => {
                          const maxFreq = analysisData.steps[1].data[0]?.frequency || 1;
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-text-muted w-24 truncate capitalize">{item.item}</span>
                              <div className="flex-1 h-5 bg-surface rounded-md overflow-hidden border border-border">
                                <div
                                  className="h-full bg-primary/60 rounded-md transition-all duration-700"
                                  style={{ width: `${(item.frequency / maxFreq) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-text-secondary w-8 text-right">{item.frequency}</span>
                              <span className="text-[10px] text-text-muted w-12 text-right">{item.support}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Transaction Size Distribution */}
                  {analysisData.steps[2] && (
                    <div className="rounded-xl border border-border bg-surface-card">
                      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold">3</span>
                        <h2 className="text-sm font-semibold">Transaction Size Distribution</h2>
                      </div>
                      <div className="p-5 flex items-end gap-2 h-40">
                        {Object.entries(analysisData.steps[2].data).sort(([a], [b]) => Number(a) - Number(b)).map(([size, count]: any) => {
                          const maxCount = Math.max(...Object.values(analysisData.steps[2].data).map(Number));
                          return (
                            <div key={size} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] text-text-muted">{count}</span>
                              <div className="w-full bg-primary/60 rounded-t-md transition-all" style={{ height: `${(count / maxCount) * 100}%` }} />
                              <span className="text-[10px] text-text-secondary">{size}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="px-5 pb-3 text-[10px] text-text-muted text-center">Number of items per transaction →</p>
                    </div>
                  )}

                  {/* STEP 4: Co-occurrence Matrix */}
                  {analysisData.steps[3] && (
                    <div className="rounded-xl border border-border bg-surface-card">
                      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold">4</span>
                        <h2 className="text-sm font-semibold">Co-occurrence Matrix (Top 12)</h2>
                      </div>
                      <div className="p-5 overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr>
                              <th className="p-1"></th>
                              {analysisData.steps[3].data.items.map((item: string) => (
                                <th key={item} className="p-1 text-text-muted font-medium capitalize truncate max-w-[60px]" style={{ writingMode: "vertical-rl" }}>{item}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.steps[3].data.items.map((row: string) => (
                              <tr key={row}>
                                <td className="p-1 text-text-secondary font-medium capitalize">{row}</td>
                                {analysisData.steps[3].data.items.map((col: string) => {
                                  const val = analysisData.steps[3].data.matrix[row]?.[col] || 0;
                                  const maxVal = Math.max(...analysisData.steps[3].data.items.flatMap((r: string) =>
                                    analysisData.steps[3].data.items.map((c: string) => analysisData.steps[3].data.matrix[r]?.[c] || 0)
                                  ));
                                  const intensity = maxVal > 0 ? val / maxVal : 0;
                                  return (
                                    <td key={col} className="p-1 text-center" style={{
                                      backgroundColor: val > 0 ? `rgba(124, 58, 237, ${intensity * 0.6})` : "transparent",
                                      color: intensity > 0.4 ? "white" : undefined,
                                    }}>
                                      {val || "·"}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Frequent Itemsets */}
                  {analysisData.steps[4] && (
                    <div className="rounded-xl border border-border bg-surface-card">
                      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold">5</span>
                        <h2 className="text-sm font-semibold">Frequent Itemsets (Apriori)</h2>
                        <span className="text-[10px] text-text-muted ml-auto">min_support = {analysisData.steps[4].data.minSupport}% · {analysisData.steps[4].data.total} found</span>
                      </div>
                      <div className="divide-y divide-border max-h-80 overflow-y-auto">
                        {analysisData.steps[4].data.itemsets.map((fi: any, i: number) => (
                          <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                                fi.length === 1 ? "bg-primary/20 text-primary-light" :
                                fi.length === 2 ? "bg-primary/10 text-primary-light" :
                                "bg-primary/5 text-primary-light"
                              }`}>{fi.length}</span>
                              <span className="text-xs capitalize">{fi.items.join(", ")}</span>
                            </div>
                            <span className="text-xs text-text-muted font-mono">{fi.support}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Association Rules */}
                  {analysisData.steps[5] && (
                    <div className="rounded-xl border border-border bg-surface-card">
                      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold">6</span>
                        <h2 className="text-sm font-semibold">Association Rules</h2>
                        <span className="text-[10px] text-text-muted ml-auto">min_confidence = {analysisData.steps[5].data.minConfidence}% · {analysisData.steps[5].data.total} rules</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border text-text-muted">
                              <th className="px-5 py-2.5 text-left font-medium">If Customer Buys</th>
                              <th className="px-3 py-2.5 text-center font-medium">→</th>
                              <th className="px-3 py-2.5 text-left font-medium">Then Also Buys</th>
                              <th className="px-3 py-2.5 text-right font-medium">Support</th>
                              <th className="px-3 py-2.5 text-right font-medium">Confidence</th>
                              <th className="px-5 py-2.5 text-right font-medium">Lift</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {analysisData.steps[5].data.rules.map((r: any, i: number) => (
                              <tr key={i} className="hover:bg-surface transition-colors">
                                <td className="px-5 py-2.5 capitalize font-medium">{r.if_buys}</td>
                                <td className="px-3 py-2.5 text-center text-text-muted">→</td>
                                <td className="px-3 py-2.5 capitalize">{r.then_buys}</td>
                                <td className="px-3 py-2.5 text-right text-text-muted font-mono">{r.support}%</td>
                                <td className="px-3 py-2.5 text-right font-mono">{r.confidence}%</td>
                                <td className={`px-5 py-2.5 text-right font-mono font-semibold ${
                                  r.lift >= 2 ? "text-success" : r.lift >= 1 ? "text-warning" : "text-danger"
                                }`}>{r.lift}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* STEP 7: Model Evaluation */}
                  {analysisData.steps[6] && (() => {
                    const ev = analysisData.steps[6].data;
                    return (
                      <div className="rounded-xl border border-border bg-surface-card">
                        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold">7</span>
                          <h2 className="text-sm font-semibold">Model Evaluation</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
                          {[
                            ["Total Rules", ev.totalRules],
                            ["Avg Confidence", `${ev.avgConfidence}%`],
                            ["Avg Lift", ev.avgLift],
                            ["Max Lift", ev.maxLift],
                            ["Positive Lift Rules", `${ev.rulesWithPositiveLift} (${ev.positivePercentage}%)`],
                            ["Strong Rules", ev.strongRulesCount],
                          ].map(([label, val], i) => (
                            <div key={i} className="p-3 rounded-lg bg-surface border border-border">
                              <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
                              <p className="text-sm font-bold mt-1">{val}</p>
                            </div>
                          ))}
                        </div>
                        {ev.strongRules.length > 0 && (
                          <div className="px-5 pb-5">
                            <p className="text-xs font-semibold mb-2 text-text-secondary">Strong Rules (confidence ≥ 50%, lift ≥ 1.5)</p>
                            <div className="space-y-1.5">
                              {ev.strongRules.map((r: any, i: number) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-success/5 border border-success/10 text-xs">
                                  <span className="capitalize">{r.rule}</span>
                                  <div className="flex gap-3 text-text-muted">
                                    <span>conf: {r.confidence}%</span>
                                    <span className="text-success font-semibold">lift: {r.lift}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
