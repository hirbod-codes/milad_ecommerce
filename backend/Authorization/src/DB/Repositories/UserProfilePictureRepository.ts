import { GridFSBucket, GridFSBucketReadStream, GridFSBucketWriteStream, GridFSFile, ObjectId } from "mongodb";

export class UserProfilePictureRepository {
    private collection: GridFSBucket

    constructor(collection: GridFSBucket) {
        this.collection = collection
    }

    getReadStream(fileId: string | ObjectId): GridFSBucketReadStream {
        return this.collection.openDownloadStream(typeof fileId === 'string' ? ObjectId.createFromHexString(fileId) : fileId)
    }

    getWriteStream(fileName: string, userId: string | ObjectId): GridFSBucketWriteStream {
        return this.collection.openUploadStream(fileName, { metadata: { userId: typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId } })
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

    async getFile(fileId: string): Promise<GridFSFile> {
        return (await this.collection.find({ _id: ObjectId.createFromHexString(fileId) }).toArray())[0];
    }

    async getFiles(fileIds: string[]): Promise<GridFSFile[]> {
        return await this.collection.find({ userId: { $in: fileIds.map(id => ObjectId.createFromHexString(id)) } }).toArray();
    }

    async getFileByUserId(userId: string): Promise<GridFSFile[]> {
        return await this.collection.find({ metadata: { userId: ObjectId.createFromHexString(userId) } }).toArray();
    }

    async getFilesByUserId(userIds: string[]): Promise<GridFSFile[]> {
        return await this.collection.find({ metadata: { userId: { $in: userIds.map(id => ObjectId.createFromHexString(id)) } } }).toArray();
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

    async deleteFiles(userId: string): Promise<boolean> {
        const cursor = await this.collection.find({ metadata: { userId: userId } }).toArray()

        for (const doc of cursor)
            await this.collection.delete(new ObjectId(doc._id))

        return true
    }

    async deleteFile(userId: string, fileId: string, filename: string): Promise<boolean> {
        await this.collection.delete(ObjectId.createFromHexString(fileId))

        return true
    }
}
