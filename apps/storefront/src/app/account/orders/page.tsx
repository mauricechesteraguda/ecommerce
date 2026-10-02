// feature-10022026-Maurice: Ticket 08 customer-owned history delegates status truth to native Medusa orders.
"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { trace } from "../../../observability/trace"
import { Button, StatusChip } from "../../../components/ui"

type Order = { id: string; display_id?: string | number; created_at?: string; total?: number; currency_code?: string; status: string; items?: { id: string; title?: string; quantity?: number; unit_price?: number }[] }

export default function OrderHistoryPage() {
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error" | "expired">("loading")
  const [orders, setOrders] = useState<Order[]>([])
  const [offset, setOffset] = useState(0)
  const limit = 10
  useEffect(() => { void trace("account.orders.load", async () => { try { const response = await fetch(`/api/account/orders?limit=${limit}&offset=${offset}`, { credentials: "include", headers: { Accept: "application/json" } }); if (response.status === 401) { setState("expired"); return }; if (!response.ok) throw new Error("request failed"); const payload = await response.json() as { orders?: Order[]; count?: number }; setOrders(payload.orders ?? []); setState((payload.count ?? 0) === 0 ? "empty" : "ready") } catch { setState("error") } }) }, [offset])
   if (state === "loading") return <main id="main-content" className="account-shell"><p role="status">Loading orders…</p></main>
   if (state === "expired") return <main id="main-content" className="account-shell"><h1>Orders</h1><p role="alert">Your session expired. Please sign in again.</p><Link className="button" href="/account">Sign in</Link></main>
   if (state === "error") return <main id="main-content" className="account-shell"><h1>Orders</h1><p role="alert">We could not load your orders.</p><Button type="button" onClick={() => { setState("loading"); setOffset(offset) }}>Try again</Button></main>
   if (state === "empty") return <main id="main-content" className="account-shell"><h1>Orders</h1><p className="state">No orders yet.</p><Link className="button" href="/">Continue shopping</Link></main>
   return <main id="main-content" className="account-shell"><p className="eyebrow">Member ledger</p><h1>Your orders</h1><div aria-live="polite">{orders.map((order) => <article key={order.id} className="order-card"><h2><Link href={`/account/orders/${order.id}`}>Order {order.display_id ?? order.id}</Link></h2><p><StatusChip status={order.status} />{order.created_at ? ` · ${new Date(order.created_at).toLocaleDateString()}` : ""}</p><ul>{(order.items ?? []).map((item) => <li key={item.id}>{item.title ?? "Item"} × {item.quantity ?? 1}</li>)}</ul></article>)}</div><nav className="pagination" aria-label="Order history pagination"><Button secondary type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Previous</Button><span className="utility">Page {Math.floor(offset / limit) + 1}</span><Button secondary type="button" disabled={orders.length < limit} onClick={() => setOffset(offset + limit)}>Next</Button></nav></main>
}
