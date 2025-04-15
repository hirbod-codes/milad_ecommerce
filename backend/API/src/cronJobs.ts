import { schedule } from "node-cron";
import { ProductSaleRepository } from "./DB/Repositories/ProductSaleRepository";
import { PopularProductRepository } from "./DB/Repositories/PopularProductRepository";

export function runCronJobs() {
    schedule('* * * 4 * *', async () => {
        const popularProductRepository = await PopularProductRepository.getInstance()
        const productSaleRepository = await ProductSaleRepository.getInstance()

        const popularProducts = await productSaleRepository.getPopularProducts()

        if (popularProducts === false)
            console.error('system failed to update popular products collection')
        else
            popularProductRepository.set(popularProducts)
    })
}
