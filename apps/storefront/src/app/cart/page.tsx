"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { trace, traceSync } from "../../observability/trace"
import { Button, Totals } from "../../components/ui"

type Cart = { id: string; region?: { currency_code?: string }; items?: { id: string; title?: string; quantity: number; unit_price?: number }[]; subtotal?: number; shipping_total?: number; tax_total?: number; total?: number }
const money = (amount = 0, currency = "php") => traceSync("cart.money", () => new Intl.NumberFormat(currency === "php" ? "en-PH" : "en-US", { style: "currency", currency }).format(amount / 100))

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null); const [state, setState] = useState("loading"); const [error, setError] = useState("")
  const load = useCallback(async () => trace("cart.load", async () => { setState("loading"); try { const response = await fetch("/api/cart", { cache: "no-store" }); if (!response.ok) throw new Error("Cart unavailable"); setCart((await response.json()).cart); setState("ready") } catch (cause) { setError(cause instanceof Error ? cause.message : "Cart unavailable"); setState("error") } }), [])
  useEffect(() => { void load() }, [load])
   if (state === "loading") return <main id="main-content" className="account-shell"><p role="status">Loading cart…</p></main>
   if (state === "error") return <main id="main-content" className="account-shell"><p role="alert">{error}</p><Button onClick={() => void load()}>Try again</Button></main>
   if (!cart || !cart.items?.length) return <main id="main-content" className="account-shell"><p className="eyebrow">Your workbench</p><h1>Your cart</h1><p>Your cart is empty. Start with one useful object.</p><Link className="button" href="/">Continue shopping</Link></main>
  const currency = cart.region?.currency_code ?? "php"
   return <main id="main-content" className="account-shell"><p className="eyebrow">Your workbench</p><h1>Your cart</h1><ul aria-label="Cart items" className="stack">{cart.items.map((item) => <li className="order-card" key={item.id}><strong>{item.title ?? "Product"}</strong><span className="utility">{item.quantity} × {money(item.unit_price, currency)}</span></li>)}</ul><Totals subtotal={cart.subtotal} shipping={cart.shipping_total} tax={cart.tax_total} total={cart.total} currency={currency} /><Link className="button" href="/checkout">Continue to checkout</Link></main>
}
