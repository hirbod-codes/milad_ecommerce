import { Router } from "express"
import { privilegeRepository, roleRepository } from "@/src"
import { stringObjectId } from "@/src/DB/Models/common_schemas"
import { privilegeInputSchema } from "@/src/DB/Models/Privilege"
import { authenticate } from "@/src/middlewares/authenticate"
import { authorize } from "@/src/middlewares/authorize"
import { AuthManager } from "../AuthManager"
import { string, ValidationError } from "yup"
import Jwt from "jsonwebtoken";

const privileges = Router()

privileges.get('/all', async (req, res) => {
    try {
        res.json(AuthManager.PRIVILEGE_NAMES)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

privileges.get('/', authenticate, async (req, res) => {
    try {
        const payload = Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!, { json: true })
        const role = payload?.role
        const userId = payload?.sub
        if (!stringObjectId.required().isValidSync(userId) || !string().required().strict(true).isValidSync(role)) {
            res.sendStatus(403)
            return
        }

        const roles = await roleRepository.getRolesWithPrivileges(role)
        if (roles === false || roles.length !== 1)
            throw new Error('system failed get roles')

        res.json(roles[0].privileges.map(p => p.name))
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

privileges.post('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'create-privilege') !== true) {
            res.sendStatus(403)
            return
        }

        const privilegeInput = req.body

        if (!privilegeInputSchema.isValidSync(privilegeInput)) {
            try { privilegeInputSchema.validateSync(privilegeInput) }
            catch (e) { console.error((e as ValidationError)) }

            res.sendStatus(400)
            return
        }

        let r = await privilegeRepository.create(privilegeInputSchema.cast(privilegeInput))
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
