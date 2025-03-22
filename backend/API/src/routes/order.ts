import { Router } from "express";
import { orderRepository, productRepository } from "..";
import { Order, orderImmutableSchema, orderInputSchema, orderSchema, orderUpdateSchema, readableFields } from "@/src/DB/Models/Order";
import { authenticate } from "@/src/middlewares/authenticate";
import { authorize } from "@/src/middlewares/authorize";
import { FilterManagement } from "@/src/DB/FilterManagement";
import { array, number, object, string } from "yup";
import { stringObjectId } from "@/src/DB/Models/common_schemas";
import Jwt from "jsonwebtoken";

const order = Router()

order.post('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'create-order-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        let order = req.body

        if (!orderInputSchema.isValidSync(order)) {
            res.sendStatus(400)
            return
        }

        order.userId = userId
        order = orderInputSchema.cast(order)

        let cost: number | false = await productRepository.sumPriceOfAvailable(order.products, 'IRR')
        if (cost === false) {
            res.sendStatus(400)
            return
        }

        const r = await orderRepository.create(order, { IRR: cost })
        if (r === false || r.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(201).json({ id: r.insertedId })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

order.get('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'get-order-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const { filter: filterJson, sort: sortJson, limit: limitStr, skip: skipStr } = req.query

        if (!filterJson || !sortJson || !limitStr || !skipStr) {
            res.sendStatus(400)
            return
        }

        if (!number().required().positive().integer().isValidSync(limitStr) || !number().required().positive().integer().isValidSync(skipStr)) {
            res.sendStatus(400)
            return
        }

        let limit = number().required().positive().integer().cast(limitStr)
        let skip = number().required().positive().integer().cast(skipStr)

        let filter: any = JSON.parse(filterJson.toString())
        let sort = JSON.parse(sortJson.toString())

        const sortSchema = array().optional().strict(true).of(
            object().required().noUnknown(true).strict(true).shape({
                field: string().strict(true).required().oneOf(readableFields),
                direction: string().strict(true).required().oneOf(['asc', 'desc', 'ascending', 'descending'])
            })
        )
        if (!sortSchema.isValidSync(sort)) {
            res.sendStatus(400)
            return
        }

        const filterSchema = array().optional().strict(true).of(object().required().strict(true))

        if (!filterSchema.isValidSync(filter)) {
            res.sendStatus(400)
            return
        }

        if (filter === undefined || FilterManagement.validateFilters<Order>(filter, orderSchema, readableFields) !== true) {
            if (req.headers.accept?.includes('plain/text') ?? false)
                res.status(400).send('invalid filter provided')
            else
                res.status(400).json({ message: 'invalid filter provided' })

            return
        }

        const orders = await orderRepository.get(filter, sortSchema.cast(sort) as any, limit, skip, userId)
        if (orders === false)
            res.sendStatus(500)
        else
            res.status(200).json(orders)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

order.patch('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-order-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const order = req.body

        if (!orderUpdateSchema.isValidSync(order)) {
            res.sendStatus(400)
            return
        }

        const result = await orderRepository.update(userId, orderUpdateSchema.cast(order))

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

order.patch('/immutables', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-immutables-order-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const order = req.body

        if (!orderImmutableSchema.isValidSync(order)) {
            res.sendStatus(400)
            return
        }

        const result = await orderRepository.updateImmutables(userId, orderImmutableSchema.cast(order))

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

order.delete('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-order-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const result = await orderRepository.delete(userId)
        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { order }
