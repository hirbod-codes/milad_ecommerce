import { ClientSession, Collection, Db, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { collectionName, Privilege, PrivilegeCreate, PrivilegeInput, PrivilegeUpdate, schemaVersion } from '../Models/Privilege'
import { privilegeNames } from '../Models/privilegeNames'
import { IRepository, MongoDB } from '@monorepo/mongodb'
import { ISeedable } from '@monorepo/mongodb/dist/ISeedable';

export class PrivilegeRepository implements IRepository, ISeedable {
    IRepository: 'IRepository' = 'IRepository';
    ISeedable: 'ISeedable' = 'ISeedable';

    private collection: Collection<PrivilegeCreate>

    constructor(collection: Collection<PrivilegeCreate>) {
        this.collection = collection
    }

    setTransactionSession(session?: ClientSession): void {
    }

    unsetTransactionSession(): void {
    }

    async addCollection(db: Db): Promise<void> {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.createCollection(collectionName)

        const indexes = await db.collection(collectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(collectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async dropCollection(db: Db): Promise<void> {
    }

    async seed(count?: number): Promise<void> {
    }


    static async getInstance(): Promise<PrivilegeRepository> {
        return new PrivilegeRepository(await (await MongoDB.getDb()).collection(collectionName))
    }

    static async initialize() {
        console.log('Initializing privileges...');

        const collection = (await MongoDB.getDb()).collection(collectionName)

        if ((await collection.estimatedDocumentCount()) === 0) {
            let nowTS = DateTime.utc().toUnixInteger()

            let r = await collection.insertMany(privilegeNames.map(name => ({
                schemaVersion,
                name,
                value: true,
                createdAt: nowTS,
                updatedAt: nowTS,
            })))
            if (!r.acknowledged)
                throw new Error('System failed to initialize roles')
        }

        console.log('Initialized privileges');
    }

    async create(privilege: PrivilegeInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let o: PrivilegeCreate = {
            ...privilege,
            schemaVersion,
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

    async get(): Promise<Privilege[] | false> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Privilege | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, privilege: PrivilegeUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...privilege, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
