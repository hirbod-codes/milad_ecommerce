import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Role, RoleCreate, RoleInput, RoleUpdate, RoleWithPrivileges, schemaVersion } from '../Models/Role'
import { collectionName } from '../Models/Privilege'
import { privilegeRepository } from '@/src'
import { defaultRolePrivilegeNames } from '../Models/privilegeNames'

export class RoleRepository {
    private collection: Collection<RoleCreate>

    constructor(collection: Collection<RoleCreate>) {
        this.collection = collection
    }

    async initialize() {
        if (await this.collection.estimatedDocumentCount() === 0) {
            let privileges = await privilegeRepository.get()

            if (privileges === false || privileges.length === 0)
                throw new Error('System failed to initialize roles')

            let r = await this.create({
                name: 'admin',
                privileges: privileges.map(p => p._id),
            })
            if (r === false || !r.acknowledged)
                throw new Error('System failed to initialize roles')

            r = false

            r = await this.create({
                name: 'default',
                privileges: privileges.filter(f => defaultRolePrivilegeNames.includes(f.name)).map(p => p._id),
            })
            if (r === false || !r.acknowledged)
                throw new Error('System failed to initialize roles')

        }
    }

    async create(role: RoleInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        role.privileges = role.privileges.map(p => typeof p === 'string' ? ObjectId.createFromHexString(p) : p)

        let o: RoleCreate = {
            ...role,
            schemaVersion,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await this.collection.insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async get(): Promise<Role[]> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return [] }
    }

    async getById(id: string): Promise<Role | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async getByIds(ids: string[]): Promise<Role[]> {
        try { return await this.collection.find({ _id: { $in: ids.map(id => ObjectId.createFromHexString(id)) } }).toArray() }
        catch (e) { console.error(e); return [] }
    }

    async getByNames(names: string[]): Promise<Role[]> {
        try { return await this.collection.find({ name: { $in: names } }).toArray() }
        catch (e) { console.error(e); return [] }
    }

    async getRolesWithPrivileges(): Promise<RoleWithPrivileges[] | false> {
        try {
            return await this.collection.aggregate()
                .lookup({
                    from: collectionName,
                    localField: 'privileges',
                    foreignField: '_id',
                    as: 'privileges'
                })
                .toArray() as RoleWithPrivileges[]
        }
        catch (e) { console.error(e); return false }
    }

    async update(id: string, role: RoleUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...role, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
