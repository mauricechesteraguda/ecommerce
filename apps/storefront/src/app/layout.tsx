import { trace } from "../observability/trace"
import "./globals.css"
import { SiteHeader } from "../components/ui"
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return trace("RootLayout", async () => <html lang="en"><body><SiteHeader />{children}<footer className="site-footer"><span>AGUDA DESKWORKS / MANILA</span><span>BLUEPRINT WORKSHOP · 10—26</span></footer></body></html>) }
