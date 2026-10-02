// setup-10022026-Maurice: official starter landing page only; no business logic in Ticket 02.
"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { trace, traceSync } from "../observability/trace"

// feature-10022026-Maurice: catalog listing is deliberately read-only and delegates pricing/inventory to Medusa.
type Product = { id: string; handle: string; title: string; description?: string; thumbnail?: string; images?: { url: string }[]; variants?: { calculated_price?: { calculated_amount: number; currency_code: string }; inventory_quantity?: number }[]; collection?: { title: string } }
type CatalogResponse = { products: Product[]; count: number; offset: number; limit: number }

const API = ""

function normalize(value: string): string { return traceSync("catalog.normalize", () => value.trim().toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")) }
function displayPrice(product: Product, currency: string): string {
  return traceSync("catalog.displayPrice", () => {
  const price = product.variants?.find((variant) => variant.calculated_price?.currency_code?.toUpperCase() === currency)?.calculated_price ?? product.variants?.[0]?.calculated_price
  if (!price) return "Price unavailable"
  return new Intl.NumberFormat(currency === "PHP" ? "en-PH" : "en-US", { style: "currency", currency: price.currency_code }).format(price.calculated_amount / 100)
  })
}
function inStock(product: Product): boolean { return traceSync("catalog.inStock", () => (product.variants ?? []).some((variant) => (variant.inventory_quantity ?? 0) > 0)) }

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [count, setCount] = useState(0)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [currency, setCurrency] = useState("PHP")
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState("")
  const limit = 2

  useEffect(() => {
    let cancelled = false
    void trace("catalog.load", async () => {
      setStatus("loading")
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit), currency_code: currency.toLowerCase() })
      if (category) params.set("collection_id", category)
      if (query.trim()) params.set("q", normalize(query))
      try {
        const response = await fetch(`${API}/api/catalog?${params}`, { headers: { Accept: "application/json" } })
        if (!response.ok) throw new Error(`Catalog request failed (${response.status})`)
        const payload = await response.json() as CatalogResponse
        if (!cancelled) { setProducts(payload.products ?? []); setCount(payload.count ?? 0); setStatus("ready") }
      } catch (cause) {
        if (!cancelled) { setError(cause instanceof Error ? cause.message : "Unable to load catalog"); setStatus("error") }
      }
    })
    return () => { cancelled = true }
  }, [category, currency, page, query])

  const visible = useMemo(() => { const term = normalize(query); return term ? products.filter((product) => normalize(`${product.title} ${product.description ?? ""}`).includes(term)) : products }, [products, query])
  const pageCount = Math.max(1, Math.ceil(count / limit))

  return <main className="catalog-shell">
     <header className="catalog-header"><p className="eyebrow">AGUDA DESKWORKS</p><h1>Useful things, beautifully made.</h1><p>Original desk companions for focused workdays.</p><p><a href="/account">Sign in or create an account</a></p></header>
    <section className="catalog-controls" aria-label="Catalog filters"><label>Search <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a desk companion" /></label><label>Category <input value={category} onChange={(event) => { setPage(0); setCategory(event.target.value) }} placeholder="Collection ID" /></label><label>Currency <select value={currency} onChange={(event) => { setPage(0); setCurrency(event.target.value) }}><option value="PHP">PHP ₱</option><option value="USD">USD $</option></select></label></section>
    {status === "loading" && <p role="status" className="state">Loading catalog…</p>}
    {status === "error" && <p role="alert" className="state error">{error}</p>}
    {status === "ready" && visible.length === 0 && <p className="state">No deskworks match that search.</p>}
    {status === "ready" && visible.length > 0 && <div className="product-grid">{visible.map((product) => <article className="product-card" key={product.id}><a href={`/products/${product.handle}`}><Image src={product.thumbnail ?? product.images?.[0]?.url ?? "/assets/aguda-deskworks.svg"} alt="" width={800} height={800} /><h2>{product.title}</h2></a><p>{displayPrice(product, currency)}</p><p className={inStock(product) ? "available" : "sold-out"}>{inStock(product) ? "Available" : "Currently unavailable"}</p></article>)}</div>}
    <nav className="pagination" aria-label="Pagination"><button disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page + 1} of {pageCount}</span><button disabled={(page + 1) >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></nav>
  </main>
}
