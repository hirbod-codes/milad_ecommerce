import { Db, GridFSBucket, GridFSBucketReadStream, GridFSBucketWriteStream, GridFSFile, MongoClient, ObjectId } from "mongodb";
import { MongoDB } from "../../mongodb";
import { contentType } from "prom-client";

export class ProductPictureRepository extends MongoDB {
    private collection: GridFSBucket

    constructor(collection: GridFSBucket) {
        super();
        this.collection = collection
    }

    static async getInstance(mongoDB?: MongoDB): Promise<ProductPictureRepository> {
        return new ProductPictureRepository(await (mongoDB ? mongoDB : MongoDB.getDbInstance()).getProductPictureBucket())
    }

    getReadStream(fileId: string | ObjectId): GridFSBucketReadStream {
        return this.collection.openDownloadStream(typeof fileId === 'string' ? ObjectId.createFromHexString(fileId) : fileId)
    }

    getWriteStream(fileName: string, productId: string | ObjectId, contentType?: string): GridFSBucketWriteStream {
        return this.collection.openUploadStream(fileName, { metadata: { productId: typeof productId === 'string' ? ObjectId.createFromHexString(productId) : productId, contentType } })
    }

    async uploadFile(productId: string, file: { fileName: string; bytes: Buffer | Uint8Array; contentType?: string }): Promise<string | undefined> {
        const result = await (() => new Promise<string | undefined>(async (res, rej) => {
            const upload = this.getWriteStream(file.fileName, productId, file.contentType)
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
            const result = await (() => new Promise<boolean>((res, rej) => {
                const upload = this.getWriteStream(file.fileName, productId, file.contentType)
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
            return (await this.collection.find({ _id: ObjectId.createFromHexString(fileId) }).toArray())[0];
        } catch (e) {
            console.error(e)
            return undefined
        }
    }

    async getFiles(fileIds: string[]): Promise<GridFSFile[]> {
        try {
            return await this.collection.find({ _id: { $in: fileIds.map(id => ObjectId.createFromHexString(id)) } }).toArray();
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async getFilesByProductId(productIds: string | string[]): Promise<GridFSFile[]> {
        try {
            return await this.collection.find({ 'metadata.productId': typeof productIds === 'string' ? ObjectId.createFromHexString(productIds) : { $in: productIds.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) } }).toArray();
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async downloadFile(writeStream: NodeJS.WritableStream, fileId: string): Promise<boolean> {
        console.log('downloading file...');

        return new Promise<boolean>(async (resolve, reject) => {
            const readStream = this.getReadStream(fileId)

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
            const cursor = await this.collection.find({ 'metadata.productId': typeof productId === 'string' ? ObjectId.createFromHexString(productId) : productId }).toArray()

            for (const doc of cursor)
                await this.collection.delete(new ObjectId(doc._id))

            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async deleteFiles(fileIds?: string[]): Promise<boolean> {
        try {
            if (!fileIds)
                fileIds = (await this.collection.find().toArray()).map(m => m._id.toString())

            for (const id of fileIds)
                await this.collection.delete(ObjectId.createFromHexString(id))

            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async deleteFile(fileId: string): Promise<boolean> {
        try {
            await this.collection.delete(ObjectId.createFromHexString(fileId))

            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }
}
