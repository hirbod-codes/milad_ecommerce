import { Router } from "express"
import { privilegeRepository } from "src"
import { stringObjectId } from "src/DB/Models/common_schemas"
import { privilegeUpdateSchema } from "src/DB/Models/Privilege"
import { authenticate } from "src/middlewares/authenticate"
import { authorize } from "src/middlewares/authorize"

const privileges = Router()

privileges.post('/', authenticate, async (req, res) => {
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

privileges.delete('/', authenticate, async (req, res) => {
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


export { privileges }
