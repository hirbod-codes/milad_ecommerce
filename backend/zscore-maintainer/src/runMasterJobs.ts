import { DateTime } from "luxon";
import { schedule, ScheduledTask } from "node-cron";
import { collectionName as failedProductSaleRangeCollectionName } from "./DB/Models/FailedProductSaleRange";
import { ZScoreMaintainerOptions } from "./DB/Models/zScoreMaintainerOptions";
import { ObjectId } from 'mongodb'
import { ZScoreMaintainerOptionsRepository } from "./DB/Repositories/ZScoreMaintainerOptionsRepository";
import { FailedProductSaleRangeRepository } from "./DB/Repositories/FailedProductSaleRangeRepository";
import { httpRequest, tryAndWait } from "@monorepo/utils";
import { ProductSaleRepository } from "./DB/Repositories/ProductSaleRepository";
import { ProductViewRepository } from "./DB/Repositories/ProductViewRepository";
import { ProductSaleRangeRepository } from "./DB/Repositories/ProductSaleRangeRepository";

let salesJob: ScheduledTask | undefined = undefined
let viewsJob: ScheduledTask | undefined = undefined

export function runMasterJobs() {
    // A job for failed product sale ranges

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
        { name: 'maintain sales z-score', runOnInit: true, timezone: 'UTC' })

    viewsJob = schedule(
        '0 0 */4 * * *',
        async () => {
            console.time()
            console.log(`running cron job: "maintain views z-score" at ${DateTime.utc().toISO()}...`)

            try {
                const zScoreMaintainerOptionsRepository = new ZScoreMaintainerOptionsRepository()
                const productViewRepository = new ProductViewRepository()

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
                const count = await productViewRepository.getEstimatedCount()
                console.log(`productView documents estimated counts: ${count}`)
                if (count === false || !options?.lastProcessedViewId && count > 500_000_000) {
                    console.warn('too much data to process!')
                    return
                }

                // Fetch ranges
                let ranges: { _id: { min: ObjectId | string; max: ObjectId | string; }; count: number; }[] = []
                const result = await tryAndWait(async () => {
                    let r
                    if (options.lastProcessedViewId)
                        r = await productViewRepository.divideByProductIds(options.addresses.length, options.lastProcessedViewId)
                    else
                        r = await productViewRepository.divideByProductIds(options.addresses.length)

                    if (r === false || (await getOptions(zScoreMaintainerOptionsRepository))?.addresses.length !== r.length)
                        throw new Error('failed to fetch id ranges')

                    ranges = r
                }, 60, 3)
                if (result !== true)
                    throw new Error("Id ranges are not properly divided!")

                // Send tasks
                const promises = []
                for (let i = 0; i < options.addresses.length; i++)
                    promises.push(deliverTaskToSlave(options.addresses[i].host, options.addresses[i].port, ranges[i], i === (options.addresses.length - 1)))

                await Promise.allSettled(promises)

                const failedIndexes: number[] = await findFailedIndexes(options, promises, ranges)

                const id = await findLastProcessedId(productViewRepository.getPreviousId, options, failedIndexes, ranges, salesJob)
                if (!id)
                    return

                const r = await zScoreMaintainerOptionsRepository.setLastProcessedViewId(id)
                if (r === false || !r.acknowledged || r.matchedCount !== 1)
                    throw new Error('Failed to update options')
            } catch (e) {
                console.error(e)
            }

            console.log('done')
            console.timeEnd()
        },
        { name: 'maintain views z-score', runOnInit: true, timezone: 'UTC' })
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

async function findFailedIndexes(options: ZScoreMaintainerOptions, promises: Promise<boolean>[], ranges: { _id: { min: ObjectId | string; max: ObjectId | string; }; count: number; }[]) {
    const failedIndexes: number[] = []
    for (let i = 0; i < promises.length; i++)
        await promises[i].then(async (v) => {
            if (v === true)
                return

            // Try with another slave
            const nextSlave = (i + 1) <= (options.addresses.length - 1) ? i + 1 : 0

            if (await deliverTaskToSlave(options.addresses[nextSlave].host, options.addresses[nextSlave].port, ranges[i], i === (promises.length - 1)) !== true) {
                failedIndexes.push(i)

                const failedProductSale = { range: ranges[i]._id, count: ranges[i].count }

                const result = await (new FailedProductSaleRangeRepository()).create(failedProductSale)

                if (result === false)
                    console.error(`System Failed to insert failedProductSale document to ${failedProductSaleRangeCollectionName} collection: ${JSON.stringify(failedProductSale)}`)
            }
        })

    return failedIndexes
}

async function findLastProcessedId(getPreviousId: (id: string) => Promise<string | false>, options: ZScoreMaintainerOptions, failedIndexes: number[], ranges: { _id: { min: ObjectId | string; max: ObjectId | string; }; count: number; }[], scheduledTask?: ScheduledTask) {
    if (failedIndexes.length === options.addresses.length)
        return

    let maxI = -1
    for (let i = 0; i < options.addresses.length; i++)
        if (!failedIndexes.includes(i) && maxI < i)
            maxI = i

    let foundId: string | undefined = undefined
    const result = await tryAndWait(async () => {
        let id = ranges[maxI]._id.max.toString()

        if (maxI !== (ranges.length - 1)) {
            const previousId = await getPreviousId(id)
            if (previousId === false)
                throw new Error('Failed to find previous id, Failed to update options')
            else
                id = previousId
        }

        foundId = id
    }, 120, 50)

    if (result !== true) {
        console.error('maximum attempts reached while trying to update options, terminating...')
        scheduledTask?.stop()
    } else
        console.log('successfully updated options.')

    return foundId
}
