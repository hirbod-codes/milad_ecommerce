import { DateTime } from "luxon";
import { Collection, Db, DeleteResult, InsertOneResult, MongoClient, ObjectId } from 'mongodb'
import { MongoDB } from "../../mongodb";
import { ProductSale, ProductSaleCreate, ProductSaleInput, schemaVersion } from "../../Models/Products/ProductSale";
import { ProductSaleCountCreate } from "../../Models/Products/ProductSaleCount";
import { Product } from "../../Models/Products/Product";

export class ProductSaleRepository extends MongoDB {
    private collection: Collection<ProductSaleCreate>
    private saleCountCollection: Collection<ProductSaleCountCreate>

    constructor(collection: Collection<ProductSaleCreate>, saleCountCollection: Collection<ProductSaleCountCreate>) {
        super();
        this.collection = collection
        this.saleCountCollection = saleCountCollection
    }

    static async getInstance(client?: MongoClient, db?: Db): Promise<ProductSaleRepository> {
        return new ProductSaleRepository(await MongoDB.getDbInstance().getProductSaleCollection(client, db), await MongoDB.getDbInstance().getProductSaleCountCollection(client, db))
    }

    async create(productSale: ProductSaleInput, now: number, categories?: string[], tags?: string[]): Promise<InsertOneResult | false> {
        try {
            let p: ProductSaleCreate = {
                ...productSale,
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
                                    duration: 2_592_000,
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
                                    duration: 2_592_000,
                                    timestamp: thisMonth.toUnixInteger()
                                }
                            }
                        ]
                    }
                })
                .addStage({
                    $addFields: {
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
                                                                productSale.quantity
                                                            ]
                                                        },
                                                        productSale.quantity
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

            let updateResult = await this.saleCountCollection.updateOne(
                {
                    productId: insertionResult.insertedId,
                    duration: 2_592_000, // a month in seconds
                    timestamp: thisMonth.toUnixInteger(),
                },
                {
                    $inc: { count: productSale.quantity },
                    $set: {
                        categories,
                        tags,
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
                    $inc: { count: productSale.quantity },
                    $set: {
                        categories,
                        tags,
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

    async getTrendingProducts(duration: 'monthly' | 'weekly' | 'yearly', categories?: string[], tags?: string[], offset: number = 0, limit: number = 10): Promise<Product[] | false> {
        try {
            let durationSeconds, startTS
            switch (duration) {
                case 'weekly':
                    durationSeconds = 604_800
                    startTS = DateTime.utc().set({ hour: 0, minute: 0, second: 0 })
                    if (startTS.weekday !== 1)
                        startTS = startTS.minus({ days: startTS.weekday - 1 })
                    break;
                case 'monthly':
                    durationSeconds = 2_592_000
                    startTS = DateTime.utc().set({ day: 1, hour: 0, minute: 0, second: 0 })
                    break;
                case 'yearly':
                    durationSeconds = 31_104_000
                    startTS = DateTime.utc().set({ month: 1, day: 1, hour: 0, minute: 0, second: 0 })
                    break;
                default:
                    throw new Error('invalid duration value provided')
            }

            const aggregation = this.saleCountCollection.aggregate<Product>()
                .match({ duration: durationSeconds, timestamp: { $gte: startTS.toUnixInteger() } })

            if (categories)
                aggregation
                    .match({ categories: { $in: categories } })

            if (tags)
                aggregation
                    .match({ tags: { $in: tags } })

            return await aggregation
                .sort({ 'zScore': -1 })
                .skip(offset)
                .limit(limit)
                .lookup({
                    from: 'product',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                })
                .addStage({
                    $replaceRoot: { newRoot: { $arrayElemAt: ['$product', 0] } }
                })
                .toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async getTopSellingProducts(duration: 'monthly' | 'weekly' | 'yearly', categories?: string[], tags?: string[], offset: number = 0, limit: number = 10): Promise<Product[] | false> {
        try {
            let durationSeconds, startTS
            switch (duration) {
                case 'weekly':
                    durationSeconds = 604_800
                    startTS = DateTime.utc().set({ hour: 0, minute: 0, second: 0 })
                    if (startTS.weekday !== 1)
                        startTS = startTS.minus({ days: startTS.weekday - 1 })
                    break;
                case 'monthly':
                    durationSeconds = 2_592_000
                    startTS = DateTime.utc().set({ day: 1, hour: 0, minute: 0, second: 0 })
                    break;
                case 'yearly':
                    durationSeconds = 31_104_000
                    startTS = DateTime.utc().set({ month: 1, day: 1, hour: 0, minute: 0, second: 0 })
                    break;
                default:
                    throw new Error('invalid duration value provided')
            }

            const aggregation = this.saleCountCollection.aggregate<Product>()
                .match({ duration: durationSeconds, timestamp: { $gte: startTS.toUnixInteger() } })

            if (categories)
                aggregation
                    .match({ categories: { $in: categories } })

            if (tags)
                aggregation
                    .match({ tags: { $in: tags } })

            return await aggregation
                .sort({ 'count': -1 })
                .skip(offset)
                .limit(limit)
                .lookup({
                    from: 'product',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                })
                .addStage({
                    $replaceRoot: { newRoot: { $arrayElemAt: ['$product', 0] } }
                })
                .toArray()
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
