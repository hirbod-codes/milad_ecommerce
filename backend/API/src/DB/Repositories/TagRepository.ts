import { Collection, DeleteResult, InsertOneResult, MongoSystemError, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Tag, TagCreate, TagImmutable, TagInput, TagUpdate, schemaVersion } from '../Models/Tag'
import { MongoDB } from '../mongodb';
import { faker, fakerFA } from '@faker-js/faker/';

export class TagRepository extends MongoDB {
    private collection: Collection<TagCreate>

    constructor(collection: Collection<TagCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<TagRepository> {
        return new TagRepository(await MongoDB.getDbInstance().getTagCollection())
    }

    static async seed(count: number = 50) {
        const collection = await MongoDB.getDbInstance().getTagCollection()

        if (!(await collection.deleteMany()).acknowledged)
            throw new Error('seeding users failed!')

        const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
        const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

        for (let i = 0; i < count; i++) {
            let safety = 0
            while (safety < 10) {
                safety++
                try {
                    const ts = faker.number.int({ min: startTimeTS, max: endTimeTS })

                    const name = faker.person.firstName()

                    let r = await collection.insertOne({
                        schemaVersion,
                        name,
                        displayName: { fa: fakerFA.person.firstName(), en: name },
                        views: faker.number.int({ min: 0, max: 100000 }),
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
        }
    }

    async create(tag: TagInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let o: TagCreate = {
            ...tag,
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

    async get(): Promise<Tag[] | false> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Tag | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, tag: TagUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...tag, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: TagImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
