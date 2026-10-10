"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { trace } from "../../../../observability/trace"

type Order = { id: string; display_id?: string | number; status: string; created_at?: string; total?: number; currency_code?: string; items?: { id: string; title?: string; quantity?: number; unit_price?: number; total?: number }[] }

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const [state, setState] = useState<"loading" | "ready" | "missing" | "expired" | "error">("loading")
  const [order, setOrder] = useState<Order>()
  useEffect(() => { void trace("account.order_detail.load", async () => { try { const response = await fetch(`/api/account/orders?order_id=${encodeURIComponent(params.id)}`, { credentials: "include", headers: { Accept: "application/json" } }); if (response.status === 401) { setState("expired"); return }; if (!response.ok) throw new Error("request failed"); const payload = await response.json() as { orders?: Order[] }; const found = payload.orders?.[0]; setOrder(found); setState(found ? "ready" : "missing") } catch { setState("error") } }) }, [params.id])
  if (state === "loading") return <main className="account-shell"><p role="status">Loading order…</p></main>
  if (state === "expired") return <main className="account-shell"><h1>Order</h1><p role="alert">Your session expired. Please sign in again.</p><Link href="/account">Sign in</Link></main>
  if (state === "missing") return <main className="account-shell"><h1>Order not found</h1><p>This order is not available for your account.</p><Link href="/account/orders">Back to orders</Link></main>
  if (state === "error" || !order) return <main className="account-shell"><h1>Order</h1><p role="alert">We could not load this order.</p><Link href="/account/orders">Back to orders</Link></main>
  return <main className="account-shell"><p className="eyebrow">ORDER {order.display_id ?? order.id}</p><h1>Order details</h1><p><strong>{order.status}</strong>{order.created_at ? ` · ${new Date(order.created_at).toLocaleDateString()}` : ""}</p><ul>{(order.items ?? []).map((item) => <li key={item.id}>{item.title ?? "Item"} × {item.quantity ?? 1} {item.total !== undefined ? `- ${item.total}` : ""}</li>)}</ul><Link href="/account/orders">Back to orders</Link></main>
}
