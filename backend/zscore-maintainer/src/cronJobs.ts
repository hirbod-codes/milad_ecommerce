import { DateTime } from "luxon";
import { schedule, ScheduledTask } from "node-cron";
import { ProductSaleRepository } from "../../API/src/DB/Repositories/Products/ProductSaleRepository";
import { httpRequest, tryAndWait } from "../../API/src/helpers";
import { Document } from "mongodb";
import { MongoDB } from "../../API/src/DB/mongodb";
import { schemaVersion as failedProductSaleRangeSchemaVersion, collectionName as failedProductSaleRangeCollectionName, FailedProductSaleRangeCreate } from "./DB/Models/FailedProductSaleRange";
import { schemaVersion as zScoreMaintainerOptionsSchemaVersion, ZScoreMaintainerOptions, collectionName as zScoreMaintainerOptionsCollectionName } from "./DB/Models/zScoreMaintainerOptions";
import { ObjectId } from 'mongodb'
import { ZScoreMaintainerOptionsRepository } from "./DB/Repositories/ZScoreMaintainerOptionsRepository";

let scheduledTask: ScheduledTask | undefined = undefined

export function runCronJobs() {
    scheduledTask = schedule(
        '* 4 * * *',
        async () => {
            console.time()
            console.log(`running cron job: "maintain z-score" at ${DateTime.utc().toISO()}...`)

            try {
                const db = await MongoDB.getDbInstance().getDb()

                const zScoreMaintainerOptionsRepository = await ZScoreMaintainerOptionsRepository.getInstance()

                const options = await zScoreMaintainerOptionsRepository.getOptions()
                if (!options) {
                    const result = await zScoreMaintainerOptionsRepository.createOptions()
                    if (result === false)
                        throw new Error('Failed to store the app\'s options!')
                    return
                }

                if (!options?.addresses) {
                    console.warn('No slave found!')
                    return
                }

                const productSaleRepository = await ProductSaleRepository.getInstance()
                const count = await productSaleRepository.getEstimatedCount()

                if (!options?.lastProcessedId && (count === false || count > 50_000_000)) {
                    console.warn('too much data to process!')
                    return
                }

                let ranges: { _id: { min: ObjectId | string; max: ObjectId | string; }; count: number; }[] = []

                const result = await tryAndWait(async () => {
                    let r
                    if (options.lastProcessedId)
                        r = await productSaleRepository.divideByProductIds(options.addresses.length, options.lastProcessedId)
                    else
                        r = await productSaleRepository.divideByProductIds(options.addresses.length)

                    if (r === false || (await zScoreMaintainerOptionsRepository.getOptions())?.addresses)
                        throw new Error('failed to fetch product id ranges')

                    ranges = r
                }, 60, 3)
                if (result !== true)
                    throw new Error("product id ranges are not properly divided!")

                const promises = []
                for (let i = 0; i < options.addresses.length; i++)
                    promises.push(handleRange(options.addresses[i].host, options.addresses[i].port, ranges[i], i))

                await Promise.allSettled(promises)

                let failedIndexes: number[] = []
                for (const promise of promises)
                    await promise.then(async (v) => {
                        if (v === true)
                            return

                        const nextSlave = advanceIndex(options.addresses.length, v)

                        if (await handleRange(options.addresses[nextSlave].host, options.addresses[nextSlave].port, ranges[v], v) !== true) {
                            failedIndexes.push(v)

                            const failedProductSale: FailedProductSaleRangeCreate = {
                                schemaVersion: failedProductSaleRangeSchemaVersion,
                                count: ranges[v].count,
                                range: ranges[v]._id,
                                createdAt: DateTime.utc().toUnixInteger(),
                            }

                            const result = await db.collection(failedProductSaleRangeCollectionName).insertOne(failedProductSale as any)

                            if (!result.acknowledged)
                                console.error(`System Failed to insert failedProductSale document to ${failedProductSaleRangeCollectionName} collection: ${JSON.stringify(failedProductSale)}`)
                        }
                    })

                if (failedIndexes.length !== options.addresses.length) {
                    let maxI = -1
                    for (let i = 0; i < options.addresses.length; i++)
                        if (!failedIndexes.includes(i) && maxI < i)
                            maxI = i

                    const result = await tryAndWait(async () => {
                        const r = await db
                            .collection(zScoreMaintainerOptionsCollectionName)
                            .updateOne({}, { $set: { lastProcessedId: ObjectId.createFromHexString(ranges[maxI]._id.max.toString()), updatedAt: DateTime.utc().toUnixInteger() } })

                        if (!r.acknowledged || r.matchedCount !== 1)
                            throw new Error('Failed to update options')
                    }, 120, 50)

                    if (result !== true) {
                        console.error('maximum attempts reached while trying to update options, terminating...')
                        scheduledTask?.stop()
                    } else
                        console.log('successfully updated options.')
                }
            } catch (e) {
                console.error(e)
            }

            console.log('done')
            console.timeEnd()
        },
        { name: 'maintain z-score', runOnInit: true })
}

function advanceIndex(total: number, index: number) {
    return (index + 1) <= (total - 1) ? index + 1 : 0
}

async function handleRange(host: string, port: number, range: Document, dataIndex: number): Promise<true | number> {
    try {
        let result = await tryAndWait(async () => {
            let r = await httpRequest({ host, port, path: '/calculate-z-score', method: 'POST' }, JSON.stringify(range))
            if (r.response.statusCode === undefined || r.response.statusCode < 200)
                throw new Error('slave failed to handle productSale document range')
        }, 60, 3)

        if (!result)
            return dataIndex

        return true
    } catch (e) {
        console.error(e)
        return dataIndex
    }
}
