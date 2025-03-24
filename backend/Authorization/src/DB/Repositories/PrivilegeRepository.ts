import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Privilege, PrivilegeCreate, PrivilegeInput, PrivilegeUpdate, schemaVersion } from '../Models/Privilege'
import { privilegeNames } from '../Models/privilegeNames'
import { MongoDB } from '../mongodb'

export class PrivilegeRepository {
    private collection: Collection<PrivilegeCreate>

    constructor(collection: Collection<PrivilegeCreate>) {
        this.collection = collection
    }

    static async getInstance(): Promise<PrivilegeRepository> {
        return new PrivilegeRepository(await MongoDB.getDbInstance().getPrivilegeCollection())
    }

    static async initialize() {
        const collection = await MongoDB.getDbInstance().getPrivilegeCollection()

        if (await collection.estimatedDocumentCount() === 0) {
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
