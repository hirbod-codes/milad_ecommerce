import { ClientSession, Collection, Db, DeleteResult, InsertOneResult, MongoSystemError, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Tag, TagCreate, TagImmutable, TagInput, TagUpdate, collectionName, schemaVersion } from '../Models/Tag'
import { IRepository, MongoDB } from '@monorepo/mongodb';
import { faker } from '@faker-js/faker';
import { v4 as uuid } from 'uuid';
import { ISeedable } from '@monorepo/mongodb/dist/ISeedable';

export class TagRepository implements IRepository, ISeedable {
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

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(collectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    private async getCollection(): Promise<Collection<TagCreate>> {
        return (await MongoDB.getDb()).collection<TagCreate>(collectionName)
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    async seed(count?: number) {
        console.log('TagRepository.seed()')
        console.time()

        try {
            const collection = await this.getCollection()

            if ((await collection.countDocuments()) !== 0) {
                console.warn(`${collectionName} collection is not empty!`)
                return
            }

            if (count === undefined)
                count = 150

            const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
            const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

            const promises = []

            for (let i = 0; i < count; i++) {
                promises.push(
                    (async () => {
                        let safety = 0
                        while (safety < 10) {
                            safety++
                            try {
                                const ts = faker.datatype.number({ min: startTimeTS, max: endTimeTS })
                                const name = faker.name.firstName() + uuid()
                                faker.setLocale('fa')
                                const faName = faker.name.firstName() + uuid()
                                faker.setLocale('en_US')

                                let r = await collection.insertOne({
                                    schemaVersion,
                                    name: name,
                                    displayName: { fa: faName, en: name },
                                    views: faker.datatype.number({ min: 0, max: 100000 }),
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

                        if (safety >= 10)
                            throw new Error('safety triggered while seeding tags!')
                    })()
                        .catch((e) => { throw new e })
                        .finally(() => {
                            console.log(`tag ${i}`)
                        })
                )
            }

            await Promise.allSettled(promises)
        } finally { console.timeEnd() }
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

        try { return await (await this.getCollection()).insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async isNameExist(name: string): Promise<boolean> {
        try { return await (await this.getCollection()).countDocuments({ name }) !== 0 }
        catch (e) { console.error(e); return false }
    }

    async get(): Promise<Tag[] | false> {
        try { return await (await this.getCollection()).find().toArray() }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Tag | null | undefined> {
        try { return await (await this.getCollection()).findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, tag: TagUpdate): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...tag, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: TagImmutable): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await (await this.getCollection()).deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
