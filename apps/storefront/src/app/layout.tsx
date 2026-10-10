import { trace } from "../observability/trace"
import "./globals.css"
import { SiteHeader } from "../components/ui"
// content-10032026-Maurice: update the shared footer to the AGUDA MARKET brand.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return trace("RootLayout", async () => <html lang="en"><body><SiteHeader />{children}<footer className="site-footer"><span>AGUDA MARKET / MANILA</span><span>SHOP EVERYDAY ESSENTIALS · 2026</span></footer></body></html>) }
