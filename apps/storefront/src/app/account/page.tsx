// feature-10022026-Maurice: accessible customer account UI delegates identity storage to Medusa.
// content-10032026-Maurice: replace workspace-specific account labels with neutral marketplace language.
"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { trace, traceSync } from "../../observability/trace"
import { Button } from "../../components/ui"

type Session = { actor_id?: string; auth_identity_id?: string }

async function medusa(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  return trace(`account.medusa.${path}`, async () => {
    const method = init.method === "DELETE" ? "DELETE" : "POST"
    const response = await fetch(`/api/account/medusa?path=${encodeURIComponent(path)}`, { ...init, method, credentials: "include", headers: { "content-type": "application/json", Accept: "application/json", ...(init.headers ?? {}) } })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) throw new Error("We could not complete that request. Check your details and try again.")
    return payload
  })
}

export default function AccountPage() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [session, setSession] = useState<Session | null>(null)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => { void trace("account.session.load", async () => { const response = await fetch("/api/account/session", { credentials: "include" }); setSession(response.ok ? { actor_id: "authenticated" } : null) }) }, [])

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await trace("account.form.submit", async () => {
      setBusy(true); setMessage("")
      try {
        // feature-10022026-Maurice: registration JWTs have no actor until the
        // customer is created; re-authenticate before creating the native session.
        let auth: Record<string, unknown>
        if (mode === "register") {
          const registration = await medusa("/auth/customer/emailpass/register", { method: "POST", body: JSON.stringify({ email, password }) })
          await medusa("/store/customers", { method: "POST", headers: { Authorization: `Bearer ${String(registration.token ?? "")}` }, body: JSON.stringify({ email }) })
          auth = await medusa("/auth/customer/emailpass", { method: "POST", body: JSON.stringify({ email, password }) })
        } else auth = await medusa("/auth/customer/emailpass", { method: "POST", body: JSON.stringify({ email, password }) })
        const token = String(auth.token ?? "")
        const loggedIn = await medusa("/auth/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
        setSession(loggedIn.user as Session); setPassword(""); setMessage("You are signed in.")
      } catch (error) { setMessage(error instanceof Error ? error.message : "We could not sign you in.") }
      finally { setBusy(false) }
    })
  }

  async function logout(): Promise<void> { await trace("account.logout", async () => { setBusy(true); try { await medusa("/auth/session", { method: "DELETE" }); setSession(null); setMessage("You are signed out.") } finally { setBusy(false) } }) }

  return traceSync("account.page.render", () => <main id="main-content" className="account-shell"><p className="eyebrow">AGUDA MARKET / ACCOUNT</p><h1>Your account</h1>{session?.actor_id ? <section aria-live="polite"><p>You are signed in and ready to view your orders.</p><Button type="button" onClick={() => void logout()} disabled={busy}>Sign out</Button><Link className="button button-secondary" href="/account/orders">View order history</Link></section> : <form onSubmit={(event) => void submit(event)} aria-describedby="account-message"><h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2><div id="form-errors" className={message && !session ? "summary-error" : "summary-error"} hidden={!message}><strong>We need another look.</strong><p>{message}</p></div><label htmlFor="account-email">Email<input id="account-email" name="email" type="email" autoComplete="email" required aria-describedby="email-help" value={email} onChange={(event) => setEmail(event.target.value)} /><span id="email-help" className="field-help">Use the email for your orders.</span></label><label htmlFor="account-password">Password<input id="account-password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required aria-describedby="password-help" value={password} onChange={(event) => setPassword(event.target.value)} /><span id="password-help" className="field-help">At least 8 characters.</span></label><Button type="submit" disabled={busy}>{busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}</Button><Button secondary type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage("") }}>{mode === "login" ? "Create an account" : "Already have an account? Sign in"}</Button><p id="account-message" role="status" aria-live="polite">{message}</p></form>}</main>)
}
