import { Router } from "express"
import { privilegeRepository, roleRepository, userRepository } from "src"
import { likeObjectId, stringObjectId } from "src/DB/Models/common_schemas"
import { privilegeUpdateSchema } from "src/DB/Models/Privilege"
import { roleInputSchema, roleUpdateSchema } from "src/DB/Models/Role"
import { authenticate } from "src/middlewares/authenticate"
import { authorize } from "src/middlewares/authorize"
import { array, string } from "yup"
import Jwt from "jsonwebtoken";
import { userSchema, userUpdateSchema } from "src/DB/Models/User"
import { SessionManager } from "src/DB/Session/SessionManager"
import { DateTime } from "luxon"
import crypto from "crypto";

const users = Router()

users.post('/role', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'create-role') !== true) {
            res.sendStatus(403)
            return
        }

        const { role: roleInput } = req.body

        if (!roleInputSchema.isValidSync(roleInput)) {
            res.sendStatus(400)
            return
        }

        let r = await roleRepository.create(roleInputSchema.cast(roleInput))
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.status(201).json({ id: r.insertedId })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
        return
    }
})

users.get('/role', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'get-role') !== true) {
            res.sendStatus(403)
            return
        }

        let { names, ids } = req.query

        if (names !== undefined) {
            if (string().required().strict(true).isValidSync(names))
                names = [names]

            if (!array().required().strict(true).of(string().required().strict(true)).isValidSync(names)) {
                res.sendStatus(400)
                return
            }

            res.json(await roleRepository.getByNames(array().required().strict(true).of(string().required().strict(true)).cast(names)))
        } else {
            if (likeObjectId.required().isValidSync(ids))
                ids = [ids]

            if (!array().required().strict(true).of(stringObjectId.required().strict(true)).isValidSync(ids)) {
                res.sendStatus(400)
                return
            }

            res.json(await roleRepository.getByIds(array().required().strict(true).of(stringObjectId.required().strict(true)).cast(ids)))
        }
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/role', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-role') !== true) {
            res.sendStatus(403)
            return
        }

        const { id, role: roleUpdate } = req.body

        if (!stringObjectId.required().isValidSync(id)) {
            res.sendStatus(400)
            return
        }

        if (!roleUpdateSchema.isValidSync(roleUpdate)) {
            res.sendStatus(400)
            return
        }

        let r = await roleRepository.update(id!, roleUpdateSchema.cast(roleUpdate))
        if (r === false) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.delete('/role', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-role') !== true) {
            res.sendStatus(403)
            return
        }

        const { id } = req.body

        if (!stringObjectId.required().isValidSync(id)) {
            res.sendStatus(400)
            return
        }

        let r = await roleRepository.delete(id!)
        if (r === false) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.post('/privilege', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'create-privilege') !== true) {
            res.sendStatus(403)
            return
        }

        const { id, privilege: privilegeUpdate } = req.body

        if (!stringObjectId.required().isValidSync(id)) {
            res.sendStatus(400)
            return
        }

        if (!privilegeUpdateSchema.isValidSync(privilegeUpdate)) {
            res.sendStatus(400)
            return
        }

        let r = await privilegeRepository.update(id!, privilegeUpdateSchema.cast(privilegeUpdate))
        if (r === false) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.delete('/privilege', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-privilege') !== true) {
            res.sendStatus(403)
            return
        }

        const { id } = req.body

        if (!stringObjectId.required().isValidSync(id)) {
            res.sendStatus(400)
            return
        }

        let r = await privilegeRepository.delete(id!)
        if (r === false) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/assign-role', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'assign-role') !== true) {
            res.sendStatus(403)
            return
        }

        const { userId, role } = req.body

        if (!stringObjectId.required().isValidSync(userId) || !string().strict(true).required().isValidSync(role)) {
            res.sendStatus(400)
            return
        }

        if ((await roleRepository.getByNames([role])).length === 0) {
            res.sendStatus(400)
            return
        }

        const r = await userRepository.updateRole(userId!, role)
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

users.get('/user', authenticate, async (req, res) => {
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

        res.json(await userRepository.get(userId))
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/user', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { user } = req.body

        if (!stringObjectId.isValidSync(userId) || !userUpdateSchema.isValidSync(user)) {
            res.sendStatus(400)
            return
        }

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

users.patch('/user/email', authenticate, async (req, res) => {
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

users.patch('/user/phoneNumber', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
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

users.patch('/user/username', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
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

users.patch('/user/password', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
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

users.delete('/user', authenticate, async (req, res) => {
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

export { users }
