// setup-10022026-Maurice: official starter landing page only; no business logic in Ticket 02.
"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { trace, traceSync } from "../observability/trace"
import { Button } from "../components/ui"

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

   return <main id="main-content" className="catalog-shell">
      <header className="catalog-header"><p className="eyebrow">Blueprint workshop / Manila</p><h1>Useful things, beautifully made.</h1><p>Desk companions shaped for focused workdays, from a Filipino studio that believes the tools around you should earn their place.</p><p className="annotation">DW—001 / 3 objects in the current issue</p></header>
     <section className="catalog-controls" aria-label="Catalog filters"><label htmlFor="catalog-search">Search <input id="catalog-search" value={query} onChange={(event) => { setPage(0); setQuery(event.target.value) }} placeholder="Find a desk companion" /></label><label htmlFor="catalog-category">Category <input id="catalog-category" value={category} onChange={(event) => { setPage(0); setCategory(event.target.value) }} placeholder="Collection ID" /></label><label htmlFor="catalog-currency">Currency <select id="catalog-currency" value={currency} onChange={(event) => { setPage(0); setCurrency(event.target.value) }}><option value="PHP">PHP ₱</option><option value="USD">USD $</option></select></label></section>
    {status === "loading" && <p role="status" className="state">Loading catalog…</p>}
     {status === "error" && <div className="state error" role="alert"><p>{error}</p><Button secondary onClick={() => setPage((current) => current)}>Try again</Button></div>}
     {status === "ready" && visible.length === 0 && <div className="state"><p role="status">No deskworks match that search.</p><Button secondary onClick={() => { setQuery(""); setCategory("") }}>Clear filters</Button></div>}
     {status === "ready" && visible.length > 0 && <div className="product-grid">{visible.map((product) => <article className="product-card" key={product.id}><a href={`/products/${product.handle}`}><Image src={product.thumbnail ?? product.images?.[0]?.url ?? "/assets/aguda-deskworks.svg"} alt={`${product.title} product details`} width={800} height={800} /><h2>{product.title}</h2></a><p className="utility">{displayPrice(product, currency)}</p><p className={inStock(product) ? "available" : "sold-out"}>{inStock(product) ? "Available to ship" : "Currently unavailable"}</p></article>)}</div>}
     <nav className="pagination" aria-label="Pagination"><Button secondary disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="utility" aria-live="polite">Sheet {page + 1} of {pageCount}</span><Button secondary disabled={(page + 1) >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button></nav>
  </main>
}
