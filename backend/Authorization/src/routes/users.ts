import { Router } from "express";
import { array, number, object, string } from "yup";
import { stringObjectId } from "../DB/Models/common_schemas";
import { UserRepository } from "../DB/Repositories/UserRepository";
import { readableFields, User, userSchema } from "../DB/Models/User";
import { Filter, SortDirection } from "mongodb";
import { FilterManagement } from "../DB/FilterManagement";

const users = Router()

users.get('/ids', async (req, res) => {
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
        const r = await userRepository.getByIds(ids)
        if (!r)
            res.sendStatus(404)
        else
            res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.get('/', async (req, res) => {
    try {
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

            if (filter === undefined || FilterManagement.validateFilters<User>(filter, userSchema, readableFields) !== true) {
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
            res.status(200).json(users)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { users }
