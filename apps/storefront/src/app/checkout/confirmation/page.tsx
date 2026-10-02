"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { trace } from "../../../observability/trace"
import { StatusChip } from "../../../components/ui"

type Order = { id: string; display_id?: string | number; status?: string; payment_status?: string; created_at?: string }

// ui-10022026-Maurice: confirmation polls customer-owned orders; redirect state never implies payment.
export default function ConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "waiting" | "error">("loading")
  useEffect(() => { let cancelled = false; let attempts = 0; const poll = async () => { await trace("checkout.confirmation.poll", async () => { try { const response = await fetch("/api/account/orders?limit=1&offset=0", { cache: "no-store", credentials: "include" }); if (!response.ok) throw new Error("Order status unavailable"); const payload = await response.json() as { orders?: Order[] }; const latest = payload.orders?.[0] ?? null; if (cancelled) return; setOrder(latest); const paid = latest?.payment_status === "captured" || latest?.payment_status === "paid" || latest?.status === "paid"; if (paid) setState("ready"); else if (attempts < 5) { attempts += 1; setState("waiting"); window.setTimeout(poll, 1500) } else setState("waiting") } catch { if (!cancelled) setState("error") } }) }; void poll(); return () => { cancelled = true } }, [])
  return <main id="main-content" className="account-shell"><p className="eyebrow">Verification desk / webhook truth</p><h1>{state === "ready" ? "Order confirmed." : "Checking your order."}</h1>{state === "loading" && <p role="status">Reading the latest order state from the store…</p>}{state === "error" && <div role="alert" className="summary-error"><strong>We could not read order status.</strong><p>Your payment has not been marked complete by this page. Try again from your orders.</p></div>}{state === "waiting" && <p role="status">Payment is still being verified by the provider. This page will not guess. {order ? <StatusChip status={order.payment_status ?? order.status ?? "pending"} /> : null}</p>}{state === "ready" && order && <section className="order-card"><p className="utility">Order {order.display_id ?? order.id}</p><StatusChip status={order.payment_status ?? order.status ?? "paid"} /><p>Your payment is confirmed by the store. We’ll keep the order status here as it moves.</p></section>}<p><Link className="button button-secondary" href="/account/orders">View order history</Link></p></main>
}
