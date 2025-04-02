import { Router } from "express"
import { likeObjectId, stringObjectId } from "@/src/DB/Models/common_schemas"
import { authenticate } from "@/src/middlewares/authenticate"
import { authorize } from "@/src/middlewares/authorize"
import Jwt from "jsonwebtoken";
import { userSchema, userUpdateSchema } from "@/src/DB/Models/User"
import { SessionManager } from "@/src/DB/Session/SessionManager"
import { DateTime } from "luxon"
import crypto from "crypto";
import { string } from "yup"
import { CommunicationManagement } from "../CommunicationManagement"
import busboy from "busboy";
import { UserRepository } from "../DB/Repositories/UserRepository";
import { UserProfilePictureRepository } from "../DB/Repositories/UserProfilePictureRepository";

const user = Router()

user.get('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'get-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        if (!stringObjectId.isValidSync(userId)) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        res.json(await userRepository.getById(userId))
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.get('/avatar', async (req, res) => {
    try {
        if (await authorize(req, 'get-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        if (!stringObjectId.isValidSync(userId)) {
            res.sendStatus(400)
            return
        }

        const userProfilePictureRepository = await UserProfilePictureRepository.getInstance()
        const file = await userProfilePictureRepository.getFileByUserId(userId)
        if (file.length === 0) {
            res.sendStatus(404)
            return
        }

        res.setHeader("Content-Disposition", `attachment;`);
        res.setHeader("Content-Type", "application/octet-stream");

        console.log('result', await userProfilePictureRepository.downloadFile(res, file[0]._id))
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.post('/avatar', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        if (!stringObjectId.isValidSync(userId)) {
            res.sendStatus(400)
            return
        }

        const userProfilePictureRepository = await UserProfilePictureRepository.getInstance()
        if ((await userProfilePictureRepository.deleteFiles(userId)) !== true) {
            res.sendStatus(500)
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
            console.log('mimeType', mimeType)

            if (files.length > maxFiles) {
                stream.resume(); // Discard the file if the maximum number of files is reached
                return;
            }

            const chunks: Uint8Array[] = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });

            stream.on("end", () => {
                const buffer = Buffer.concat(chunks);
                const fileData = {
                    filename,
                    mimeType,
                    size: buffer.length,
                    buffer,
                };

                // Validate the file
                if (fileData.size > maxFileSize)
                    return res.status(400).json({ message: `File size exceeds valid range` })

                if (!allowedTypes.includes(fileData.mimeType))
                    return res.status(400).json({ message: `Invalid file extension` })

                files.push(fileData);
            });
        });

        bb.on('error', e => { console.error(e); res.sendStatus(500) })

        bb.on("finish", () => {
            if (files.length !== 1)
                return res.status(400).json({ errors: ['only one file is allowed'] })

            const uploadedFiles: { filename: string, id: string }[] = [];

            files.forEach(async (file) => {
                const userProfilePictureRepository = await UserProfilePictureRepository.getInstance()
                const writeStream = userProfilePictureRepository.getWriteStream(file.filename, userId, file.mimeType)

                writeStream.on("finish", async () => {
                    uploadedFiles.push({ filename: file.filename, id: writeStream.id.toString() });

                    if (uploadedFiles.length === files.length) {
                        res.status(201).json(uploadedFiles);
                    }
                });

                writeStream.on("error", (err) => {
                    console.error("File upload failed:", err);
                    res.status(500).json({ message: "File upload failed", error: err.message });
                });

                writeStream.write(file.buffer)
                writeStream.end()
            });
        });

        req.pipe(bb)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.delete('/avatar', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        if (!stringObjectId.isValidSync(userId)) {
            res.sendStatus(400)
            return
        }

        const userProfilePictureRepository = await UserProfilePictureRepository.getInstance()
        const file = await userProfilePictureRepository.getFileByUserId(userId)
        if (file.length === 0) {
            res.sendStatus(404)
            return
        }

        if ((await userProfilePictureRepository.deleteFile(file[0]._id)) !== true) {
            res.sendStatus(500)
            return
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.patch('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const user = req.body

        if (!stringObjectId.isValidSync(userId) || !userUpdateSchema.isValidSync(user)) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        const r = await userRepository.update(userId, userUpdateSchema.cast(user))
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.post('/email-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-email') !== true) {
            res.sendStatus(403)
            return
        }

        const { usePhoneNumber } = req.body

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()
        const user = await userRepository.getById(userId)

        if (!user || (usePhoneNumber === true && !user.phoneNumber) || (usePhoneNumber !== true && !user.email)) {
            res.sendStatus(400)
            return
        }

        if (usePhoneNumber)
            await CommunicationManagement.notifyAndRememberForVerificationCode('sms', user.phoneNumber!, 'update_email')
        else
            await CommunicationManagement.notifyAndRememberForVerificationCode('email', user.email!, 'update_email')

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.patch('/email', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-email') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, email, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('patch_email')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
        catch (e) {
            console.error(e)
            throw new Error('session not found')
        }

        if (!json)
            throw new Error('session not found')

        let { code: inSessionCode, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionCode = Number(inSessionCode)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { inSessionCode, inSessionExpiresAt })

        if (inSessionCode !== code || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.sendStatus(400)
            return
        }

        if (!stringObjectId.isValidSync(userId) || !userSchema.pick(['email']).required().isValidSync({ email })) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        const r = await userRepository.updateEmail(userId, email)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.post('/phone-number-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-phone-number') !== true) {
            res.sendStatus(403)
            return
        }

        const { usePhoneNumber } = req.body

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()
        const user = await userRepository.getById(userId)

        if (!user || (usePhoneNumber === true && !user.phoneNumber) || (usePhoneNumber !== true && !user.email)) {
            res.sendStatus(400)
            return
        }

        if (usePhoneNumber)
            await CommunicationManagement.notifyAndRememberForVerificationCode('sms', user.phoneNumber!, 'update_phone_number')
        else
            await CommunicationManagement.notifyAndRememberForVerificationCode('email', user.email!, 'update_phone_number')

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.patch('/phone-number', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-phone-number') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, phoneNumber, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('patch_phone_number')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
        catch (e) {
            console.error(e)
            throw new Error('session not found')
        }

        if (!json)
            throw new Error('session not found')

        let { code: inSessionCode, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionCode = Number(inSessionCode)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { inSessionCode, inSessionExpiresAt })

        if (inSessionCode !== code || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.sendStatus(400)
            return
        }

        if (!stringObjectId.isValidSync(userId) || !userSchema.pick(['phoneNumber']).required().isValidSync({ phoneNumber })) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        const r = await userRepository.updatePhoneNumber(userId, phoneNumber)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.post('/username-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-username') !== true) {
            res.sendStatus(403)
            return
        }

        const { usePhoneNumber } = req.body

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()
        const user = await userRepository.getById(userId)

        if (!user || (usePhoneNumber === true && !user.phoneNumber) || (usePhoneNumber !== true && !user.email)) {
            res.sendStatus(400)
            return
        }

        if (usePhoneNumber)
            await CommunicationManagement.notifyAndRememberForVerificationCode('sms', user.phoneNumber!, 'update_username')
        else
            await CommunicationManagement.notifyAndRememberForVerificationCode('email', user.email!, 'update_username')

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.patch('/username', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-username') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, username, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('patch_username')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
        catch (e) {
            console.error(e)
            throw new Error('session not found')
        }

        if (!json)
            throw new Error('session not found')

        let { code: inSessionCode, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionCode = Number(inSessionCode)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { inSessionCode, inSessionExpiresAt })

        if (inSessionCode !== code || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.sendStatus(400)
            return
        }

        if (!stringObjectId.isValidSync(userId) || !userSchema.pick(['username']).required().isValidSync({ username })) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        const r = await userRepository.updateUsername(userId, username)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.post('/password-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-password') !== true) {
            res.sendStatus(403)
            return
        }

        const { usePhoneNumber } = req.body

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()
        const user = await userRepository.getById(userId)

        if (!user || (usePhoneNumber === true && !user.phoneNumber) || (usePhoneNumber !== true && !user.email)) {
            res.sendStatus(400)
            return
        }

        if (usePhoneNumber)
            await CommunicationManagement.notifyAndRememberForVerificationCode('sms', user.phoneNumber!, 'update_password')
        else
            await CommunicationManagement.notifyAndRememberForVerificationCode('email', user.email!, 'update_password')

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.patch('/password', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-password') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, password, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('patch_password')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
        catch (e) {
            console.error(e)
            throw new Error('session not found')
        }

        if (!json)
            throw new Error('session not found')

        let { code: inSessionCode, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionCode = Number(inSessionCode)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { inSessionCode, inSessionExpiresAt })

        if (inSessionCode !== code || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.sendStatus(400)
            return
        }

        if (!stringObjectId.isValidSync(userId) || !userSchema.pick(['password']).required().isValidSync({ password })) {
            res.sendStatus(400)
            return
        }

        let salt: string = undefined!, iterations: number = 10000
        const hashedPassword: string = await (async () => {
            return new Promise((resolve, reject) => {
                salt = crypto.randomBytes(128).toString('base64')
                crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, derivedKey) => {
                    if (err)
                        reject(err)
                    else
                        resolve(derivedKey.toString('hex'))
                })
            })
        })()

        const userRepository = await UserRepository.getInstance()
        const r = await userRepository.updatePassword(userId, hashedPassword, salt, iterations)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.post('/delete-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        const { usePhoneNumber } = req.body

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()
        const user = await userRepository.getById(userId)

        if (!user || (usePhoneNumber === true && !user.phoneNumber) || (usePhoneNumber !== true && !user.email)) {
            res.sendStatus(400)
            return
        }

        if (usePhoneNumber)
            await CommunicationManagement.notifyAndRememberForVerificationCode('sms', user.phoneNumber!, 'delete_user_self')
        else
            await CommunicationManagement.notifyAndRememberForVerificationCode('email', user.email!, 'delete_user_self')

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.delete('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('delete_user')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
        catch (e) {
            console.error(e)
            throw new Error('session not found')
        }

        if (!json)
            throw new Error('session not found')

        let { code: inSessionCode, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionCode = Number(inSessionCode)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { inSessionCode, inSessionExpiresAt })

        if (inSessionCode !== code || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.sendStatus(400)
            return
        }

        const userRepository = await UserRepository.getInstance()
        const r = await userRepository.delete(userId)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { user }
