import { ApiKeyType, Modules } from "@medusajs/framework/utils"
import { batchLinksWorkflow, createApiKeysWorkflow, createInventoryLevelsWorkflow, createProductsWorkflow, createStockLocationsWorkflow, linkProductsToSalesChannelWorkflow, linkSalesChannelsToApiKeyWorkflow, linkSalesChannelsToStockLocationWorkflow } from "@medusajs/core-flows"
import { chmodSync, chownSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { logger } from "../observability/logger"
import { trace } from "../observability/trace"
import { ensureNativeShippingOption } from "../fulfillment/native-shipping"
import { SHIPPING_OPTIONS } from "../checkout/service"

// feature-10022026-Maurice: idempotent native Medusa product-module seed for the two storefront currencies.
const catalog = [
  { handle: "tide-desk-mat", title: "Tide Desk Mat", category: "Desk surfaces", description: "A generous recycled-felt mat that gives your daily tools a calm place to land.", sku: "AGUDA-TIDE-MAT", php: 245000, usd: 4200, stock: 24, image: "/assets/aguda-deskworks.svg" },
  { handle: "quiet-hour-timer", title: "Quiet Hour Timer", category: "Focus tools", description: "A small, tactile timer for protecting one uninterrupted hour of good work.", sku: "AGUDA-QUIET-TIMER", php: 185000, usd: 3400, stock: 18, image: "/assets/aguda-deskworks.svg" },
  { handle: "orbit-cable-rest", title: "Orbit Cable Rest", category: "Desk surfaces", description: "A weighted rest that keeps charging cables exactly where your hand expects them.", sku: "AGUDA-ORBIT-REST", php: 95000, usd: 1800, stock: 40, image: "/assets/aguda-deskworks.svg" },
]

type SeedContext = { container: { resolve: (key: unknown) => unknown } }

export default async function seed({ container }: SeedContext): Promise<void> {
  await trace("seedCatalog", async () => {
    const regions = container.resolve(Modules.REGION) as { listRegions: (query: Record<string, unknown>) => Promise<unknown[]>; createRegions: (data: Record<string, unknown>) => Promise<unknown> }
    const products = container.resolve(Modules.PRODUCT) as { listProducts: (query: Record<string, unknown>) => Promise<unknown[]>; updateProducts?: (...data: any[]) => Promise<unknown>; listProductCollections?: (query: Record<string, unknown>) => Promise<unknown[]>; createProductCollections?: (data: Record<string, unknown>) => Promise<unknown> }
    const salesChannels = container.resolve(Modules.SALES_CHANNEL) as { listSalesChannels: (query: Record<string, unknown>) => Promise<unknown[]> }
    const apiKeys = container.resolve(Modules.API_KEY) as { listApiKeys: (query: Record<string, unknown>) => Promise<unknown[]> }
    const inventory = container.resolve(Modules.INVENTORY) as { listInventoryItems?: (query: Record<string, unknown>) => Promise<unknown[]>; listInventoryLevels?: (query: Record<string, unknown>) => Promise<unknown[]>; deleteInventoryItems?: (ids: string[]) => Promise<void> }
    const stockLocations = container.resolve(Modules.STOCK_LOCATION) as { listStockLocations: (query: Record<string, unknown>) => Promise<unknown[]> }
    logger.info({ event: "catalog.seed.enter", product_count: catalog.length }, "seeding native Medusa catalog")
    const defaultChannel = (await trace("seedCatalog.salesChannel.lookup", async () => salesChannels.listSalesChannels({ name: "Default Sales Channel" })))[0] as { id?: string } | undefined
    const channelId = defaultChannel?.id
    if (!channelId) throw new Error("Default Sales Channel is required before provisioning the storefront publishable key")
    const keyFile = process.env.PUBLISHABLE_KEY_FILE
    const existingKeys = await trace("seedCatalog.publishableKey.lookup", async () => apiKeys.listApiKeys({ title: "Local Storefront" }))
    let publishableKey = (Array.isArray(existingKeys) ? existingKeys[0] : undefined) as { id?: string } | undefined
    let rawToken: string | undefined
    if (!publishableKey) {
      const created = await trace("seedCatalog.publishableKey.create", async () => createApiKeysWorkflow(container as any).run({ input: { api_keys: [{ title: "Local Storefront", type: ApiKeyType.PUBLISHABLE, created_by: "compose-setup" }] } }))
      publishableKey = (created as any)?.result?.[0] as { id?: string; token?: string } | undefined
      rawToken = (publishableKey as { token?: string } | undefined)?.token
    }
    if (!publishableKey?.id) throw new Error("Unable to provision the storefront publishable key")
    const publishableKeyId = publishableKey.id
    await trace("seedCatalog.publishableKey.link", async () => linkSalesChannelsToApiKeyWorkflow(container as any).run({ input: { id: publishableKeyId, add: [channelId] } }))
    if (keyFile && rawToken) {
      mkdirSync(dirname(keyFile), { recursive: true })
      writeFileSync(keyFile, `${rawToken}\n`, { mode: 0o640 })
      chmodSync(keyFile, 0o640)
      if (process.getuid?.() === 0) chownSync(keyFile, 1001, 1001)
    }
    const existingLocations = await trace("seedCatalog.stockLocation.lookup", async () => stockLocations.listStockLocations({ name: "Default Warehouse" }))
    const createdLocations = existingLocations[0] ? undefined : await trace("seedCatalog.stockLocation.create", async () => createStockLocationsWorkflow(container as any).run({ input: { locations: [{ name: "Default Warehouse" }] } }))
    const locationId = ((existingLocations[0] ?? (createdLocations as any)?.result?.[0]) as { id?: string } | undefined)?.id
    if (locationId && channelId) await trace("seedCatalog.stockLocation.linkChannel", async () => linkSalesChannelsToStockLocationWorkflow(container as any).run({ input: { id: locationId, add: [channelId] } }))
    for (const region of [{ name: "Philippines", currency_code: "php", countries: ["ph"] }, { name: "United States", currency_code: "usd", countries: ["us"] }]) {
      const found = await trace(`seedCatalog.region.lookup.${region.currency_code}`, async () => regions.listRegions({ currency_code: region.currency_code }))
      const currentRegion = ((Array.isArray(found) && found[0]) ?? await trace(`seedCatalog.region.create.${region.currency_code}`, async () => regions.createRegions(region))) as { id?: string }
      if (currentRegion?.id) {
        for (const providerId of ["pp_system_default", "pp_stripe_stripe"]) {
          try {
            await trace(`seedCatalog.region.paymentProvider.link.${region.currency_code}.${providerId}`, async () => batchLinksWorkflow(container as any).run({ input: { create: [{ [Modules.REGION]: { region_id: currentRegion.id }, [Modules.PAYMENT]: { payment_provider_id: providerId } }] } }))
          } catch (error) {
            if (!/already exists|duplicate|unique/i.test(error instanceof Error ? error.message : String(error))) throw error
            logger.info({ event: "catalog.seed.regionPaymentProvider.exists", region_id: currentRegion.id, provider_id: providerId }, "native region payment provider link already exists")
          }
        }
      }
    }
    const categories = new Map<string, string>()
    if (products.listProductCollections && products.createProductCollections) {
      for (const category of [...new Set(catalog.map((item) => item.category))]) {
        const found = await trace(`seedCatalog.category.lookup.${category}`, async () => products.listProductCollections?.({ title: category }) as unknown as unknown[] | undefined)
        const collection = (Array.isArray(found) ? found[0] : undefined) as { id?: string } | undefined
        const created = collection ?? await trace(`seedCatalog.category.create.${category}`, async () => products.createProductCollections?.({ title: category, handle: category.toLowerCase().replaceAll(" ", "-") }) as unknown as { id?: string } | undefined)
        if (created?.id) categories.set(category, created.id)
      }
    }
    for (const item of catalog) {
      const existing = await trace(`seedCatalog.lookup.${item.handle}`, async () => products.listProducts({ handle: item.handle }))
      if (Array.isArray(existing) && existing.length > 0) {
        if (products.updateProducts) await trace(`seedCatalog.update.${item.handle}`, async () => products.updateProducts?.((existing[0] as { id: string }).id, { metadata: { catalog_stock: item.stock } } as any))
        if (channelId) await trace(`seedCatalog.salesChannel.link.${item.handle}`, async () => linkProductsToSalesChannelWorkflow(container as any).run({ input: { id: channelId, add: [(existing[0] as { id: string }).id] } }))
        logger.info({ event: "catalog.seed.skip", handle: item.handle }, "catalog product already present")
        continue
      }
      const orphaned = inventory.listInventoryItems && await trace(`seedCatalog.inventory.lookup.${item.sku}`, async () => inventory.listInventoryItems?.({ sku: item.sku }))
      if (Array.isArray(orphaned) && orphaned.length > 0 && inventory.deleteInventoryItems) await trace(`seedCatalog.inventory.repair.${item.sku}`, async () => inventory.deleteInventoryItems?.(orphaned.map((entry) => (entry as { id: string }).id)))
      const created = await trace(`seedCatalog.create.${item.handle}`, async () => createProductsWorkflow(container as any).run({ input: { products: [{ handle: item.handle, title: item.title, description: item.description, collection_id: categories.get(item.category), metadata: { catalog_stock: item.stock }, status: "published", images: [{ url: item.image }], options: [{ title: "Edition", values: ["Standard"] }], variants: [{ title: item.title, sku: item.sku, manage_inventory: true, options: { Edition: "Standard" }, prices: [{ amount: item.php, currency_code: "php" }, { amount: item.usd, currency_code: "usd" }] }] }] } }))
      const createdProduct = (created as { products?: { id: string }[] }).products?.[0]
      if (channelId && createdProduct?.id) await trace(`seedCatalog.salesChannel.link.${item.handle}`, async () => linkProductsToSalesChannelWorkflow(container as any).run({ input: { id: channelId, add: [createdProduct.id] } }))
      logger.info({ event: "catalog.seed.created", handle: item.handle, stock: item.stock }, "catalog product created")
    }
    for (const option of SHIPPING_OPTIONS) await ensureNativeShippingOption(container, option)
    if (locationId && inventory.listInventoryItems && inventory.listInventoryLevels) {
      for (const item of catalog) {
        const inventoryItems = await trace(`seedCatalog.inventory.level.lookup.${item.sku}`, async () => inventory.listInventoryItems?.({ sku: item.sku }))
        for (const inventoryItem of inventoryItems ?? []) {
          const inventoryItemId = (inventoryItem as { id?: string }).id
          if (!inventoryItemId) continue
          const levels = await trace(`seedCatalog.inventory.levels.${item.sku}`, async () => inventory.listInventoryLevels?.({ inventory_item_id: inventoryItemId, location_id: locationId }))
          if (!levels?.length) await trace(`seedCatalog.inventory.level.create.${item.sku}`, async () => createInventoryLevelsWorkflow(container as any).run({ input: { inventory_levels: [{ inventory_item_id: inventoryItemId, location_id: locationId, stocked_quantity: item.stock }] } }))
        }
      }
    }
    logger.info({ event: "catalog.seed.exit" }, "native Medusa catalog seed complete")
  })
}
