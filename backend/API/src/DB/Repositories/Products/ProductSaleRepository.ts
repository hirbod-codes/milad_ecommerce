import { Collection, Db, MongoClient, MongoServerError, MongoSystemError, ObjectId } from "mongodb";
import { MongoDB } from "../../mongodb";
import { ProductSaleCreate, ProductSaleInput, schemaVersion } from "../../Models/Products/ProductSale";
import { DateTime } from "luxon";
import { OrderRepository } from "../OrderRepository";

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
                                for (let j = 0; j < order.products.length; j++) {
                                    const { productId, quantity } = order.products[j];

                                    let r = await collection.insertOne({
                                        schemaVersion: schemaVersion,
                                        timestamp: DateTime.fromSeconds(order.updatedAt).toJSDate(),
                                        metadata: {
                                            productId,
                                            quantity,
                                            userId: ObjectId.createFromHexString(order.userId.toString())
                                        }
                                    })
                                    if (!r.acknowledged)
                                        throw new Error('insertion failed')
                                    break;
                                }
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

    async getDaily(productId: string, from: number, to: number) {
        try {
            const sales = await this.collection.aggregate()
                .match({
                    timestamp: { $gte: DateTime.fromSeconds(from).toJSDate(), $lte: DateTime.fromSeconds(to).toJSDate() },
                    'metadata.productId': ObjectId.createFromHexString(productId)
                })
                .group({
                    _id: {
                        year: { $year: "$timestamp" },
                        month: { $month: "$timestamp" }
                    },
                    quantity: { $sum: 1 },
                    firstTs: { $min: "$timestamp" },
                    lastTs: { $max: "$timestamp" }
                })
                .sort({ "_id.year": 1, "_id.month": 1 })
                .toArray()

            return sales
        } catch (e) {
            console.error(e)
            return false
        }
    }
}
