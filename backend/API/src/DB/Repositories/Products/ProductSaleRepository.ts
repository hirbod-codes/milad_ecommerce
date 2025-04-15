import { DateTime } from "luxon";
import { Collection, DeleteResult, InsertOneResult, ObjectId } from 'mongodb'
import { MongoDB } from "../../mongodb";
import { ProductSale, ProductSaleCreate, ProductSaleInput } from "../../Models/Products/ProductSale";
import { OrderRepository } from "../OrderRepository";
import { Product } from "../../Models/Products/Product";
import { PopularProduct } from "../../Models/Products/PopularProduct";

export class ProductSaleRepository extends MongoDB {
    private collection: Collection<ProductSaleCreate>

    constructor(collection: Collection<ProductSaleCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<ProductSaleRepository> {
        return new ProductSaleRepository(await MongoDB.getDbInstance().getProductSalesCollection())
    }

    static async seed() {
        console.log('ProductSaleRepository.seed()')

        const collection = await MongoDB.getDbInstance().getProductSalesCollection()
        const orderRepository = await OrderRepository.getInstance()

        if (!(await collection.deleteMany()).acknowledged)
            throw new Error('seeding users failed!')

        const orders = await orderRepository.getAll()

        const docs = []
        for (const order of orders)
            if (!order.isPayed)
                continue
            else for (const product of order.products)
                docs.push({ productId: ObjectId.createFromHexString(product.productId.toString()), quantity: product.quantity, timestamp: order.createdAt })

        collection.insertMany(docs)
    }

    async create(product: ProductSaleInput): Promise<InsertOneResult | false> {
        let p: ProductSaleCreate = {
            ...product,
            timestamp: DateTime.utc().toUnixInteger(),
        }

        return await this.collection.insertOne(p)
    }

    async getPopularProducts(): Promise<PopularProduct[] | false> {
        try {
            return await this.collection.aggregate([
                {
                    $match: {
                        timestamp: { $gt: DateTime.utc().minus({ months: 3 }).toUnixInteger() }
                    }
                },
                {
                    $group: {
                        _id: "$productId",
                        count: {
                            $sum: "$quantity"
                        }
                    }
                },
                {
                    $sort: {
                        count: -1
                    }
                },
                {
                    $lookup: {
                        from: "product",
                        localField: "_id",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                {
                                    count: "$count"
                                },
                                {
                                    $arrayElemAt: ["$product", 0]
                                }
                            ]
                        }
                    }
                },
                {
                    $unwind: {
                        path: "$categories",
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $group: {
                        _id: "$categories",
                        products: {
                            $push: "$$ROOT"
                        }
                    }
                },
                { $sort: { "products.count": -1 } },
                {
                    $project: {
                        category: "$_id",
                        products: {
                            $slice: ["$products", 100]
                        }
                    }
                }
            ])
                // .match({ timestamp: { $gt: DateTime.utc().minus({ months: 3 }).toUnixInteger() } })
                // .group({
                //     _id: '$productId',
                //     count: {
                //         $sum: '$quantity'
                //     }
                // })
                // .sort({ count: -1 })
                // .lookup({
                //     from: "product",
                //     localField: "_id",
                //     foreignField: "_id",
                //     as: "product"
                // })
                // .unwind({
                //     path: '$categories',
                //     preserveNullAndEmptyArrays: false
                // })
                // .addStage({
                //     $replaceRoot: {
                //         newRoot: {
                //             $mergeObjects: [
                //                 { count: "$count" },
                //                 { $arrayElemAt: ["$product", 0] }
                //             ]
                //         }
                //     }
                // })
                // .group({
                //     _id: '$categories',
                //     products: { $push: '$$ROOT' }
                // })
                // .sort({
                //     'products.count': -1
                // })
                // .project({
                //     category: '$_id',
                //     products: {
                //         $slice: ["$products", 100]
                //     }
                // })
                .toArray() as any

        }
        catch (e) { console.error(e); return false }
    }

    async get(): Promise<ProductSale[]> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return [] }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
