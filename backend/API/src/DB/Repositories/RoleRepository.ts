import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Role, RoleCreate, RoleInput, RoleUpdate, RoleWithPrivileges, schemaVersion } from '../Models/Role'
import { collectionName } from '../Models/Privilege'

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
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Role | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async getByPrivilegeName(privilegeNames: string | string[]): Promise<RoleWithPrivileges[]> {
        if (!Array.isArray(privilegeNames))
            privilegeNames = [privilegeNames]

        try {
            return await this.collection.aggregate()
                .lookup({
                    from: collectionName,
                    localField: 'privileges',
                    foreignField: '_id',
                    as: 'privileges'
                })
                .match({
                    "privileges.name": { $in: privilegeNames }
                })
                .toArray() as RoleWithPrivileges[]
        }
        catch (e) { console.error(e); return [] }
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
