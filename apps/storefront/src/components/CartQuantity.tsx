"use client"

import { useState } from "react"

export function CartQuantity({ cartId, lineItemId, initialQuantity }: { cartId: string; lineItemId: string; initialQuantity: number }) {
  const [quantity, setQuantity] = useState(initialQuantity)
  const [busy, setBusy] = useState(false)
  async function update(next: number): Promise<void> {
    if (next < 1 || busy) return
    setBusy(true)
    try {
      const response = await fetch("/api/cart/items", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ cart_id: cartId, line_item_id: lineItemId, quantity: next }) })
      if (response.ok) setQuantity(next)
    } finally { setBusy(false) }
  }
  return <span className="utility" aria-label="Quantity"><button type="button" aria-label="Decrease quantity" disabled={busy || quantity <= 1} onClick={() => void update(quantity - 1)}>−</button> {quantity} <button type="button" aria-label="Increase quantity" disabled={busy} onClick={() => void update(quantity + 1)}>+</button></span>
}
