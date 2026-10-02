import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { logger } from "../../observability/logger"
import { trace } from "../../observability/trace"

// feature-10022026-Maurice: catalog facade reads only native Medusa product records, avoiding parallel commerce models.
function normalize(value: string): string { return value.trim().toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "") }

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("catalog.api.GET", async () => {
    const service = req.scope.resolve(Modules.PRODUCT) as { listProducts: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<any[]> }
    const query = req.scope.resolve("query") as unknown as { graph: (input: Record<string, unknown>) => Promise<{ data: any[] }> }
    const limit = Math.min(Math.max(Number(req.query.limit ?? 8) || 8, 1), 24)
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0)
    const handle = typeof req.query.handle === "string" ? req.query.handle : undefined
    const q = typeof req.query.q === "string" ? normalize(req.query.q) : ""
    const currency = typeof req.query.currency_code === "string" ? req.query.currency_code.toLowerCase() : undefined
    const collectionId = typeof req.query.collection_id === "string" ? req.query.collection_id : undefined
    logger.info({ event: "catalog.api.entry", limit, offset, has_query: Boolean(q), has_handle: Boolean(handle) }, "catalog request")
    const products = await trace("catalog.api.medusa.listProducts", async () => service.listProducts({ status: "published", ...(handle ? { handle } : {}) }, { relations: ["variants", "images", "collection"], take: 1000 }))
    const priced = await trace("catalog.api.medusa.graphPrices", async () => query.graph({ entity: "product", fields: ["id", "variants.price_set.prices.*"] }))
    const priceByVariant = new Map<string, any[]>()
    for (const product of priced.data ?? []) for (const variant of product.variants ?? []) priceByVariant.set(variant.id, variant.price_set?.prices ?? [])
    const filtered = products.filter((product: any) => !collectionId || product.collection_id === collectionId).filter((product: any) => !q || normalize(`${product.title ?? ""} ${product.description ?? ""}`).includes(q))
    const page = filtered.slice(offset, offset + limit).map((product) => ({ ...product, variants: (product.variants ?? []).map((variant: any) => { const prices = priceByVariant.get(variant.id) ?? []; const selected = prices.find((price) => price.currency_code === currency) ?? prices[0]; return { ...variant, calculated_price: selected ? { calculated_amount: selected.amount, currency_code: selected.currency_code } : undefined, inventory_quantity: variant.inventory_quantity ?? Number(product.metadata?.catalog_stock ?? 0) } }) }))
    res.json({ products: page, count: filtered.length, offset, limit })
    logger.info({ event: "catalog.api.exit", count: filtered.length, returned: page.length }, "catalog response")
  })
}
