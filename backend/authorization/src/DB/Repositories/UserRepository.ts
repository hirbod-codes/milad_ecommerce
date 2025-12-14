import { DateTime } from "luxon";
import { collectionName, schemaVersion, User, UserCreate, UserImmutable, UserInput, UserUpdate } from "../Models/User";
import { ClientSession, Collection, Db, DeleteResult, Filter, InsertOneResult, MongoSystemError, ObjectId, SortDirection, UpdateResult } from 'mongodb'
import crypto from "crypto";
import { faker } from "@faker-js/faker"
import { RoleRepository } from "./RoleRepository";
import { MongoDB, IRepository } from "@monorepo/mongodb";
import { ISeedable } from '@monorepo/mongodb/dist/ISeedable';
import { IDropable } from "@monorepo/mongodb/dist/IDropable";

export class UserRepository implements IRepository, ISeedable, IDropable {
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

        if (indexes.find(i => i.name === 'unique-username') === undefined)
            await db.createIndex(collectionName, { username: 1 }, { unique: true, name: 'unique-username' })

        if (indexes.find(i => i.name === 'unique-email') === undefined)
            await db.createIndex(collectionName, { email: 1 }, { sparse: true, unique: true, name: 'email' })

        if (indexes.find(i => i.name === 'unique-phoneNumber') === undefined)
            await db.createIndex(collectionName, { phoneNumber: 1 }, { sparse: true, unique: true, name: 'phoneNumber' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    private async getCollection(): Promise<Collection<UserCreate>> {
        return (await MongoDB.getDb()).collection<UserCreate>(collectionName)
    }

    static async getInstance(): Promise<UserRepository> {
        return new UserRepository()
    }

    static async initialize(adminUsername: string, adminPhoneNumber: string, adminEmail: string, adminPassword: string) {
        console.log('Initializing Users...');

        console.log('adminPassword', adminPassword)
        const collection = (await MongoDB.getDb()).collection<UserCreate>(collectionName)

        if (await collection.estimatedDocumentCount() !== 0)
            return

        let nowTS = DateTime.utc().toUnixInteger()
        let passwordSalt: string | undefined = undefined, passwordIterations: number = 1000
        const password: string = await (async () => {
            return new Promise((resolve, reject) => {
                passwordSalt = crypto.randomBytes(128).toString('base64')
                crypto.pbkdf2(adminPassword, passwordSalt, passwordIterations, 64, 'sha512', (err, derivedKey) => {
                    if (err)
                        reject(err)
                    else
                        resolve(derivedKey.toString('hex'))
                })
            })
        })()

        let r = await collection.insertOne({
            schemaVersion,
            username: adminUsername,
            role: 'admin',
            email: adminEmail,
            phoneNumber: adminPhoneNumber,
            passwordIterations,
            passwordSalt,
            password,
            createdAt: nowTS,
            updatedAt: nowTS,
        })
        if (!r.acknowledged)
            throw new Error('System failed to initialize users')


        console.log('Initialized Users');
    }

    async seed(count: number = 50) {
        const collection = (await MongoDB.getDb()).collection<UserCreate>(collectionName)
        const roleRepository = await RoleRepository.getInstance()

        console.log('Seeding users...');

        if (!(await collection.deleteMany({ role: { $ne: 'admin' } })).acknowledged)
            throw new Error('Deleting users failed!')

        const roles = await roleRepository.get()
        if (roles.length === 0)
            throw new Error('No roles found!')

        const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
        const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

        let passwordSalt: string | undefined = undefined, passwordIterations: number = 10000
        const hashedPassword: string = await (async () => {
            return new Promise((resolve, reject) => {
                passwordSalt = crypto.randomBytes(128).toString('base64')
                crypto.pbkdf2('Pass99%aa', passwordSalt, passwordIterations, 64, 'sha512', (err, derivedKey) => {
                    if (err)
                        reject(err)
                    else
                        resolve(derivedKey.toString('hex'))
                })
            })
        })()

        for (let i = 0; i < count; i++) {
            let safety = 0
            while (safety < 10) {
                safety++
                try {
                    const ts = faker.datatype.number({ min: startTimeTS, max: endTimeTS })

                    const setCred = faker.datatype.boolean() ? 2 : (faker.datatype.boolean() ? 1 : 0)

                    const user: UserCreate = {
                        schemaVersion,
                        role: faker.helpers.arrayElement(roles.filter(f => f.name !== 'admin').map(m => m.name)),
                        firstName: faker.name.firstName(),
                        lastName: faker.name.lastName(),
                        username: faker.internet.userName(),
                        password: hashedPassword,
                        passwordIterations,
                        passwordSalt,
                        createdAt: ts,
                        updatedAt: ts,
                    }

                    if (setCred === 2 || setCred === 0)
                        user.phoneNumber = '09' + faker.random.numeric(9, { allowLeadingZeros: true })

                    if (setCred === 2 || setCred === 1)
                        user.email = faker.internet.exampleEmail()

                    let r = await collection.insertOne(user)
                    if (r.acknowledged)
                        break
                } catch (e) {
                    if (!(e instanceof MongoSystemError) || e.code !== 11000)
                        throw e
                }
            }
        }

        console.log('Seeded users');
    }

    async createUser(user: UserInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let u: UserCreate = {
            ...user,
            schemaVersion,
            createdAt: ts,
            updatedAt: ts,
        }
        try { return await (await this.getCollection()).insertOne(u) }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<User | null | undefined> {
        try { return await (await this.getCollection()).findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async getByIds(ids: (string | ObjectId)[]): Promise<User[] | undefined> {
        try { return await (await this.getCollection()).find({ _id: { $in: ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) } }).toArray() }
        catch (e) { console.error(e); return undefined }
    }

    async get(filter: Filter<User>, sorts: { field: keyof User, direction: SortDirection }[], limit: number, skip: number): Promise<User[] | false> {
        try {
            let cursor = (await this.getCollection()).find(filter)

            sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async getUserByEmail(email: string): Promise<User | null | undefined> {
        try { return await (await this.getCollection()).findOne({ email }) }
        catch (e) { console.error(e); return undefined }
    }

    async getUserByPhoneNumber(phoneNumber: string): Promise<User | null | undefined> {
        try { return await (await this.getCollection()).findOne({ phoneNumber }) }
        catch (e) { console.error(e); return undefined }
    }

    async usernameExists(username: string): Promise<boolean> {
        try { return await (await this.getCollection()).countDocuments({ username }) > 0 }
        catch (e) { console.error(e); return false }
    }

    async phoneNumberExists(phoneNumber: string): Promise<boolean> {
        try { return await (await this.getCollection()).countDocuments({ phoneNumber }) > 0 }
        catch (e) { console.error(e); return false }
    }

    async emailExists(email: string): Promise<boolean> {
        try { return await (await this.getCollection()).countDocuments({ email }) > 0 }
        catch (e) { console.error(e); return false }
    }

    async updateRole(id: string, role: string): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { role, updateAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async update(id: string, user: UserUpdate): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...user, updateAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutable(id: string, user: UserImmutable): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...user, updateAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await (await this.getCollection()).deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }

    async deleteEmail(id: string) {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $unset: { email: 1 } }) }
        catch (e) { console.error(e); return false }
    }

    async deletePhoneNumber(id: string) {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $unset: { phoneNumber: 1 } }) }
        catch (e) { console.error(e); return false }
    }
}
