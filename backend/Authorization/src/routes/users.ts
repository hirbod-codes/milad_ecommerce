import { Router } from "express"
import { roleRepository } from "src"
import { likeObjectId, stringObjectId } from "src/DB/Models/common_schemas"
import { roleInputSchema } from "src/DB/Models/Role"
import { authenticate } from "src/middlewares/authenticate"
import { authorize } from "src/middlewares/authorize"
import { array, string } from "yup"

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
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/user/email', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
            res.sendStatus(403)
            return
        }
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
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { users }
