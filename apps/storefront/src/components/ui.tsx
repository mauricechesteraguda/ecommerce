"use client"

import Link from "next/link"
import { useState } from "react"
import { traceSync } from "../observability/trace"

// ui-10022026-Maurice: shared navigation and commerce primitives keep the blueprint language consistent.
// content-10032026-Maurice: rebrand shared navigation for a marketplace storefront.
export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return traceSync("ui.siteHeader.render", () => <header className="site-header"><a className="skip-link" href="#main-content">Skip to main content</a><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark">A▧</span><span>AGUDA<br /><b>MARKET</b></span></Link><button className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Menu"}</button><nav id="site-nav" className={open ? "site-nav is-open" : "site-nav"} aria-label="Primary navigation"><Link href="/">Catalog</Link><Link href="/cart">Cart</Link><Link href="/account">Account</Link><Link href="/account/orders">Orders</Link><Link href="/admin">Admin portal</Link></nav></div></header>)
}

export function Button({ children, secondary = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) { return <button className={secondary ? "button button-secondary" : "button"} {...props}>{children}</button> }
export function StatusChip({ status }: { status: string }) { return <span className={`status-chip status-${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span> }
export function Totals({ subtotal = 0, shipping = 0, tax = 0, total = 0, currency = "php" }: { subtotal?: number; shipping?: number; tax?: number; total?: number; currency?: string }) { const money = (value: number) => new Intl.NumberFormat(currency === "php" ? "en-PH" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(value / 100); return <dl className="totals"><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div><dt>Shipping</dt><dd>{money(shipping)}</dd></div><div><dt>Tax</dt><dd>{money(tax)}</dd></div><div className="total-line"><dt>Total</dt><dd>{money(total)}</dd></div></dl> }
