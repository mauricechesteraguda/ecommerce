import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { trace, traceSync } from "../../../observability/trace"
import { runtimeEnv } from "../../../config/env"
import { AddToCart } from "../../../components/AddToCart"

// feature-10022026-Maurice: detail pages only expose published Medusa products and never invent stock.
// content-10032026-Maurice: keep product detail language marketplace-neutral and limited to supported facts.
type Product = { id: string; handle: string; title: string; description?: string; thumbnail?: string; images?: { url: string }[]; variants?: { id?: string; calculated_price?: { calculated_amount: number; currency_code: string }; inventory_quantity?: number }[] }
const API = runtimeEnv.NEXT_PUBLIC_MEDUSA_BACKEND_URL

function price(product: Product): string { return traceSync("catalog.detail.price", () => { const value = product.variants?.[0]?.calculated_price; return value ? new Intl.NumberFormat(value.currency_code === "php" ? "en-PH" : "en-US", { style: "currency", currency: value.currency_code.toUpperCase() }).format(value.calculated_amount / 100) : "Price unavailable" }) }

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  return trace("catalog.detail", async () => {
    const { handle } = await params
    const response = await fetch(`${API}/catalog?handle=${encodeURIComponent(handle)}&limit=1`, { headers: { Accept: "application/json", "x-publishable-api-key": runtimeEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY }, cache: "no-store" })
    if (!response.ok) notFound()
    const payload = await response.json() as { products?: Product[] }
    const product = payload.products?.[0]
    if (!product) notFound()
    const available = (product.variants ?? []).some((variant) => (variant.inventory_quantity ?? 0) > 0)
     return <main id="main-content" className="detail-shell"><Link href="/">← Back to catalog</Link><div className="detail"><div className="detail-images">{(product.images?.length ? product.images : [{ url: product.thumbnail ?? "/assets/aguda-deskworks.svg" }]).map((image) => <Image key={image.url} src={image.url} alt={`${product.title} detail`} width={800} height={800} />)}</div><div className="detail-copy"><p className="eyebrow">AGUDA MARKET / PRODUCT</p><h1>{product.title}</h1><p className="price">{price(product)}</p><p>{product.description}</p><p className={available ? "available" : "sold-out"}>{available ? "In stock · ready to ship" : "Out of stock · check back soon"}</p>{available ? <AddToCart variantId={product.variants?.[0]?.id} /> : <button className="button" disabled type="button">Unavailable</button>}<p className="field-help">Availability and totals are confirmed by the store at checkout.</p></div></div></main>
  })
}
