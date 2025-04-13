import { DateTime } from "luxon";
import { schemaVersion, User, UserCreate, UserImmutable, UserInput, UserUpdate } from "../Models/User";
import { Collection, DeleteResult, Filter, InsertOneResult, MongoSystemError, ObjectId, SortDirection, UpdateResult } from 'mongodb'
import crypto from "crypto";
import { MongoDB } from '../mongodb'
import { faker } from "@faker-js/faker"
import { RoleRepository } from "./RoleRepository";

export class UserRepository {
    private collection: Collection<UserCreate>

    constructor(collection: Collection<UserCreate>) {
        this.collection = collection
    }

    static async getInstance(): Promise<UserRepository> {
        return new UserRepository(await MongoDB.getDbInstance().getUserCollection())
    }

    static async initialize(adminUsername: string, adminPhoneNumber: string, adminEmail: string, adminPassword: string) {
        console.log('adminPassword', adminPassword)
        const collection = await MongoDB.getDbInstance().getUserCollection()

        if (await collection.estimatedDocumentCount() === 0) {
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
        }
    }

    static async seed(count: number = 50) {
        const collection = await MongoDB.getDbInstance().getUserCollection()
        const roleRepository = await RoleRepository.getInstance()

        if (!(await collection.deleteMany({ role: { $ne: 'admin' } })).acknowledged)
            throw new Error('seeding users failed!')

        const roles = await roleRepository.get()
        if (roles.length === 0)
            throw new Error('seeding users failed!')

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
                    const ts = faker.number.int({ min: startTimeTS, max: endTimeTS })

                    const setCred = faker.datatype.boolean(0.3) ? 2 : (faker.datatype.boolean(0.5) ? 1 : 0)

                    const user: UserCreate = {
                        schemaVersion,
                        role: faker.helpers.arrayElement(roles.filter(f => f.name !== 'admin').map(m => m.name)),
                        firstName: faker.person.firstName(),
                        lastName: faker.person.lastName(),
                        username: faker.internet.username(),
                        password: hashedPassword,
                        passwordIterations,
                        passwordSalt,
                        createdAt: ts,
                        updatedAt: ts,
                    }

                    if (setCred === 2 || setCred === 0)
                        user.phoneNumber = '09' + faker.string.numeric({ length: 9, allowLeadingZeros: true })

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
    }

    async createUser(user: UserInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let u: UserCreate = {
            ...user,
            schemaVersion,
            createdAt: ts,
            updatedAt: ts,
        }
        try { return await this.collection.insertOne(u) }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<User | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async getByIds(ids: (string | ObjectId)[]): Promise<User[] | undefined> {
        try { return await this.collection.find({ _id: { $in: ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) } }).toArray() }
        catch (e) { console.error(e); return undefined }
    }

    async get(filter: Filter<User>, sorts: { field: keyof User, direction: SortDirection }[], limit: number, skip: number): Promise<User[] | false> {
        try {
            let cursor = this.collection.find(filter)

            sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async getUserByEmail(email: string): Promise<User | null | undefined> {
        try { return await this.collection.findOne({ email }) }
        catch (e) { console.error(e); return undefined }
    }

    async getUserByPhoneNumber(phoneNumber: string): Promise<User | null | undefined> {
        try { return await this.collection.findOne({ phoneNumber }) }
        catch (e) { console.error(e); return undefined }
    }

    async usernameExists(username: string): Promise<boolean> {
        try { return await this.collection.countDocuments({ username }) > 0 }
        catch (e) { console.error(e); return false }
    }

    async phoneNumberExists(phoneNumber: string): Promise<boolean> {
        try { return await this.collection.countDocuments({ phoneNumber }) > 0 }
        catch (e) { console.error(e); return false }
    }

    async emailExists(email: string): Promise<boolean> {
        try { return await this.collection.countDocuments({ email }) > 0 }
        catch (e) { console.error(e); return false }
    }

    async updateRole(id: string, role: string): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { role, updateAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async update(id: string, user: UserUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...user, updateAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutable(id: string, user: UserImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...user, updateAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }

    async deleteEmail(id: string) {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $unset: { email: 1 } }) }
        catch (e) { console.error(e); return false }
    }

    async deletePhoneNumber(id: string) {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $unset: { phoneNumber: 1 } }) }
        catch (e) { console.error(e); return false }
    }
}
