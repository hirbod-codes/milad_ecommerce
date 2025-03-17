import { Router } from "express"
import { queueManagement, roleRepository, userRepository } from "src"
import { likeObjectId, stringObjectId } from "src/DB/Models/common_schemas"
import { roleInputSchema, roleUpdateSchema } from "src/DB/Models/Role"
import { authenticate } from "src/middlewares/authenticate"
import { authorize } from "src/middlewares/authorize"
import { array, string } from "yup"

const roles = Router()

roles.post('/', authenticate, async (req, res) => {
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

        await queueManagement.send('create')
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
        return
    }
})

roles.get('/', authenticate, async (req, res) => {
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

roles.patch('/', authenticate, async (req, res) => {
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
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)

        await queueManagement.send('update')
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

roles.delete('/', authenticate, async (req, res) => {
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

        await queueManagement.send('delete')
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

roles.patch('/assign', authenticate, async (req, res) => {
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

export { roles }
