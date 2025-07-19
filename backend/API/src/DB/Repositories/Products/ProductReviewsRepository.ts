import { Collection, Db, DeleteResult, InsertOneResult, MongoClient, MongoSystemError, ObjectId, UpdateResult } from 'mongodb'
import { ProductReview, ProductReviewCreate, ProductReviewInput, ProductReviewUpdate, schemaVersion } from '../../Models/Products/ProductReview'
import { DateTime } from 'luxon'
import { MongoDB } from '../../mongodb';
import { faker } from '@faker-js/faker/.';
import { ProductRepository } from './ProductRepository';
import { UserRepository } from '../UserRepository';

export class ProductReviewsRepository extends MongoDB {
    private collection: Collection<ProductReviewCreate>

    constructor(collection: Collection<ProductReviewCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(mongoDB?: MongoDB): Promise<ProductReviewsRepository> {
        return new ProductReviewsRepository(await (mongoDB ? mongoDB : MongoDB.getDbInstance()).getProductReviewsCollection())
    }

    static async seed() {
        console.log('ProductReviewsRepository.seed()')
        console.time()

        try {
            const collection = await MongoDB.getDbInstance().getProductReviewsCollection()
            const productRepository = await ProductRepository.getInstance()
            const userRepository = await UserRepository.getInstance()

            if (!(await collection.deleteMany()).acknowledged)
                throw new Error('seeding users failed!')

            const users = await userRepository.get()
            if (users.length === 0)
                throw new Error('seeding users failed!')

            const products = await productRepository.getAll()
            if (products.length === 0)
                throw new Error('seeding users failed!')

            const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
            const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

            const promises = []

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                for (let j = 0; j < products.length; j++) {
                    const product = products[j];

                    if (faker.datatype.boolean(0.3))
                        continue

                    promises.push(
                        (async () => {

                            let safety = 0
                            while (safety < 10) {
                                safety++
                                try {
                                    const ts = faker.number.int({ min: startTimeTS, max: endTimeTS })

                                    let r = await collection.insertOne({
                                        schemaVersion,
                                        productId: product._id.toString(),
                                        userId: user._id.toString(),
                                        rating: faker.number.int({ min: 0, max: 5 }),
                                        content: faker.word.words({ count: { min: 20, max: 100 } }),
                                        createdAt: ts,
                                        updatedAt: ts,
                                    })
                                    if (r.acknowledged)
                                        break
                                } catch (e) {
                                    if (!(e instanceof MongoSystemError) || e.code !== 11000)
                                        throw e
                                }
                            }
                        })()
                            .catch((e) => { throw new e })
                            .finally(() => {
                                console.log(`user ${i}, product review for product ${j}`)
                            })
                    )
                }
            }

            await Promise.allSettled(promises)
        } finally { console.timeEnd() }
    }

    async create(order: ProductReviewInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let pr: ProductReviewCreate = {
            ...order,
            schemaVersion,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await this.collection.insertOne(pr) }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<ProductReview | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async updateById(id: string, order: ProductReviewUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
