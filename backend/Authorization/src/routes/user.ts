import { Router } from "express"
import { stringObjectId } from "@/src/DB/Models/common_schemas"
import { authenticate } from "@/src/middlewares/authenticate"
import { authorize } from "@/src/middlewares/authorize"
import Jwt from "jsonwebtoken";
import { readableFields, userSchema, userUpdateSchema } from "@/src/DB/Models/User"
import { SessionManager } from "@/src/DB/Session/SessionManager"
import { DateTime } from "luxon"
import { boolean, mixed, number, string } from "yup"
import { CommunicationManagement } from "../CommunicationManagement"
import busboy from "busboy";
import { UserRepository } from "../DB/Repositories/UserRepository";
import { UserProfilePictureRepository } from "../DB/Repositories/UserProfilePictureRepository";
import { AuthManager } from "../AuthManager";

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
        const user = await userRepository.getById(userId)
        if (!user) {
            res.sendStatus(404)
            return
        }

        res.json(Object.fromEntries(Object.entries(user).filter(f => readableFields.includes(f[0] as any))))
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
        if (file === undefined) {
            res.sendStatus(404)
            return
        }

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

        bb.on("finish", async () => {
            if (files.length !== 1)
                return res.status(400).json({ errors: ['only one file is allowed'] })

            const uploadedFiles: { filename: string, id: string }[] = [];

            const userProfilePictureRepository = await UserProfilePictureRepository.getInstance()

            files.forEach((file) => {
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
        if (file === undefined) {
            res.sendStatus(404)
            return
        }

        if ((await userProfilePictureRepository.deleteFile(file._id)) !== true) {
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

user.post('/notify-code', authenticate, async (req, res) => {
    try {
        const { usePhoneNumber, updateField } = req.body

        if (!boolean().required().isValidSync(usePhoneNumber) || !mixed().required().oneOf(['email', 'phoneNumber', 'username', 'password']).isValidSync(updateField)) {
            res.sendStatus(400)
            return
        }

        if (await authorize(req, `update-user-self-${updateField}`) !== true) {
            res.sendStatus(403)
            return
        }

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()
        const user = await userRepository.getById(userId)

        if (!user || (usePhoneNumber === true && !user.phoneNumber) || (usePhoneNumber !== true && !user.email)) {
            res.sendStatus(400)
            return
        }

        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log(code)

        const content = `Your verification code is: ${code}\n\nfrom sender`

        if (usePhoneNumber)
            await CommunicationManagement.notify('sms', { content, to: user.phoneNumber! })
        else
            await CommunicationManagement.notify('email', { content, to: user.email!, subject: 'Verification Code' })

        const expiresAt = DateTime.utc().plus({ seconds: 60 }).toUnixInteger()
        let sessionId = `update_field_${updateField}`
        try { sessionId = await SessionManager.setSession(sessionId, JSON.stringify({ code, expiresAt }), expiresAt, sessionId) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        if (!sessionId)
            throw new Error('system failed to set session')

        res
            .cookie('sessionId', AuthManager.getInstance().generateTokenForSessionId(sessionId, '60000 milliseconds'), {
                httpOnly: true,
                secure: true,
                maxAge: 60000,
                sameSite: 'strict',
            })
            .sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.post('/code', authenticate, async (req, res) => {
    try {
        const { code } = req.body

        const sessionIdToken = req?.cookies?.sessionId

        if (!string().required().isValidSync(sessionIdToken) || !number().required().strict(true).isValidSync(code)) {
            res.sendStatus(400)
            return
        }

        const payload = await AuthManager.getInstance().verifySessionIdToken(sessionIdToken)
        if (payload === undefined) {
            res.sendStatus(400)
            return
        }

        const sessionId = payload?.sub
        if (!string().required().isValidSync(sessionId) || !sessionId.includes('update_field_') || !['email', 'username', 'phoneNumber', 'password'].includes(sessionId.split('update_field_')[1])) {
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

        const expiresAt = DateTime.utc().plus({ seconds: 4 * 60 }).toUnixInteger()
        let newSessionId = `update_field_${sessionId.split('update_field_')[1]}`
        try { newSessionId = await SessionManager.setSession(newSessionId, JSON.stringify({ verified: true, expiresAt }), expiresAt, newSessionId) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        if (!sessionId)
            throw new Error('system failed to set session')

        res
            .cookie('sessionId', newSessionId, {
                httpOnly: true,
                secure: true,
                maxAge: 4 * 60 * 1000, // One Week
                sameSite: 'strict',
            })
            .sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.patch('/sensitive', authenticate, async (req, res) => {
    const { updateValue } = req.body

    if (!string().required().isValidSync(updateValue)) {
        res.status(400).json({ errors: ['invalid updateValue'] })
        return
    }

    const sessionIdToken = req?.cookies?.sessionId
    if (!string().required().isValidSync(sessionIdToken)) {
        res.status(400).json({ errors: ['invalid sessionIdToken'] })
        return
    }

    const payload = await AuthManager.getInstance().verifySessionIdToken(sessionIdToken)
    if (payload === undefined) {
        res.sendStatus(400)
        return
    }

    const sessionId = payload?.sub
    if (!string().required().isValidSync(sessionId) || !sessionId.includes('update_field_') || !['email', 'username', 'phoneNumber', 'password'].includes(sessionId.split('update_field_')[1])) {
        res.sendStatus(400)
        return
    }

    const field = sessionId.split('update_field_')[1]
    if (!mixed().required().oneOf(['email', 'phoneNumber', 'username', 'password']).isValidSync(field)) {
        res.status(400).json({ errors: ['invalid field'] })
        return
    }

    if (await authorize(req, `update-user-self-${field}`) !== true) {
        res.sendStatus(403)
        return
    }

    if (updateValue && !userSchema.pick([field as any]).required().isValidSync({ [field]: updateValue })) {
        res.status(400).json({ errors: ['invalid updateValue'] })
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

    let { verified, expiresAt: inSessionExpiresAt } = JSON.parse(json)
    inSessionExpiresAt = Number(inSessionExpiresAt)

    console.log('from redis', { verified, inSessionExpiresAt })

    if (verified !== true || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
        res.sendStatus(400)
        return
    }

    const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
    if (!stringObjectId.required().isValidSync(userId)) {
        res.sendStatus(403)
        return
    }

    const userRepository = await UserRepository.getInstance()
    const r = await userRepository.updateImmutable(userId, { [field]: updateValue } as any)
    if (r === false || !r.acknowledged) {
        res.sendStatus(500)
        return
    }

    res.json(r)
})

user.post('/notify-delete-code', authenticate, async (req, res) => {
    try {
        const { usePhoneNumber, deleteField } = req.body

        if (!boolean().required().isValidSync(usePhoneNumber) || (deleteField && !mixed().required().oneOf(['email', 'phoneNumber']).isValidSync(deleteField))) {
            res.sendStatus(400)
            return
        }

        if ((deleteField && await authorize(req, `delete-user-self-${deleteField}`) !== true) || (!deleteField && await authorize(req, 'delete-user-self') !== true)) {
            res.sendStatus(403)
            return
        }

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()
        const user = await userRepository.getById(userId)

        if (!user || (usePhoneNumber === true && !user.phoneNumber) || (usePhoneNumber !== true && !user.email)) {
            res.sendStatus(400)
            return
        }

        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log(code)

        const content = `Your verification code is: ${code}\n\nfrom sender`

        if (usePhoneNumber)
            await CommunicationManagement.notify('sms', { content, to: user.phoneNumber! })
        else
            await CommunicationManagement.notify('email', { content, to: user.email!, subject: 'Verification Code' })

        const expiresAt = DateTime.utc().plus({ seconds: 60 }).toUnixInteger()
        let sessionId = deleteField ? `delete_field_${deleteField}` : 'delete_account'
        try { sessionId = await SessionManager.setSession(sessionId, JSON.stringify({ code, expiresAt }), expiresAt, sessionId) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        if (!sessionId)
            throw new Error('system failed to set session')

        res
            .cookie('sessionId', AuthManager.getInstance().generateTokenForSessionId(sessionId, '60000 milliseconds'), {
                httpOnly: true,
                secure: true,
                maxAge: 60000,
                sameSite: 'strict',
            })
            .sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

user.post('/delete-code', authenticate, async (req, res) => {
    try {
        const { code } = req.body

        const sessionIdToken = req?.cookies?.sessionId

        if (!string().required().isValidSync(sessionIdToken) || !number().required().strict(true).isValidSync(code)) {
            res.sendStatus(400)
            return
        }

        const payload = await AuthManager.getInstance().verifySessionIdToken(sessionIdToken)
        if (payload === undefined) {
            res.sendStatus(400)
            return
        }

        const sessionId = payload?.sub
        if (!string().required().isValidSync(sessionId)) {
            res.sendStatus(400)
            return
        }
        if (sessionId.includes('delete_field_') && !['email', 'phoneNumber'].includes(sessionId.split('delete_field_')[1])) {
            res.sendStatus(400)
            return
        }
        if (!sessionId.includes('delete_field_') && sessionId !== 'delete_account') {
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

        const expiresAt = DateTime.utc().plus({ seconds: 4 * 60 }).toUnixInteger()
        let newSessionId = sessionId.includes('delete_field_') ? `delete_field_${sessionId.split('delete_field_')[1]}` : 'delete_account'
        try { newSessionId = await SessionManager.setSession(newSessionId, JSON.stringify({ verified: true, expiresAt }), expiresAt, newSessionId) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        if (!sessionId)
            throw new Error('system failed to set session')

        res
            .cookie('sessionId', newSessionId, {
                httpOnly: true,
                secure: true,
                maxAge: 4 * 60 * 1000, // One Week
                sameSite: 'strict',
            })
            .sendStatus(200)
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

        const sessionIdToken = req?.cookies?.sessionId

        if (!string().required().isValidSync(sessionIdToken)) {
            res.sendStatus(400)
            return
        }

        const payload = await AuthManager.getInstance().verifySessionIdToken(sessionIdToken)
        if (payload === undefined) {
            res.sendStatus(400)
            return
        }

        const sessionId = payload?.sub
        if (sessionId !== 'delete_account') {
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

        let { verified, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { verified, inSessionExpiresAt })

        if (verified !== true || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.sendStatus(400)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

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

user.delete('/email', authenticate, async (req, res) => {
    try {
        const sessionIdToken = req?.cookies?.sessionId

        if (!string().required().isValidSync(sessionIdToken)) {
            res.sendStatus(400)
            return
        }

        const payload = await AuthManager.getInstance().verifySessionIdToken(sessionIdToken)
        if (payload === undefined) {
            res.sendStatus(400)
            return
        }

        const sessionId = payload?.sub
        if (!string().required().isValidSync(sessionId)) {
            res.sendStatus(400)
            return
        }
        if (!sessionId.includes('delete_field_') || sessionId.split('delete_field_')[1] !== 'email') {
            res.sendStatus(400)
            return
        }

        if (await authorize(req, `delete-user-self-email`) !== true) {
            res.sendStatus(403)
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

        let { verified, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { verified, inSessionExpiresAt })

        if (verified !== true || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.sendStatus(400)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()

        const user = await userRepository.getById(userId)
        if (!user || !user.phoneNumber) {
            res.sendStatus(400)
            return
        }

        const r = await userRepository.deleteEmail(userId)
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

user.delete('/phoneNumber', authenticate, async (req, res) => {
    try {
        const sessionIdToken = req?.cookies?.sessionId

        if (!string().required().isValidSync(sessionIdToken)) {
            res.sendStatus(400)
            return
        }

        const payload = await AuthManager.getInstance().verifySessionIdToken(sessionIdToken)
        if (payload === undefined) {
            res.sendStatus(400)
            return
        }

        const sessionId = payload?.sub
        if (!string().required().isValidSync(sessionId)) {
            res.sendStatus(400)
            return
        }
        if (!sessionId.includes('delete_field_') || sessionId.split('delete_field_')[1] !== 'phoneNumber') {
            res.sendStatus(400)
            return
        }

        if (await authorize(req, `delete-user-self-phoneNumber`) !== true) {
            res.sendStatus(403)
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

        let { verified, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { verified, inSessionExpiresAt })

        if (verified !== true || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.sendStatus(400)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const userRepository = await UserRepository.getInstance()

        const user = await userRepository.getById(userId)
        if (!user || !user.email) {
            res.sendStatus(400)
            return
        }

        const r = await userRepository.deletePhoneNumber(userId)
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
