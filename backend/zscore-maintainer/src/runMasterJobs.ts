import { DateTime } from "luxon";
import { schedule, ScheduledTask } from "node-cron";
import { ObjectId } from 'mongodb'
import { ZScoreMaintainerOptionsRepository } from "./DB/Repositories/ZScoreMaintainerOptionsRepository";
import { httpRequest, tryAndWait } from "@monorepo/utils";
import { ProductSaleRepository } from "./DB/Repositories/ProductSaleRepository";
import { ProductViewRepository } from "./DB/Repositories/ProductViewRepository";
import { ProductSaleRangeRepository } from "./DB/Repositories/ProductSaleRangeRepository";
import { ProductViewRangeRepository } from "./DB/Repositories/ProductViewRangeRepository";
import { ProductRepository } from "./DB/Repositories/ProductRepository";

let failedJob: ScheduledTask | undefined = undefined
let salesJob: ScheduledTask | undefined = undefined
let viewsJob: ScheduledTask | undefined = undefined

export function runMasterJobs() {
    // A job for failed product sale ranges
    failedJob = schedule(
        '0 0 */2 * * *',
        async () => {
            console.time()
            console.log(`running cron job: "maintain sales z-score" at ${DateTime.utc().toISO()}...`)

            try {
                const productRepository = new ProductRepository()
            } catch (e) {
                console.error(e)
            }

            console.log('done')
            console.timeEnd()
        },
        { name: 'maintain sales z-score', runOnInit: true, timezone: 'UTC' })

    // A job for collecting product sale ranges and assigning them to slaves
    salesJob = schedule(
        '0 0 */4 * * *',
        async () => {
            console.time()
            console.log(`running cron job: "maintain sales z-score" at ${DateTime.utc().toISO()}...`)

            try {
                const zScoreMaintainerOptionsRepository = new ZScoreMaintainerOptionsRepository();
                const productSaleRepository = new ProductSaleRepository()
                const productSaleRangeRepository = new ProductSaleRangeRepository()

                // Validation
                const options = await getOptions(zScoreMaintainerOptionsRepository)
                if (!options) {
                    console.warn('Options not found!')
                    return
                }

                if (!options?.addresses) {
                    console.warn('No slave found!')
                    return
                }

                const addresses: {
                    host: string;
                    port: number;
                }[] = []
                for (let i = 0; i < options.addresses.length; i++) {
                    const v = options.addresses[i];

                    const result = await httpRequest({ host: v.host, port: v.port, path: '/heart-beat' })
                    if (result.response.statusCode && result.response.statusCode >= 200)
                        addresses.push(v)
                }
                if (addresses.length === 0)
                    throw new Error('No slave found!')

                const count = await productSaleRepository.getEstimatedCount()
                if (count === false) {
                    console.warn('Failed to count productSale documents.')
                    return
                }
                console.log(`productSale documents estimated counts: ${count}`)
                if (count === 0)
                    return

                const lastProductSaleObjectId = await productSaleRepository.getLastProductSaleId()
                if (lastProductSaleObjectId === undefined)
                    throw new Error('Failed to get the last productSale document id.')
                const lastProductSaleId = ObjectId.createFromHexString(lastProductSaleObjectId)

                const lastProductSaleRangeId = await productSaleRangeRepository.getLastProductSaleRangeId()

                const cursor: ObjectId | undefined = lastProductSaleRangeId ? ObjectId.createFromHexString(lastProductSaleRangeId) : undefined
                let i = 0
                while (cursor === undefined || cursor < lastProductSaleId) {
                    // Get productSales documents
                    const productSales = await productSaleRepository.getProductSales(10_000, cursor?.toString())
                    if (productSales.length === 0)
                        break

                    const range = [productSales[0]._id.toString(), productSales[productSales.length - 1]._id.toString()]
                    // Track this range in db
                    if (!await tryAndWait((async () => {
                        const result = await productSaleRangeRepository.create({ duration: 14400, count: productSales.length, min: range[0], max: range[1] }, DateTime.utc().toUnixInteger())
                        if (result === false)
                            throw new Error('failed to track this range in db')
                    })))
                        throw new Error('failed to track this range in db')

                    // Assign this range to a slave
                    const result = await deliverTaskToSlave(addresses[i % addresses.length].host, addresses[i % addresses.length].port, { min: range[0], max: range[1] }, productSales.length, true)
                    if (result !== true)
                        throw new Error('failed to deliver this range to a slave')

                    i++
                }
            } catch (e) {
                console.error(e)
            }

            console.log('done')
            console.timeEnd()
        },
        { name: 'maintain sales count', runOnInit: true, timezone: 'UTC' })

    viewsJob = schedule(
        '0 0 */4 * * *',
        async () => {
            console.time()
            console.log(`running cron job: "maintain views z-score" at ${DateTime.utc().toISO()}...`)

            try {
                const zScoreMaintainerOptionsRepository = new ZScoreMaintainerOptionsRepository();
                const productViewRepository = new ProductViewRepository()
                const productViewRangeRepository = new ProductViewRangeRepository()

                // Validation
                const options = await getOptions(zScoreMaintainerOptionsRepository)
                if (!options) {
                    console.warn('Options not found!')
                    return
                }

                if (!options?.addresses) {
                    console.warn('No slave found!')
                    return
                }

                const addresses: {
                    host: string;
                    port: number;
                }[] = []
                for (let i = 0; i < options.addresses.length; i++) {
                    const v = options.addresses[i];

                    const result = await httpRequest({ host: v.host, port: v.port, path: '/heart-beat' })
                    if (result.response.statusCode && result.response.statusCode >= 200)
                        addresses.push(v)
                }
                if (addresses.length === 0)
                    throw new Error('No slave found!')

                const count = await productViewRepository.getEstimatedCount()
                if (count === false) {
                    console.warn('Failed to count productView documents.')
                    return
                }
                console.log(`productView documents estimated counts: ${count}`)
                if (count === 0)
                    return

                const lastProductViewObjectId = await productViewRepository.getLastProductViewId()
                if (lastProductViewObjectId === undefined)
                    throw new Error('Failed to get the last productView document id.')
                const lastProductViewId = ObjectId.createFromHexString(lastProductViewObjectId)

                const lastProductViewRangeId = await productViewRangeRepository.getLastProductViewRangeId()

                const cursor: ObjectId | undefined = lastProductViewRangeId ? ObjectId.createFromHexString(lastProductViewRangeId) : undefined
                let i = 0
                while (cursor === undefined || cursor < lastProductViewId) {
                    // Get productViews documents
                    const productViews = await productViewRepository.getProductViews(10_000, cursor?.toString())
                    if (productViews.length === 0)
                        break

                    const range = [productViews[0]._id.toString(), productViews[productViews.length - 1]._id.toString()]
                    // Track this range in db
                    if (!await tryAndWait((async () => {
                        const result = await productViewRangeRepository.create({ duration: 14400, count: productViews.length, min: range[0], max: range[1] }, DateTime.utc().toUnixInteger())
                        if (result === false)
                            throw new Error('failed to track this range in db')
                    })))
                        throw new Error('failed to track this range in db')

                    // Assign this range to a slave
                    const result = await deliverTaskToSlave(addresses[i % addresses.length].host, addresses[i % addresses.length].port, { min: range[0], max: range[1] }, productViews.length, true)
                    if (result !== true)
                        throw new Error('failed to deliver this range to a slave')

                    i++
                }
            } catch (e) {
                console.error(e)
            }

            console.log('done')
            console.timeEnd()
        },
        { name: 'maintain views count', runOnInit: true, timezone: 'UTC' })
}

async function deliverTaskToSlave(host: string, port: number, range: { min: string, max: string }, count: number, inclusive: boolean): Promise<boolean> {
    try {
        return await tryAndWait(async () => {
            let r = await httpRequest({ host, port, path: '/calculate-z-score', method: 'POST' }, JSON.stringify({ range, count, inclusive }))
            if (r.response.statusCode === undefined || r.response.statusCode < 200)
                throw new Error('slave failed to handle productSale document range')
        }, 60, 3)
    } catch (e) {
        console.error(e)
        return false
    }
}

async function getOptions(zScoreMaintainerOptionsRepository: ZScoreMaintainerOptionsRepository) {
    const options = await zScoreMaintainerOptionsRepository.getOptions()
    if (!options) {
        const result = await zScoreMaintainerOptionsRepository.createOptions()
        if (result === false)
            throw new Error('Failed to store the app\'s options!')
        return
    }

    return options
}
