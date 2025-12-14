import { ClientSession, Collection, Db, DeleteResult, InsertOneResult, MongoClient, MongoSystemError, ObjectId, UpdateResult } from 'mongodb'
import { collectionName, ProductReview, ProductReviewCreate, ProductReviewInput, ProductReviewUpdate, schemaVersion } from '../../Models/Products/ProductReview'
import { DateTime } from 'luxon'
import { IRepository, MongoDB } from '@monorepo/mongodb';
import { faker } from '@faker-js/faker';
import { ProductRepository } from './ProductRepository';
import { UserRepository } from '../UserRepository';
import { ISeedable } from "@monorepo/mongodb/dist/ISeedable";
import { IDropable } from '@monorepo/mongodb/dist/IDropable';

export class ProductReviewsRepository implements IRepository, ISeedable, IDropable {
    IDropable: 'IDropable' = 'IDropable';
    IRepository: 'IRepository' = 'IRepository';
    ISeedable: 'ISeedable' = 'ISeedable';

    private session: ClientSession | undefined = undefined

    setTransactionSession(session?: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    async addCollection(db: Db): Promise<void> {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.createCollection(collectionName)

        const indexes = await db.collection(collectionName).indexes()

        if (indexes.find(i => i.name === 'uniqueness') === undefined)
            await db.createIndex(collectionName, { userId: 1, productId: 1 }, { unique: true, name: 'uniqueness' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    private async getCollection(): Promise<Collection<ProductReviewCreate>> {
        return (await MongoDB.getDb()).collection<ProductReviewCreate>(collectionName)
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    async seed() {
        console.log('ProductReviewsRepository.seed()')
        console.time()

        try {
            const collection = await this.getCollection()
            const productRepository = new ProductRepository()
            const userRepository = new UserRepository()

            if ((await collection.countDocuments()) !== 0) {
                console.warn(`${collectionName} collection is not empty!`)
                return
            }

            const users = await userRepository.get()
            if (users.length === 0)
                throw new Error('No users!')

            const products = await productRepository.getAll()
            if (products.length === 0)
                throw new Error('No products!')

            const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
            const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

            const promises = []

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                for (let j = 0; j < products.length; j++) {
                    const product = products[j];

                    if (faker.datatype.boolean())
                        continue

                    promises.push(
                        (async () => {

                            let safety = 0
                            while (safety < 10) {
                                safety++
                                try {
                                    const ts = faker.datatype.number({ min: startTimeTS, max: endTimeTS })

                                    let r = await collection.insertOne({
                                        schemaVersion,
                                        productId: product._id.toString(),
                                        userId: user._id.toString(),
                                        rating: faker.datatype.number({ min: 0, max: 5 }),
                                        content: faker.random.words(faker.datatype.number({ min: 20, max: 100 })),
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

        try { return await (await this.getCollection()).insertOne(pr) }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<ProductReview | null | undefined> {
        try { return await (await this.getCollection()).findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async updateById(id: string, order: ProductReviewUpdate): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await (await this.getCollection()).deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
