import { DateTime } from "luxon";
import { schemaVersion, User, UserCreate, UserInput } from "../Models/User";
import { Collection, InsertOneResult } from 'mongodb'

export class UserRepository {
    private collection: Collection<User>

    constructor(collection: Collection<User>) {
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

    async getUserByEmail(email: string): Promise<User | null | undefined> {
        try { return await this.collection.findOne({ email }) }
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
}
