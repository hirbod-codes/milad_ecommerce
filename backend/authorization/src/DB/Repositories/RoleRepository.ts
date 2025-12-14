import { ClientSession, Collection, Db, DeleteResult, InsertOneResult, MongoSystemError, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { RoleCreate, RoleInput, RoleUpdate, RoleWithPrivileges, schemaVersion, collectionName } from '../Models/Role'
import { defaultRolePrivilegeNames } from '../Models/privilegeNames'
import { PrivilegeRepository } from './PrivilegeRepository'
import { faker } from '@faker-js/faker'
import { IRepository, MongoDB } from '@monorepo/mongodb'
import { ISeedable } from '@monorepo/mongodb/dist/ISeedable';
import { IDropable } from '@monorepo/mongodb/dist/IDropable'

export class RoleRepository implements IRepository, ISeedable, IDropable {
    IDropable: 'IDropable' = 'IDropable';
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
            await db.createIndex(collectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    private async getCollection(): Promise<Collection<RoleCreate>> {
        return (await MongoDB.getDb()).collection<RoleCreate>(collectionName)
    }

    static async getInstance(): Promise<RoleRepository> {
        return new RoleRepository()
    }

    static async initialize() {
        console.log('Initializing Roles...');

        const collection = (await MongoDB.getDb()).collection<RoleCreate>(collectionName)
        const roleRepository = await RoleRepository.getInstance()

        if ((await collection.estimatedDocumentCount()) !== 0)
            return

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

        console.log('Initialized Roles');
    }

    async seed(count: number = 10) {
        const collection = (await MongoDB.getDb()).collection<RoleCreate>(collectionName)
        const privilegeRepository = await PrivilegeRepository.getInstance()

        console.log('Seeding roles...');

        if (!(await collection.deleteMany({ name: { $ne: 'admin' } })).acknowledged)
            throw new Error('Deleting roles failed!')

        const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
        const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

        const privileges = await privilegeRepository.get()
        if (privileges === false || privileges.length === 0)
            throw new Error('No privileges found!')

        for (let i = 0; i < count; i++) {
            let safety = 0
            while (safety < 10) {
                safety++
                try {
                    const name = faker.name.firstName()
                    const selectedPrivileges = faker.helpers.arrayElements(privileges, faker.datatype.number({ min: 1, max: 12 }))
                    const ts = faker.datatype.number({ min: startTimeTS, max: endTimeTS })

                    faker.setLocale('fa')
                    const displayName = { fa: faker.name.firstName(), en: name }
                    faker.setLocale('en_US')

                    let r = await collection.insertOne({
                        schemaVersion,
                        name,
                        displayName,
                        privileges: selectedPrivileges.map(sp => sp._id),
                        createdAt: ts,
                        updatedAt: ts,
                    })
                    console.log('Seeded roles', r);
                    if (r.acknowledged)
                        break
                } catch (e) {
                    if (!(e instanceof MongoSystemError) || e.code !== 11000)
                        throw e
                }

                if (safety >= 10)
                    throw new Error('Failed to insert a role')
            }
        }

        console.log('Seeded roles');
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

        try { return await (await this.getCollection()).insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async isNameExist(name: string): Promise<boolean> {
        try { return await (await this.getCollection()).countDocuments({ name }) !== 0 }
        catch (e) { console.error(e); return false }
    }

    async get(): Promise<RoleWithPrivileges[]> {
        try {
            return await (await this.getCollection()).aggregate()
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

    async getById(id: string | ObjectId): Promise<RoleWithPrivileges | null | undefined> {
        try {
            if (typeof id === 'string')
                id = ObjectId.createFromHexString(id)

            return (await (await this.getCollection()).aggregate()
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

            return await (await this.getCollection()).aggregate()
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
            return await (await this.getCollection()).aggregate()
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

            let aggregate = (await this.getCollection()).aggregate()

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
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...role, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string | ObjectId): Promise<DeleteResult | false> {
        try {
            if (typeof id === 'string')
                id = ObjectId.createFromHexString(id)

            const role = await (await this.getCollection()).findOne({ _id: id })
            if (!role || role.name === 'default' || role.name === 'admin')
                return false

            const deleteResult = await (await this.getCollection()).deleteOne({ $and: [{ _id: id }, { name: { $nin: ['default', 'admin'] } }] });

            if (!deleteResult.acknowledged)
                return false

            // Add logic to handle users with the deleted role

            return deleteResult
        }
        catch (e) { console.error(e); return false }
    }
}
