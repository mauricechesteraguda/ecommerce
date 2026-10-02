"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { trace, traceSync } from "../../observability/trace"

type Cart = { id: string; region?: { currency_code?: string }; items?: { id: string; title?: string; quantity: number; unit_price?: number }[]; subtotal?: number; shipping_total?: number; tax_total?: number; total?: number }
const money = (amount = 0, currency = "php") => traceSync("cart.money", () => new Intl.NumberFormat(currency === "php" ? "en-PH" : "en-US", { style: "currency", currency }).format(amount / 100))

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null); const [state, setState] = useState("loading"); const [error, setError] = useState("")
  const load = useCallback(async () => trace("cart.load", async () => { setState("loading"); try { const response = await fetch("/api/cart", { cache: "no-store" }); if (!response.ok) throw new Error("Cart unavailable"); setCart((await response.json()).cart); setState("ready") } catch (cause) { setError(cause instanceof Error ? cause.message : "Cart unavailable"); setState("error") } }), [])
  useEffect(() => { void load() }, [load])
  if (state === "loading") return <main className="account-shell"><p role="status">Loading cart…</p></main>
  if (state === "error") return <main className="account-shell"><p role="alert">{error}</p><button onClick={() => void load()}>Try again</button></main>
  if (!cart || !cart.items?.length) return <main className="account-shell"><h1>Your cart</h1><p>Your cart is empty.</p><Link href="/">Continue shopping</Link></main>
  const currency = cart.region?.currency_code ?? "php"
  return <main className="account-shell"><h1>Your cart</h1><ul aria-label="Cart items">{cart.items.map((item) => <li key={item.id}><strong>{item.title ?? "Product"}</strong> <span>{item.quantity} × {money(item.unit_price, currency)}</span></li>)}</ul><dl><dt>Subtotal</dt><dd>{money(cart.subtotal, currency)}</dd><dt>Shipping</dt><dd>{money(cart.shipping_total, currency)}</dd><dt>Tax</dt><dd>{money(cart.tax_total, currency)}</dd><dt>Total</dt><dd>{money(cart.total, currency)}</dd></dl></main>
}
