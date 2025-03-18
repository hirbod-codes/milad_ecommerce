import { GridFSBucket, GridFSBucketReadStream, GridFSFile, ObjectId } from "mongodb";

export class UserProfilePictureRepository {
    private collection: GridFSBucket

    constructor(collection: GridFSBucket) {
        this.collection = collection
    }

    async uploadFiles(userId: string, files: { fileName: string; bytes: Buffer | Uint8Array; }[]): Promise<boolean> {
        console.log('uploading...');
        console.log(userId, files.length);

        for (const file of files) {
            const result = await (() => new Promise<boolean>((res, rej) => {
                const upload = this.collection.openUploadStream(file.fileName, { metadata: { userId: userId } })
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

    async getReadStream(fileId: string | ObjectId): Promise<GridFSBucketReadStream> {
        return this.collection.openDownloadStream(typeof fileId === 'string' ? ObjectId.createFromHexString(fileId) : fileId)
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
