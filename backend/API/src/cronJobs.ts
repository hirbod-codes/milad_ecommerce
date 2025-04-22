import { schedule } from "node-cron";
import { DateTime } from "luxon";
import { SessionManager } from "./Session/SessionManager";
import { ProductRepository } from "./DB/Repositories/Products/ProductRepository";
import { array, number } from "yup";

export function runCronJobs() {
    schedule(
        '* * 2 * * *',
        async () => {
            console.log('running cron job: "products views calculations"...')
            console.log(`----${DateTime.utc().toISO()}`)

            const productRepository = await ProductRepository.getInstance()

            let cursor = 0;
            do {
                let nextCursor: number = undefined!, productIds: string[] = undefined!
                try {
                    const { cursor: nc, members } = await SessionManager.getProductViewsCursor(cursor, 100)
                    console.log('cursor', nc)
                    console.log('productIds.length', members.length)
                    nextCursor = nc
                    productIds = members
                } catch (e) {
                    console.error('system failed to get the cursor for redis set of products views count', e)
                }

                if (productIds && array().required().isValidSync(productIds))
                    for (const productId of productIds) {
                        try {
                            const value = await SessionManager.getProductViews(productId)

                            if (number().required().isValidSync(value))
                                productRepository.incrementViews(productId, number().required().cast(value))
                        }
                        catch (e) { console.error('system failed to read cached product\'s views count key in redis and update the view count', e) }

                        try { await SessionManager.deleteProductViews(productId) }
                        catch (e) { console.error('system failed to delete cached product\'s views count key in redis', e) }
                    }

                cursor = nextCursor

                if (productIds.length === 0)
                    break
            } while (cursor !== 0);

            console.log('done')
        },
        { name: 'products views calculations', runOnInit: true })
}
