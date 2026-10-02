import { batchLinksWorkflow, createLocationFulfillmentSetWorkflow, createServiceZonesWorkflow, createShippingOptionsWorkflow, updateShippingOptionsWorkflow } from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { logger } from "../observability/logger"
import { trace } from "../observability/trace"

// fulfillment-10022026-team1: Medusa's configured manual provider resolves to this
// native id. The stock-location link is required separately from module registration.
export const MANUAL_FULFILLMENT_PROVIDER_ID = "manual_manual"
export const DEFAULT_WAREHOUSE = "Default Warehouse"

export type NativeShippingOption = { id: string; name: string; amount: number; currency_code: string; countries: string[] }

type NativeLocation = { id: string }

async function loadLocation(stockLocations: any): Promise<NativeLocation> {
  const locations = await stockLocations.listStockLocations({ name: DEFAULT_WAREHOUSE })
  const location = locations[0] as NativeLocation | undefined
  if (!location?.id) throw new Error(`${DEFAULT_WAREHOUSE} is required before shipping setup`)
  return location
}

export async function ensureNativeShippingOption(scope: any, option: NativeShippingOption): Promise<string> {
  return trace(`fulfillment.ensure.${option.id}`, async () => {
    const fulfillment = scope.resolve(Modules.FULFILLMENT) as any
    const stockLocations = scope.resolve(Modules.STOCK_LOCATION) as any
    let location = await trace(`fulfillment.location.lookup.${option.id}`, () => loadLocation(stockLocations))

    try {
      await trace(`fulfillment.provider.link.${option.id}`, () => batchLinksWorkflow(scope).run({ input: { create: [{ [Modules.STOCK_LOCATION]: { stock_location_id: location.id }, [Modules.FULFILLMENT]: { fulfillment_provider_id: MANUAL_FULFILLMENT_PROVIDER_ID } }] } }))
      logger.info({ event: "fulfillment.provider.linked", location_id: location.id, provider_id: MANUAL_FULFILLMENT_PROVIDER_ID }, "native fulfillment provider linked")
    } catch (error) {
      if (!/already exists|duplicate|unique/i.test(error instanceof Error ? error.message : String(error))) throw error
      logger.info({ event: "fulfillment.provider.link.exists", location_id: location.id, provider_id: MANUAL_FULFILLMENT_PROVIDER_ID }, "native fulfillment provider link already exists")
    }

    let set = (await fulfillment.listFulfillmentSets({})).find((candidate: any) => candidate.name === `${DEFAULT_WAREHOUSE} Shipping` && candidate.type === "shipping")
    if (!set) {
      await trace(`fulfillment.set.create.${option.id}`, () => createLocationFulfillmentSetWorkflow(scope).run({ input: { location_id: location.id, fulfillment_set_data: { name: `${DEFAULT_WAREHOUSE} Shipping`, type: "shipping" } } }))
      set = (await fulfillment.listFulfillmentSets({})).find((candidate: any) => candidate.name === `${DEFAULT_WAREHOUSE} Shipping` && candidate.type === "shipping")
    }
    if (!set?.id) throw new Error("Default Warehouse shipping fulfillment set is required")

    let zone = (await fulfillment.listServiceZones({})).find((candidate: any) => candidate.name === `Aguda ${option.countries[0].toUpperCase()}` && candidate.fulfillment_set_id === set.id)
    if (!zone) {
      const created = await trace(`fulfillment.zone.create.${option.id}`, () => createServiceZonesWorkflow(scope).run({ input: { data: [{ name: `Aguda ${option.countries[0].toUpperCase()}`, fulfillment_set_id: set!.id, geo_zones: option.countries.map((country_code) => ({ type: "country", country_code })) }] } }))
      zone = (created as any).result?.[0]
    }
    if (!zone?.id) throw new Error(`Shipping zone for ${option.countries[0]} is required`)

    const profiles = await fulfillment.listShippingProfiles({ name: "Default Shipping Profile" })
    const createdProfile = profiles[0] ?? await fulfillment.createShippingProfiles({ name: "Default Shipping Profile", type: "default" })
    const profile = Array.isArray(createdProfile) ? createdProfile[0] : createdProfile
    const products = scope.resolve(Modules.PRODUCT) as any
    for (const product of await products.listProducts({})) {
      if (!product.id) continue
      try {
        await trace(`fulfillment.productProfile.link.${product.id}`, () => batchLinksWorkflow(scope).run({ input: { create: [{ [Modules.PRODUCT]: { product_id: product.id }, [Modules.FULFILLMENT]: { shipping_profile_id: profile.id } }] } }))
      } catch (error) {
        if (!/already exists|duplicate|unique/i.test(error instanceof Error ? error.message : String(error))) throw error
      }
    }
    const existing = await fulfillment.listShippingOptions({ name: option.name })
    if (existing[0]?.id) {
      if (existing[0].provider_id !== MANUAL_FULFILLMENT_PROVIDER_ID || existing[0].service_zone_id !== zone.id || existing[0].shipping_profile_id !== profile.id) {
        await trace(`fulfillment.option.repair.${option.id}`, () => updateShippingOptionsWorkflow(scope).run({ input: [{ id: existing[0].id, provider_id: MANUAL_FULFILLMENT_PROVIDER_ID, service_zone_id: zone.id, shipping_profile_id: profile.id }] }))
        logger.info({ event: "fulfillment.option.repaired", option_id: existing[0].id, provider_id: MANUAL_FULFILLMENT_PROVIDER_ID }, "native shipping option relationship repaired")
      }
      return existing[0].id
    }

    const created = await trace(`fulfillment.option.create.${option.id}`, () => createShippingOptionsWorkflow(scope).run({ input: [{ name: option.name, service_zone_id: zone.id, shipping_profile_id: profile.id, provider_id: MANUAL_FULFILLMENT_PROVIDER_ID, type: { label: option.name, description: option.name, code: option.id }, price_type: "flat", prices: [{ amount: option.amount, currency_code: option.currency_code }] }] }))
    return (created as any).result[0].id
  })
}
