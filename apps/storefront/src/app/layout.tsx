// setup-10022026-Maurice: accessible starter shell; commerce flows are intentionally deferred.
import { trace } from "../observability/trace"
import "./globals.css"
// feature-10022026-Maurice: catalog storefront shell uses the Medusa store API.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return trace("RootLayout", async () => <html lang="en"><body>{children}</body></html>) }
