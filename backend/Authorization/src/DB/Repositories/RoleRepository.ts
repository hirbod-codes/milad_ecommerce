import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Role, RoleCreate, RoleInput, RoleUpdate, RoleWithPrivileges, schemaVersion } from '../Models/Role'
import { collectionName } from '../Models/Privilege'
import { defaultRolePrivilegeNames } from '../Models/privilegeNames'
import { MongoDB } from '../mongodb'
import { PrivilegeRepository } from './PrivilegeRepository'

export class RoleRepository extends MongoDB {
    private collection: Collection<RoleCreate>

    constructor(collection: Collection<RoleCreate>) {
        super();

        this.collection = collection
    }

    static async getInstance(): Promise<RoleRepository> {
        return new RoleRepository(await MongoDB.getDbInstance().getRoleCollection())
    }

    static async initialize() {
        const collection = await MongoDB.getDbInstance().getRoleCollection()
        const roleRepository = await RoleRepository.getInstance()

        if ((await collection.estimatedDocumentCount()) === 0) {
            let privileges = await (await PrivilegeRepository.getInstance()).get()

            if (privileges === false || privileges.length === 0)
                throw new Error('System failed to initialize roles')

            let r = await roleRepository.create({
                name: 'admin',
                privileges: privileges.map(p => p._id),
            })
            if (r === false || !r.acknowledged)
                throw new Error('System failed to initialize roles')

            r = false

            r = await roleRepository.create({
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

    async isNameExist(name: string): Promise<boolean> {
        try { return await this.collection.countDocuments({ name }) !== 0 }
        catch (e) { console.error(e); return false }
    }

    async get(): Promise<Role[]> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return [] }
    }

    async getById(id: string | ObjectId): Promise<RoleWithPrivileges | null | undefined> {
        try {
            if (typeof id === 'string')
                id = ObjectId.createFromHexString(id)

            return (await this.collection.aggregate()
                .match({ _id: id })
                .lookup({
                    from: collectionName,
                    localField: 'privileges',
                    foreignField: '_id',
                    as: 'privileges'
                })
                .toArray() as RoleWithPrivileges[])[0]
        }
        catch (e) { console.error(e); return undefined }
    }

    async getByIds(ids: (string | ObjectId)[]): Promise<RoleWithPrivileges[]> {
        try {
            ids = ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id)

            return await this.collection.aggregate()
                .match({ _id: { $in: ids } })
                .lookup({
                    from: collectionName,
                    localField: 'privileges',
                    foreignField: '_id',
                    as: 'privileges'
                })
                .toArray() as RoleWithPrivileges[]
        }
        catch (e) { console.error(e); return [] }
    }

    async getByNames(names: string[]): Promise<RoleWithPrivileges[]> {
        try {
            return await this.collection.aggregate()
                .match({ name: { $in: names } })
                .lookup({
                    from: collectionName,
                    localField: 'privileges',
                    foreignField: '_id',
                    as: 'privileges'
                })
                .toArray() as RoleWithPrivileges[]
        }
        catch (e) { console.error(e); return [] }
    }

    async getRolesWithPrivileges(roles?: string | string[]): Promise<RoleWithPrivileges[] | false> {
        try {
            if (roles && !Array.isArray(roles))
                roles = [roles]

            let aggregate = this.collection.aggregate()

            if (roles)
                aggregate = aggregate.match({ name: { $in: roles } })

            return await aggregate
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
        try {
            await this.startTransaction()
            return await this.collection.deleteOne({ $and: [{ _id: ObjectId.createFromHexString(id) }, { name: { $ne: 'default' } }] })
        }
        catch (e) { console.error(e); return false }
    }
}
