import { DateTime } from "luxon";
import { collectionName, ProductCreate, ProductImmutable } from "../Models/Product";
import { ClientSession, Collection, ObjectId, UpdateResult } from 'mongodb'
import { MongoDB } from '@monorepo/mongodb';
import { ProductStatisticsRepository } from "./ProductStatisticsRepository";

export class ProductRepository {
    private session: ClientSession | undefined = undefined

    setTransactionSession(session: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    private async getCollection(): Promise<Collection<ProductCreate>> {
        return (await MongoDB.getDb()).collection<ProductCreate>(collectionName)
    }

    async updateImmutables(id: string | ObjectId, product: ProductImmutable): Promise<UpdateResult | false> {
        try {
            const updateResult = await (await this.getCollection()).updateOne({ _id: typeof id === 'string' ? ObjectId.createFromHexString(id) : id }, { $set: { ...product, updatedAt: DateTime.utc().toUnixInteger() } })
            const productStatisticsRepository = new ProductStatisticsRepository()
            productStatisticsRepository.setTransactionSession(this.session)
            await productStatisticsRepository.updateImmutables(id, product)
            return updateResult
        }
        catch (e) { console.error(e); return false }
    }
}
