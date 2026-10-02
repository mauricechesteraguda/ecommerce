"use client"

import { useState } from "react"

export function AddToCart({ variantId }: { variantId?: string }) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  async function add(): Promise<void> {
    if (!variantId) return
    setBusy(true); setMessage("")
    try {
      const cartResponse = await fetch("/api/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) })
      const cartPayload = await cartResponse.json() as { cart?: { id?: string } }
      const cartId = cartPayload.cart?.id
      if (!cartResponse.ok || !cartId) throw new Error("Cart could not be prepared")
      const response = await fetch("/api/cart/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cart_id: cartId, variant_id: variantId, quantity: 1 }) })
      if (!response.ok) throw new Error("Item could not be added")
      setMessage("Added to your workbench.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Item could not be added") } finally { setBusy(false) }
  }
  return <><button className="button" disabled={!variantId || busy} type="button" onClick={() => void add()}>{busy ? "Adding…" : "Add to workbench"}</button><p role="status" aria-live="polite">{message}</p></>
}
