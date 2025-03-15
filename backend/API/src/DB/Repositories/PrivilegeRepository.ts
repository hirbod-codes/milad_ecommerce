import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb/mongodb'
import { DateTime } from 'luxon'
import { Privilege, PrivilegeCreate, PrivilegeInput, PrivilegeUpdate, schemaVersion } from '../Models/Privilege'

export class PrivilegeRepository {
    private collection: Collection<PrivilegeCreate>

    constructor(collection: Collection<PrivilegeCreate>) {
        this.collection = collection
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

    async getById(id: string): Promise<Privilege | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async updateById(id: string, privilege: PrivilegeUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...privilege, updatedAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async deleteById(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
