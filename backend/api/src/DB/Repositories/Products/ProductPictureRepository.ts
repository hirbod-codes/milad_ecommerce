import { ClientSession, Db, GridFSBucket, GridFSBucketReadStream, GridFSBucketWriteStream, GridFSFile, MongoClient, ObjectId } from "mongodb";
import { IRepository, MongoDB } from '@monorepo/mongodb';
import { collectionName } from "../../Models/Products/ProductPicture";
import { ISeedable } from '@monorepo/mongodb/dist/ISeedable';

export class ProductPictureRepository implements IRepository, ISeedable {
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

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    private async getCollection(): Promise<GridFSBucket> {
        return new GridFSBucket(await MongoDB.getDb(), { bucketName: collectionName });
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    async seed(count?: number): Promise<void> {
        // throw new Error("Method not implemented.");
    }

    async getReadStream(fileId: string | ObjectId): Promise<GridFSBucketReadStream> {
        return (await this.getCollection()).openDownloadStream(typeof fileId === 'string' ? ObjectId.createFromHexString(fileId) : fileId)
    }

    async getWriteStream(fileName: string, productId: string | ObjectId, contentType?: string): Promise<GridFSBucketWriteStream> {
        return (await this.getCollection()).openUploadStream(fileName, { metadata: { productId: typeof productId === 'string' ? ObjectId.createFromHexString(productId) : productId, contentType } })
    }

    async uploadFile(productId: string, file: { fileName: string; bytes: Buffer | Uint8Array; contentType?: string }): Promise<string | undefined> {
        const result = await (() => new Promise<string | undefined>(async (res, rej) => {
            const upload = await this.getWriteStream(file.fileName, productId, file.contentType)
            upload
                .on('close', () => { res(upload.id.toString()) })
                .write(file.bytes, (e) => {
                    if (e) {
                        console.error(e)
                        res(undefined)
                    } else
                        upload.end()
                })
        }))()

        return result
    }

    async uploadFiles(productId: string, files: { fileName: string; bytes: Buffer | Uint8Array; contentType?: string }[]): Promise<boolean> {
        console.log('uploading...');
        console.log(productId, files.length);

        for (const file of files) {
            const result = await (() => new Promise<boolean>(async (res, rej) => {
                const upload = await this.getWriteStream(file.fileName, productId, file.contentType)
                upload
                    .on('close', () => { console.log('on close'); res(true) })
                    .write(file.bytes, (e) => {
                        console.log('write end')

                        if (e) {
                            console.error(e)
                            res(false)
                        }
                        else
                            upload.end()
                    })
            }))()

            console.log({ result })

            if (!result)
                return false
        }

        console.log('finished uploading.')
        return true
    }

    async getFile(fileId: string): Promise<GridFSFile | undefined> {
        try {
            return (await (await this.getCollection()).find({ _id: ObjectId.createFromHexString(fileId) }).toArray())[0];
        } catch (e) {
            console.error(e)
            return undefined
        }
    }

    async getFiles(fileIds: string[]): Promise<GridFSFile[]> {
        try {
            return await (await this.getCollection()).find({ _id: { $in: fileIds.map(id => ObjectId.createFromHexString(id)) } }).toArray();
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async getFilesByProductId(productIds: string | string[]): Promise<GridFSFile[]> {
        try {
            return await (await this.getCollection()).find({ 'metadata.productId': typeof productIds === 'string' ? ObjectId.createFromHexString(productIds) : { $in: productIds.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) } }).toArray();
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async downloadFile(writeStream: NodeJS.WritableStream, fileId: string): Promise<boolean> {
        console.log('downloading file...');

        return new Promise<boolean>(async (resolve, reject) => {
            const readStream = await this.getReadStream(fileId)

            readStream
                .on('close', async () => {
                    console.log('on close')
                    console.log('exiting...')
                    resolve(true)
                })
                .on('error', e => { console.error(e); resolve(false) })
                .pipe(writeStream, { end: true })
        })
    }

    async deleteFilesByProductId(productId: string): Promise<boolean> {
        try {
            const cursor = await (await this.getCollection()).find({ 'metadata.productId': typeof productId === 'string' ? ObjectId.createFromHexString(productId) : productId }).toArray()

            for (const doc of cursor)
                await (await this.getCollection()).delete(new ObjectId(doc._id))

            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async deleteFiles(fileIds?: string[]): Promise<boolean> {
        try {
            if (!fileIds)
                fileIds = (await (await this.getCollection()).find().toArray()).map(m => m._id.toString())

            for (const id of fileIds)
                await (await this.getCollection()).delete(ObjectId.createFromHexString(id))

            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async deleteFile(fileId: string): Promise<boolean> {
        try {
            await (await this.getCollection()).delete(ObjectId.createFromHexString(fileId))

            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }
}
