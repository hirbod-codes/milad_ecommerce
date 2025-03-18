import { DateTime } from "luxon";
import { schemaVersion, User, UserCreate, UserInput, UserUpdate } from "../Models/User";
import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import crypto from "crypto";

export class UserRepository {
    private collection: Collection<UserCreate>

    constructor(collection: Collection<UserCreate>) {
        this.collection = collection
    }

    async initialize(adminUsername: string, adminPhoneNumber: string, adminEmail: string, adminPassword: string) {
        if (await this.collection.estimatedDocumentCount() === 0) {
            let nowTS = DateTime.utc().toUnixInteger()
            let passwordSalt: string | undefined = undefined, iterations: number = 10000
            const password: string = await (async () => {
                return new Promise((resolve, reject) => {
                    passwordSalt = crypto.randomBytes(128).toString('base64')
                    crypto.pbkdf2(adminPassword, passwordSalt, iterations, 64, 'sha512', (err, derivedKey) => {
                        if (err)
                            reject(err)
                        else
                            resolve(derivedKey.toString('hex'))
                    })
                })
            })()

            let r = await this.collection.insertOne({
                schemaVersion,
                username: adminUsername,
                role: 'admin',
                email: adminEmail,
                phoneNumber: adminPhoneNumber,
                passwordIterations: 1000,
                passwordSalt,
                password,
                createdAt: nowTS,
                updatedAt: nowTS,
            })
            if (!r.acknowledged)
                throw new Error('System failed to initialize users')
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

    async get(id: string): Promise<User | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
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
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { role, updateAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async update(id: string, user: UserUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...user, updateAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async updateEmail(id: string, email: string): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { email, updateAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async updatePhoneNumber(id: string, phoneNumber: string): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { phoneNumber, updateAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async updateUsername(id: string, username: string): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { username, updateAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async updatePassword(id: string, password: string, passwordSalt: string, passwordIteration: number): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { password, passwordSalt, passwordIteration, updateAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
