import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">MarketBasket</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 lg:px-12 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-primary/30 bg-primary/10 text-primary-light text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Powered by the Apriori Algorithm
        </div>

        <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight max-w-3xl">
          Turn sales data into
          <span className="text-primary-light"> smart product
          recommendations</span>
        </h1>

        <p className="mt-6 text-lg text-text-secondary max-w-2xl leading-relaxed">
          Upload your transaction history or enter sales manually. Our market basket analysis engine discovers hidden purchase patterns and tells you exactly which products to recommend together.
        </p>

        <div className="flex items-center gap-4 mt-10">
          <Link href="/register" className="px-6 py-3 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-lg transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]">
            Start analyzing free →
          </Link>
          <Link href="/login" className="px-6 py-3 text-sm font-medium text-text-secondary border border-border hover:border-text-muted rounded-lg transition-colors">
            I have an account
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-20">
          {[
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              ),
              title: "Upload or Enter Data",
              desc: "Import CSV files or manually add transactions. Supports any retail or e-commerce dataset."
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              ),
              title: "Apriori ML Engine",
              desc: "Automatically mines frequent itemsets and association rules from your transaction history."
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              ),
              title: "Real-time Suggestions",
              desc: "Get instant product recommendations as you build a cart. See confidence scores for each pairing."
            },
          ].map((f, i) => (
            <div key={i} className="p-5 rounded-xl border border-border bg-surface-card hover:border-primary/30 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary-light flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 px-6 lg:px-12 py-6">
        <p className="text-xs text-text-muted text-center">
          Data Science &amp; Mining Project · Market Basket Analysis using Apriori Algorithm
        </p>
      </footer>
    </div>
  );
}
