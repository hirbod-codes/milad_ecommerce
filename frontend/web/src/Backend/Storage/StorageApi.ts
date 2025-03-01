import { IStorage } from "./IStorage"
import { Storage } from "./Storage"

export class StorageApi {
    static storageInstance?: IStorage = undefined

    static async init() {
        this.storageInstance = new Storage()
    }

    static hasInit(): boolean {
        return this.storageInstance !== undefined
    }

    static async getInstance(): Promise<IStorage> {
        if (this.hasInit() === false)
            await this.init()

        return this.storageInstance!
    }
}
