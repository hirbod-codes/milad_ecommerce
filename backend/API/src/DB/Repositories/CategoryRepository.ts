import { ClientSession, Collection, Db, DeleteResult, InsertOneResult, MongoSystemError, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Category, CategoryCreate, CategoryImmutable, CategoryInput, CategoryUpdate, collectionName, schemaVersion } from '../Models/Category'
import { MongoDB } from '../mongodb';
import { faker, fakerFA } from "@faker-js/faker"
import { IRepository } from '../IRepository';

export class CategoryRepository implements IRepository {
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

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(collectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getCollection(): Promise<Collection<CategoryCreate>> {
        return (await MongoDB.getDb()).collection<CategoryCreate>(collectionName)
    }

    async dropCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    async seed(count?: number) {
        console.log('CategoryRepository.seed()')
        console.time()

        try {
            const collection = await this.getCollection()

            if (!(await collection.deleteMany()).acknowledged)
                throw new Error('seeding categories failed!')

            if (count === undefined)
                count = 50

            const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
            const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

            const localCategoryIds: string[] = []

            const names = faker.helpers.uniqueArray(faker.definitions.person.first_name.generic!, count)
            const faNames = fakerFA.helpers.uniqueArray(fakerFA.definitions.person.first_name.generic!, count)

            const promises = []

            for (let i = 0; i < count; i++) {
                promises.push(
                    (async () => {
                        let safety = 0
                        while (safety < 10) {
                            safety++
                            try {
                                const ts = faker.number.int({ min: startTimeTS, max: endTimeTS })

                                const name = names[i]
                                const parentCategory = i === 0 || faker.datatype.boolean(0.3) ? undefined : faker.helpers.arrayElement(localCategoryIds)

                                let r = await collection.insertOne({
                                    schemaVersion,
                                    name,
                                    displayName: { fa: faNames[i], en: name },
                                    parentCategory,
                                    recommendedProductProperties: new Array(faker.number.int({ min: 1, max: 15 })).fill(null).map(() => {
                                        const key = faker.string.alpha({ length: { min: 3, max: 20 } })
                                        return ({ name: key, display: { fa: fakerFA.string.alpha({ length: { min: 3, max: 20 } }), en: key } });
                                    }),
                                    views: faker.number.int({ min: 0, max: 100000 }),
                                    createdAt: ts,
                                    updatedAt: ts,
                                })
                                if (r.acknowledged) {
                                    localCategoryIds.push(r.insertedId.toString())
                                    break
                                }
                            } catch (e) {
                                if (!(e instanceof MongoSystemError) || e.code !== 11000)
                                    throw e
                            }
                        }

                        if (safety >= 10)
                            throw new Error('safety triggered while seeding categories!')
                    })()
                        .catch((e) => { throw new e })
                        .finally(() => {
                            console.log(`category ${i}`)
                        })
                )
            }

            await Promise.allSettled(promises)
        } finally { console.timeEnd() }
    }

    async create(category: CategoryInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let o: CategoryCreate = {
            ...category,
            schemaVersion,
            views: 0,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await (await this.getCollection()).insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async isNameExist(name: string): Promise<boolean> {
        try { return await (await this.getCollection()).countDocuments({ name }) !== 0 }
        catch (e) { console.error(e); return false }
    }

    async get(): Promise<Category[] | false> {
        try { return await (await this.getCollection()).find().toArray() }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Category | null | undefined> {
        try { return await (await this.getCollection()).findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, category: CategoryUpdate): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...category, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: CategoryImmutable): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async addViews(id: string | ObjectId, count: number): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: typeof id === 'string' ? ObjectId.createFromHexString(id) : id }, { $inc: { views: count }, $set: { updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await (await this.getCollection()).deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
