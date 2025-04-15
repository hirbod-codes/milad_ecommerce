import { schedule } from "node-cron";
import { ProductSaleRepository } from "./DB/Repositories/Products/ProductSaleRepository";
import { PopularProductRepository } from "./DB/Repositories/Products/PopularProductRepository";
import { ProductViewRepository } from "./DB/Repositories/Products/ProductViewRepository";

export function runCronJobs() {
    schedule('* * 4 * * *', async () => {
        const popularProductRepository = await PopularProductRepository.getInstance()
        const productSaleRepository = await ProductSaleRepository.getInstance()

        const popularProducts = await productSaleRepository.getPopularProducts()

        if (popularProducts === false)
            console.error('system failed to update popular products collection')
        else
            popularProductRepository.set(popularProducts)
    })

    schedule('* * 1 * * *', async () => {
        // const productViewRepository =await ProductViewRepository.getInstance()
        // productViewRepository.add()
    })
}
