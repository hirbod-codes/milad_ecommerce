import { DateTime } from "luxon";
import { Collection, Db, DeleteResult, InsertOneResult, MongoClient, ObjectId } from 'mongodb'
import { MongoDB } from "../../mongodb";
import { ProductSale, ProductSaleCreate, ProductSaleInput } from "../../Models/Products/ProductSale";
import { OrderRepository } from "../OrderRepository";
import { PopularProduct } from "../../Models/Products/PopularProduct";
import { ProductRepository } from "./ProductRepository";
import { ZScore } from "./ZScore";
import { faker } from "@faker-js/faker/.";

export class ProductSaleRepository extends MongoDB {
    private collection: Collection<ProductSaleCreate>

    constructor(collection: Collection<ProductSaleCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(client?: MongoClient, db?: Db): Promise<ProductSaleRepository> {
        return new ProductSaleRepository(await MongoDB.getDbInstance().getProductSalesCollection(client, db))
    }

    static async seed() {
        console.log('ProductSaleRepository.seed()')
        console.time()

        try {
            const collection = await MongoDB.getDbInstance().getProductSalesCollection()
            const orderRepository = await OrderRepository.getInstance()
            const productRepository = await ProductRepository.getInstance()

            if (!(await collection.deleteMany()).acknowledged)
                throw new Error('seeding users failed!')

            const orders = await orderRepository.getAll([['createdAt', 1]])
            const products = await productRepository.getAll()

            const docs = []
            for (const order of orders)
                if (!order.isPayed)
                    continue
                else for (const product of order.products)
                    docs.push({
                        productId: ObjectId.createFromHexString(product.productId.toString()),
                        quantity: product.quantity,
                        timestamp: order.createdAt,
                    })

            collection.insertMany(docs)

            for (const order of orders)
                await productRepository.updateTrendingScore(order, order.createdAt)

            for (const p of products)
                if (faker.datatype.boolean(0.2))
                    await productRepository.updateImmutables(p._id, {
                        stats: {
                            monthly: [],
                            weekly: [],
                            monthlyMean: 0,
                            weeklyMean: 0,
                            monthlyStandardDeviation: 0,
                            weeklyStandardDeviation: 0,
                            monthlyZScore: 0,
                            weeklyZScore: 0,
                        }
                    })
        } finally { console.timeEnd() }
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

    get(productIds: string | ObjectId | (string | ObjectId)[], since: number, to: number): Promise<ProductSale[]>[] | false {
        if (typeof productIds === 'string')
            productIds = [ObjectId.createFromHexString(productIds)]
        else if (productIds instanceof ObjectId)
            productIds = [productIds]
        else if (Array.isArray(productIds))
            productIds = productIds.map(m => typeof m === 'string' ? ObjectId.createFromHexString(m) : m)

        try { return productIds.map(productId => this.collection.find({ productId, timestamp: { $gte: since, $lte: to } }).toArray()) }
        catch (e) { console.error(e); return false }
    }

    count(productIds: string | ObjectId | (string | ObjectId)[], since: number, to: number): Promise<number>[] | false {
        if (typeof productIds === 'string')
            productIds = [ObjectId.createFromHexString(productIds)]
        else if (productIds instanceof ObjectId)
            productIds = [productIds]
        else if (Array.isArray(productIds))
            productIds = productIds.map(m => typeof m === 'string' ? ObjectId.createFromHexString(m) : m)

        try { return productIds.map(productId => this.collection.countDocuments({ productId, timestamp: { $gte: since, $lte: to } })) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
