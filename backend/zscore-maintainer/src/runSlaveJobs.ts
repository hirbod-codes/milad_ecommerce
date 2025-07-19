import { DateTime } from "luxon";
import { schedule } from "node-cron";
import { httpRequest } from "../../API/src/helpers";
import { ProductSaleRepository } from "../../API/src/DB/Repositories/Products/ProductSaleRepository";
import { ProductStatisticsRepository } from "../../API/src/DB/Repositories/Products/ProductStatisticsRepository";
import { ProductRepository } from "../../API/src/DB/Repositories/Products/ProductRepository";
import { MongoDB } from "../../API/src/DB/mongodb";

export async function runSlaveJobs(masterHost: string, masterPort: number, host: string, port: number) {
    schedule('* 1 * * *', async () => {
        console.time()
        console.log(`running cron job: "subscription" at ${DateTime.utc().toISO()}...`)

        try {
            const r = await httpRequest({ host: masterHost, port: masterPort, path: '/subscribe', method: 'POST' }, JSON.stringify({ host, port }))
            if (!r.response.statusCode || r.response.statusCode < 200)
                console.warn('Failed to subscribe to master.')
        } catch (e) {
            console.error(e)
        }

        console.log('done')
        console.timeEnd()
    }, { name: 'subscription', runOnInit: true, timezone: 'UTC' })
}

export async function handleRange(range: { min: string, max: string }, count: number, inclusive: boolean) {
    try {
        const mongodb = MongoDB.getDbInstance()
        const productRepository = await ProductRepository.getInstance(mongodb)
        const productSaleRepository = await ProductSaleRepository.getInstance(mongodb)
        const productStatisticsRepository = await ProductStatisticsRepository.getInstance(mongodb)

        let i = 0, fetchedProductSales = []
        const limit = 500_000
        do {
            let r = await productSaleRepository.getGroupedByProductIds(range.min, range.max, i * limit, limit, inclusive)
            if (r === false)
                throw new Error('Failed to fetch product sale documents.')

            fetchedProductSales = r

            for (let j = 0; j < fetchedProductSales.length; j++) {
                const productSales = fetchedProductSales[j];

                await mongodb.startTransaction()

                try {
                    const updateCountResult = await productStatisticsRepository.updateCount(productSales._id.toString(), DateTime.utc().toUnixInteger(), productSales.quantity)
                    if (updateCountResult === false)
                        throw new Error('Failed to update product statistics document')

                    const updateImmutablesResult = await productRepository.updateImmutables(productSales._id, { weeklyOrderZScore: updateCountResult.weeklyZScore, monthlyOrderZScore: updateCountResult.monthlyZScore, yearlyOrderZScore: updateCountResult.yearlyZScore })
                    if (updateImmutablesResult === false || !updateImmutablesResult.acknowledged || updateImmutablesResult.matchedCount !== 1)
                        throw new Error('Failed to update product document')

                    await mongodb.commitTransaction()
                } catch (e) {
                    console.error(e)
                    await mongodb.abortTransaction()
                }
            }

            i++
        } while (i <= 20000 && fetchedProductSales.length !== 0)
    } catch (e) {
        console.error(e)
    }
}
