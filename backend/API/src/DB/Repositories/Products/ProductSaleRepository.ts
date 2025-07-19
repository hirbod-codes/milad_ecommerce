import { Collection, Db, Document, MongoClient, MongoServerError, MongoSystemError, ObjectId } from "mongodb";
import { MongoDB } from "../../mongodb";
import { ProductSaleCreate, ProductSaleInput, schemaVersion } from "../../Models/Products/ProductSale";
import { DateTime } from "luxon";
import { number, string } from "yup";

export class ProductSaleRepository extends MongoDB {
    private collection: Collection<ProductSaleCreate>

    constructor(productSaleCreate: Collection<ProductSaleCreate>) {
        super();
        this.collection = productSaleCreate
    }

    static async getInstance(client?: MongoClient, db?: Db): Promise<ProductSaleRepository> {
        return new ProductSaleRepository(await MongoDB.getDbInstance().getProductSaleCollection(client, db))
    }

    static async seed() {
        console.log('ProductSaleRepository.seed()')
        console.time()

        try {
            const collection = await MongoDB.getDbInstance().getProductSaleCollection()
            const orderCollection = await MongoDB.getDbInstance().getOrderCollection()

            if (!(await collection.deleteMany()).acknowledged)
                throw new Error('seeding product sales failed!')

            const orders = await orderCollection.find({ isPayed: true }).toArray()

            const promises = []

            for (let i = 0; i < orders.length; i++) {
                const order = orders[i]

                promises.push(
                    (async () => {
                        let safety = 0
                        while (safety < 10) {
                            safety++
                            try {
                                const inserts = []
                                for (let j = 0; j < order.products.length; j++) {
                                    const { productId, quantity } = order.products[j];

                                    inserts.push({
                                        schemaVersion: schemaVersion,
                                        timestamp: DateTime.fromSeconds(order.updatedAt).toJSDate(),
                                        metadata: {
                                            productId,
                                            quantity,
                                            userId: ObjectId.createFromHexString(order.userId.toString())
                                        }
                                    })
                                }

                                const r = await collection.insertMany(inserts)
                                if (!r.acknowledged)
                                    throw new Error('insertion failed')

                                break;
                            } catch (e) {
                                if (!(e instanceof MongoSystemError) || !(e instanceof MongoServerError) || e.code !== 11000)
                                    throw e
                            }
                        }

                        if (safety >= 10)
                            throw new Error('safety triggered while seeding products!')
                    })()
                        .catch((e) => { throw new e })
                        .finally(() => {
                            console.log(`order ${i} has processed.`)
                        })
                )
            }

            await Promise.allSettled(promises)
        } finally { console.timeEnd() }
    }

    async create(productSaleInput: ProductSaleInput, now: number) {
        try {
            const p: ProductSaleCreate = { ...productSaleInput, timestamp: DateTime.fromSeconds(now).toJSDate(), schemaVersion: schemaVersion }
            const insertionResult = this.collection.insertOne(p, { session: this.session })
            return insertionResult
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async getEstimatedCount() {
        try { return await this.collection.countDocuments({}) }
        catch (e) { console.error(e); return false }
    }

    async divideByProductIds(buckets: number): Promise<{ _id: { min: ObjectId | string, max: ObjectId | string }, count: number }[] | false>
    async divideByProductIds(buckets: number, lastProcessedId: ObjectId | string): Promise<{ _id: { min: ObjectId | string, max: ObjectId | string }, count: number }[] | false>
    async divideByProductIds(buckets: number, from: number, to: number): Promise<{ _id: { min: ObjectId | string, max: ObjectId | string }, count: number }[] | false>
    async divideByProductIds(buckets: number, first?: ObjectId | string | number, second?: number): Promise<{ _id: { min: ObjectId | string, max: ObjectId | string }, count: number }[] | false> {
        try {
            let aggregation = this.collection.aggregate(undefined, { allowDiskUse: true })
            if (string().required().isValidSync(first) && second === undefined) {
                aggregation = aggregation
                    .match({ _id: { $gt: ObjectId.createFromHexString(first) } })
            } else if (number().required().isValidSync(first) && number().required().isValidSync(second)) {
                aggregation = aggregation
                    .match({
                        timestamp: {
                            $gte: DateTime.fromSeconds(first).toJSDate(),
                            $lt: DateTime.fromSeconds(second).toJSDate()
                        }
                    })
            }

            aggregation = aggregation
                .group({
                    _id: "$metadata.productId",
                    count: { $sum: 1 },
                })
                .addStage({
                    $bucketAuto: {
                        groupBy: "$_id",
                        buckets,
                        output: {
                            count: { $sum: 1 },
                        }
                    }
                })

            return await aggregation.toArray() as any[]
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async getGroupedByProductIds(minProductId: string, maxProductId: string, from: number, to: number) {
        try {
            const aggregation = this.collection.aggregate(undefined, { allowDiskUse: true })
                .match({
                    timestamp: {
                        $gte: DateTime.fromSeconds(from).toJSDate(),
                        $lt: DateTime.fromSeconds(to).toJSDate()
                    },
                    "metadata.productId": {
                        $gte: ObjectId.createFromHexString(minProductId),
                        $lt: ObjectId.createFromHexString(maxProductId)
                    }
                })
                .group({
                    _id: "$metadata.productId",
                    quantity: { $sum: "$metadata.quantity" },
                })

            return await aggregation.toArray()
        } catch (e) {
            console.error(e)
            return false
        }
    }
}
