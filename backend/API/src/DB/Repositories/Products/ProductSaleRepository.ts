import { DateTime } from "luxon";
import { Collection, Db, DeleteResult, InsertOneResult, MongoClient, ObjectId } from 'mongodb'
import { MongoDB } from "../../mongodb";
import { ProductSale, ProductSaleCreate, ProductSaleInput, schemaVersion } from "../../Models/Products/ProductSale";
import { PopularProduct } from "../../Models/Products/PopularProduct";
import { ProductSaleCount, ProductSaleCountCreate } from "../../Models/Products/ProductSaleCount";

export class ProductSaleRepository extends MongoDB {
    private collection: Collection<ProductSaleCreate>
    private saleCountCollection: Collection<ProductSaleCountCreate>

    constructor(collection: Collection<ProductSaleCreate>, saleCountCollection: Collection<ProductSaleCountCreate>) {
        super();
        this.collection = collection
        this.saleCountCollection = saleCountCollection
    }

    static async getInstance(client?: MongoClient, db?: Db): Promise<ProductSaleRepository> {
        return new ProductSaleRepository(await MongoDB.getDbInstance().getProductSalesCollection(client, db), await MongoDB.getDbInstance().getProductSalesCountCollection(client, db))
    }

    async create(product: ProductSaleInput, now: number): Promise<InsertOneResult | false> {
        try {
            let p: ProductSaleCreate = {
                ...product,
                schemaVersion: schemaVersion,
                timestamp: DateTime.fromSeconds(now).toUnixInteger(),
            }

            const insertionResult = await this.collection.insertOne(p)

            const thisMonth = DateTime.fromSeconds(now).set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

            const aggregationResult = await this.saleCountCollection.aggregate()
                .addStage({
                    $facet: {
                        months: [
                            {
                                $match: {
                                    productId: insertionResult.insertedId,
                                    duration: 'monthly',
                                    timestamp: { $gte: thisMonth.minus({ months: 12 }).toUnixInteger(), $lte: thisMonth.minus({ months: 1 }).toUnixInteger() }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    months: {
                                        $push: "$$ROOT"
                                    },
                                    mu: { $avg: "$count" },
                                    sigma: {
                                        $stdDevSamp: "$count"
                                    }
                                }
                            }
                        ],
                        lastMonth: [
                            {
                                $match: {
                                    productId: insertionResult.insertedId,
                                    duration: 'monthly',
                                    timestamp: thisMonth.toUnixInteger()
                                }
                            }
                        ]
                    }
                })
                .addStage({
                    $addField: {
                        zScore: {
                            $cond: [
                                {
                                    $eq: [
                                        {
                                            $arrayElemAt: ["$months.sigma", 0]
                                        },
                                        0
                                    ]
                                },
                                0,
                                {
                                    $divide: [
                                        {
                                            $subtract: [
                                                {
                                                    $cond: [
                                                        {
                                                            $cond: {
                                                                if: {
                                                                    $ifNull: [
                                                                        "$lastMonth",
                                                                        false
                                                                    ]
                                                                },
                                                                then: true,
                                                                else: false
                                                            }
                                                        },
                                                        {
                                                            $sum: [
                                                                {
                                                                    $arrayElemAt: [
                                                                        "$lastMonth.quantity",
                                                                        0
                                                                    ]
                                                                },
                                                                product.quantity
                                                            ]
                                                        },
                                                        product.quantity
                                                    ]
                                                },
                                                {
                                                    $arrayElemAt: ["$months.mu", 0]
                                                }
                                            ]
                                        },
                                        {
                                            $arrayElemAt: ["$months.sigma", 0]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                })
                .toArray()
            console.log('aggregationResult', aggregationResult)

            if (aggregationResult[0]?.zScore === undefined)
                throw new Error('failed to calculate z-score')

            let updateResult = await this.saleCountCollection.updateOne(
                {
                    productId: insertionResult.insertedId,
                    duration: 2_592_000, // a month in seconds
                    timestamp: thisMonth.toUnixInteger(),
                },
                {
                    $inc: { count: product.quantity },
                    $set: {
                        zScore: aggregationResult[0].zScore
                    },
                },
                {
                    upsert: true,
                }
            )
            if (!updateResult.acknowledged)
                throw new Error('failed to update ProductSaleCount document with calculated z-score')

            updateResult = await this.saleCountCollection.updateOne(
                {
                    productId: insertionResult.insertedId,
                    duration: 31_104_000, // a year in seconds
                    timestamp: thisMonth.toUnixInteger(),
                },
                {
                    $inc: { count: product.quantity },
                    $set: {
                        zScore: null
                    },
                },
                {
                    upsert: true,
                }
            )
            if (!updateResult.acknowledged)
                throw new Error('failed to update ProductSaleCount document with calculated z-score')

            return insertionResult
        } catch (e) {
            console.error(e)
            return false
        }
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
