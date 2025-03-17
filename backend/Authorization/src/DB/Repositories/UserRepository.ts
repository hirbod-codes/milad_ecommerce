import { DateTime } from "luxon";
import { schemaVersion, User, UserCreate, UserInput, UserUpdate } from "../Models/User";
import { Collection, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'

export class UserRepository {
    private collection: Collection<UserCreate>

    constructor(collection: Collection<UserCreate>) {
        this.collection = collection
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

    async updatePassword(id: string, password: string): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { password, updateAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }
}
