import { Router } from "express";
import { array, number, object, string } from "yup";
import { stringObjectId } from "../DB/Models/common_schemas";
import { UserRepository } from "../DB/Repositories/UserRepository";
import { readableFields, User, userSchema, userUpdateSchema, forbiddenFieldsToRead } from "../DB/Models/User";
import { Filter, SortDirection } from "mongodb";
import { FilterManagement } from "../DB/FilterManagement";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import busboy from "busboy";
import { UserProfilePictureRepository } from "../DB/Repositories/UserProfilePictureRepository";

const users = Router()

users.get('/username-exists', async (req, res) => {
    try {
        const { username } = req.query

        const s = userSchema.pick(['username']).required().strict(true)
        if (!s.isValidSync({ username })) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        res.json({ exists: await userRepository.usernameExists(s.cast({ username }).username) })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.get('/email-exists', async (req, res) => {
    try {
        const { email } = req.query

        const s = userSchema.pick(['email']).required().strict(true)
        if (!email || !s.isValidSync({ email })) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        res.json({ exists: await userRepository.emailExists(s.cast({ email }).email!) })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.get('/phoneNumber-exists', async (req, res) => {
    try {
        const { phoneNumber } = req.query

        const s = userSchema.pick(['phoneNumber']).required().strict(true)
        if (!phoneNumber || !s.isValidSync({ phoneNumber })) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        res.json({ exists: await userRepository.phoneNumberExists(s.cast({ phoneNumber }).phoneNumber!) })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.get('/ids', authenticate, async (req, res) => {
    try {
        const { ids: idsStr } = req.query

        if (!string().required().strict(true).isValidSync(idsStr)) {
            res.sendStatus(400)
            return
        }

        const ids = idsStr.split(',')
        if (!array().required().min(1).strict(true).of(stringObjectId.required()).isValidSync(ids)) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        const users = await userRepository.getByIds(ids)
        if (!users)
            res.sendStatus(404)
        else
            res.json(users.map(user => Object.fromEntries(Object.entries(user).filter(f => readableFields.includes(f[0] as any)))))
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.get('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'get-user') !== true) {
            res.sendStatus(403)
            return
        }

        const { filter: filterJson, sort: sortJson, limit: limitStr, skip: skipStr } = req.query

        if (!number().optional().min(0).integer().isValidSync(limitStr)) {
            res.status(400).json({ errors: ['invalid limit'] })
            return
        }

        if (!number().optional().min(0).integer().isValidSync(skipStr)) {
            res.status(400).json({ errors: ['invalid skip'] })
            return
        }

        let limit = number().required().min(0).integer().cast(limitStr ?? 25)
        let skip = number().required().min(0).integer().cast(skipStr ?? 0)

        let sort: { field: keyof User, direction: SortDirection }[] = []
        if (sortJson) {
            sort = JSON.parse(sortJson.toString())

            const sortSchema = array().required().strict(true).of(
                object().required().noUnknown(true).strict(true).shape({
                    field: string().strict(true).required().oneOf(readableFields),
                    direction: string().strict(true).required().oneOf(['asc', 'desc', 'ascending', 'descending'])
                })
            )

            if (!sortSchema.isValidSync(sort)) {
                res.status(400).json({ errors: ['invalid sort'] })
                return
            }
        }

        let filter: Filter<User> = {}
        if (filterJson) {
            filter = JSON.parse(filterJson.toString())

            const filterSchema = object().required().strict(true)

            if (!filterSchema.isValidSync(filter)) {
                res.status(400).json({ errors: ['invalid filter'] })
                return
            }

            if (filter === undefined || FilterManagement.validateFilters<User>(filter, userSchema, undefined, forbiddenFieldsToRead) !== true) {
                if (req.headers.accept?.includes('plain/text') ?? false)
                    res.status(400).send('invalid filter')
                else
                    res.status(400).json({ errors: ['invalid filter'] })

                return
            }
        }

        const userRepository = await UserRepository.getInstance()
        const users = await userRepository.get(filter, sort, limit, skip)
        if (users === false)
            res.sendStatus(500)
        else
            res.status(200).json(users.map(user => Object.fromEntries(Object.entries(user).filter(f => readableFields.includes(f[0] as any)))))
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.get('/picture', async (req, res) => {
    try {
        const { fileId, userId } = req.query

        if (fileId && !stringObjectId.required().isValidSync(fileId)) {
            res.sendStatus(400)
            return
        }

        if (userId && !stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(400)
            return
        }

        if (!fileId && !userId) {
            res.sendStatus(400)
            return
        }

        const userProfilePictureRepository = await UserProfilePictureRepository.getInstance()

        let file
        if (fileId)
            file = await userProfilePictureRepository.getFile(fileId)
        else
            file = await userProfilePictureRepository.getFileByUserId(userId!)

        if (file === undefined) {
            res.sendStatus(404)
            return
        }

        res.setHeader('Content-Type', file?.metadata?.contentType)

        const readstream = userProfilePictureRepository.getReadStream(file._id);

        readstream.pipe(res)

        readstream.on('error', e => {
            console.error(e)
            res.sendStatus(500)
        })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.post('/picture/:userId', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user') !== true) {
            res.sendStatus(403)
            return
        }

        const { userId } = req.params
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const files: {
            filename: string,
            mimeType: string,
            size: number,
            buffer: Buffer,
        }[] = [];
        const maxFiles = 1; // Maximum number of files allowed
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ["image/jpeg", "image/png", "application/jpg"];

        const bb = busboy({ limits: { fileSize: maxFileSize, parts: maxFiles }, headers: req.headers });

        bb.on("file", (name, stream, { filename, mimeType, encoding }) => {
            if (files.length > maxFiles) {
                stream.resume(); // Discard the file if the maximum number of files is reached
                return
            }

            const chunks: Uint8Array[] = []
            stream.on("data", (chunk) => {
                chunks.push(chunk)
            })

            stream.on("end", () => {
                const buffer = Buffer.concat(chunks)
                const fileData = {
                    filename,
                    mimeType,
                    size: buffer.length,
                    buffer,
                }

                // Validate the file
                if (fileData.size > maxFileSize)
                    return res.status(400).json({ message: `File size exceeds valid range` })

                if (!allowedTypes.includes(fileData.mimeType))
                    return res.status(400).json({ message: `Invalid file extension` })

                files.push(fileData)
            })
        })

        bb.on("finish", async () => {
            if (files.length === 0)
                return res.status(400).json({ message: "No files uploaded" })

            console.log('files', files)

            const userProfilePictureRepository = await UserProfilePictureRepository.getInstance()

            files.forEach((file) => {
                const writeStream = userProfilePictureRepository.getWriteStream(file.filename, userId, file.mimeType)

                writeStream.on("finish", () => {
                    res.status(201).json({ filename: file.filename, id: writeStream.id.toString() })
                })

                writeStream.on("error", (err) => {
                    console.error("File upload failed:", err)
                    res.status(500).json({ message: "File upload failed", error: err.message })
                })

                writeStream.write(file.buffer)
                writeStream.end()
            })
        })

        req.pipe(bb)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.delete('/picture', async (req, res) => {
    try {
        const { fileId } = req.body
        if (!stringObjectId.required().isValidSync(fileId)) {
            res.sendStatus(400)
            return
        }

        const userPictureRepository = await UserProfilePictureRepository.getInstance()
        const file = await userPictureRepository.deleteFile(fileId)
        if (file === false) {
            res.sendStatus(404)
            return
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user') !== true) {
            res.sendStatus(403)
            return
        }

        const { userId, user } = req.body

        if (!stringObjectId.required().isValidSync(userId) || !userUpdateSchema.isValidSync(user) || Object.entries(user).length === 0) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        const r = await userRepository.update(userId, userUpdateSchema.cast(user))

        if (r === false)
            res.sendStatus(500)
        else
            res.status(200).json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.delete('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-user') !== true) {
            res.sendStatus(403)
            return
        }

        const userId = req.body

        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        const r = await userRepository.delete(userId)

        if (r === false)
            res.sendStatus(500)
        else
            res.status(200).json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { users }
