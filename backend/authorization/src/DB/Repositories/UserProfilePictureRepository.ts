import { MongoDB } from "@monorepo/mongodb";
import { GridFSBucket, GridFSBucketReadStream, GridFSBucketWriteStream, GridFSFile, ObjectId } from "mongodb";
import { collectionName } from "../Models/UserProfilePicture";

export class UserProfilePictureRepository {
    private collection: GridFSBucket

    constructor(collection: GridFSBucket) {
        this.collection = collection
    }

    static async getInstance(): Promise<UserProfilePictureRepository> {
        return new UserProfilePictureRepository(new GridFSBucket(await MongoDB.getDb(), { bucketName: collectionName }))
    }

    getReadStream(fileId: string | ObjectId): GridFSBucketReadStream {
        return this.collection.openDownloadStream(typeof fileId === 'string' ? ObjectId.createFromHexString(fileId) : fileId)
    }

    getWriteStream(fileName: string, userId: string | ObjectId, contentType?: string): GridFSBucketWriteStream {
        return this.collection.openUploadStream(fileName, { metadata: { userId: typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId, contentType } })
    }

    async uploadFile(userId: string, file: { fileName: string; bytes: Buffer | Uint8Array; }): Promise<string | undefined> {
        console.log('uploading...');
        console.log(userId);

        const result = await (() => new Promise<string | undefined>(async (res, rej) => {
            const upload = this.getWriteStream(file.fileName, userId)
            upload
                .on('close', () => { console.log('on close'); res(upload.id.toString()) })
                .write(file.bytes, (e) => {
                    console.log('write end')

                    if (e) {
                        console.error(e)
                        res(undefined)
                    }
                    else
                        upload.end()
                })
        }))()

        return result
    }

    async uploadFiles(userId: string, files: { fileName: string; bytes: Buffer | Uint8Array; }[]): Promise<boolean> {
        console.log('uploading...');
        console.log(userId, files.length);

        for (const file of files) {
            const result = await (() => new Promise<boolean>((res, rej) => {
                const upload = this.getWriteStream(file.fileName, userId)
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

    async getFile(fileId: string | ObjectId): Promise<GridFSFile> {
        return (await this.collection.find({ _id: typeof fileId === 'string' ? ObjectId.createFromHexString(fileId) : fileId }).toArray())[0];
    }

    async getFiles(fileIds: (string | ObjectId)[]): Promise<GridFSFile[]> {
        return await this.collection.find({ userId: { $in: fileIds.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) } }).toArray();
    }

    async getFileByUserId(userId: string | ObjectId): Promise<GridFSFile> {
        return (await this.collection.find({ 'metadata.userId': typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId }).toArray())[0];
    }

    async downloadFile(writeStream: NodeJS.WritableStream, fileId: string | ObjectId): Promise<boolean> {
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

    async deleteFiles(userId: string | ObjectId): Promise<boolean> {
        const docs = await this.collection.find({ 'metadata.userId': typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId }).toArray()

        for (const doc of docs)
            await this.collection.delete(doc._id)

        return true
    }

    async deleteFile(fileId: string | ObjectId): Promise<boolean> {
        await this.collection.delete(typeof fileId === 'string' ? ObjectId.createFromHexString(fileId) : fileId)

        return true
    }
}
