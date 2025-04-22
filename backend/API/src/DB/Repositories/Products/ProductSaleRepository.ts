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

    async create(product: ProductSaleInput): Promise<InsertOneResult | false> {
        try {
            let p: ProductSaleCreate = {
                ...product,
                schemaVersion: schemaVersion,
                timestamp: DateTime.utc().toUnixInteger(),
            }

            const r = await this.collection.insertOne(p)

            this.saleCountCollection.aggregate()
                .match({
                    productId: r.insertedId,
                    duration: 'monthly',
                    timestamp: { $gt: DateTime.utc().set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 }).minus({ months: 12, days: 1 }) }
                })

            return r
        } catch (e) { console.error(e); return false }
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
