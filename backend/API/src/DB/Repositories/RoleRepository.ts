import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb/mongodb'
import { DateTime } from 'luxon'
import { Role, RoleCreate, RoleInput, RoleUpdate, schemaVersion } from '../Models/Role'

export class RoleRepository {
    private collection: Collection<RoleCreate>

    constructor(collection: Collection<RoleCreate>) {
        this.collection = collection
    }

    async create(role: RoleInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let o: RoleCreate = {
            ...role,
            schemaVersion,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await this.collection.insertOne(o) }
        catch (e) {
            console.error(e)
            return false
        }
    }

    async getById(id: string): Promise<Role | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async updateById(id: string, role: RoleUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...role, updatedAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async deleteById(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
