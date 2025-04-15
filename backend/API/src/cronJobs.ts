import { schedule } from "node-cron";
import { ProductSaleRepository } from "./DB/Repositories/Products/ProductSaleRepository";
import { PopularProductRepository } from "./DB/Repositories/Products/PopularProductRepository";
import { DateTime } from "luxon";

export function runCronJobs() {
    schedule(
        '* * 4 * * *',
        async () => {
            console.log('running cron job: "popular products calculations"...')
            console.log(`----${DateTime.utc().toISO()}`)

            const popularProductRepository = await PopularProductRepository.getInstance()
            const productSaleRepository = await ProductSaleRepository.getInstance()

            const popularProducts = await productSaleRepository.getPopularProducts()

            if (popularProducts === false)
                console.error('system failed to update popular products collection')
            else if (popularProducts.length === 0)
                console.warn('no popular products')
            else
                popularProductRepository.set(popularProducts)
        },
        { name: 'popular products calculations', runOnInit: true })

    schedule(
        '* * 1 * * *',
        async () => {
            console.log('running cron job: "products views calculations"...')
            console.log(`----${DateTime.utc().toISO()}`)

            // const productViewRepository =await ProductViewRepository.getInstance()
            // productViewRepository.add()
        },
        { name: 'products views calculations', runOnInit: true })
}
