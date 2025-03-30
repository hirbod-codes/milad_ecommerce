import { Collection, DeleteResult, InsertOneResult, MongoSystemError, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Category, CategoryCreate, CategoryImmutable, CategoryInput, CategoryUpdate, schemaVersion } from '../Models/Category'
import { MongoDB } from '../mongodb';
import { faker, fakerFA } from "@faker-js/faker"

export class CategoryRepository extends MongoDB {
    private collection: Collection<CategoryCreate>

    constructor(collection: Collection<CategoryCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<CategoryRepository> {
        return new CategoryRepository(await MongoDB.getDbInstance().getCategoryCollection())
    }

    static async seed(count: number = 50) {
        const collection = await MongoDB.getDbInstance().getCategoryCollection()

        if (!(await collection.deleteMany()).acknowledged)
            throw new Error('seeding users failed!')

        const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
        const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

        const localCategoryIds: string[] = []

        const names = faker.helpers.uniqueArray(faker.definitions.person.first_name.generic!, count)
        const faNames = fakerFA.helpers.uniqueArray(fakerFA.definitions.person.first_name.generic!, count)

        for (let i = 0; i < count; i++) {
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
        }
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

        try { return await this.collection.insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async isNameExist(name: string): Promise<boolean> {
        try { return await this.collection.countDocuments({ name }) !== 0 }
        catch (e) { console.error(e); return false }
    }

    async get(): Promise<Category[] | false> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Category | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, category: CategoryUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...category, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: CategoryImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async addViews(id: string | ObjectId, count: number): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: typeof id === 'string' ? ObjectId.createFromHexString(id) : id }, { $inc: { views: count }, $set: { updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
