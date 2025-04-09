import { Router } from "express";
import { Order, orderImmutableSchema, orderInputSchema, orderSchema, orderUpdateSchema, readableFields } from "@/src/DB/Models/Order";
import { authenticate } from "@/src/middlewares/authenticate";
import { authorize } from "@/src/middlewares/authorize";
import { FilterManagement } from "@/src/DB/FilterManagement";
import { array, number, object, string } from "yup";
import { stringObjectId } from "@/src/DB/Models/common_schemas";
import Jwt from "jsonwebtoken";
import { Filter, SortDirection } from "mongodb";
import { OrderRepository } from "../DB/Repositories/OrderRepository";
import { ProductRepository } from "../DB/Repositories/ProductRepository";

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
            res.status(400).json({ errors: ['invalid order'] })
            return
        }

        order = orderInputSchema.cast(order)

        const productRepository = await ProductRepository.getInstance()
        let cost: number | false = await productRepository.sumPriceOfAvailable(order.products, 'IRR')
        if (cost === false) {
            res.sendStatus(400)
            return
        }

        const orderRepository = await OrderRepository.getInstance()
        const r = await orderRepository.create(userId, order, { IRR: cost })
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

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const { filter: filterJson, sort: sortJson, limit: limitStr, skip: skipStr } = req.query

        if (!stringObjectId.optional().isValidSync(userId)) {
            res.status(400).json({ errors: ['invalid userId'] })
            return
        }

        if (!number().optional().min(0).integer().isValidSync(limitStr)) {
            res.status(400).json({ errors: ['invalid limit'] })
            return
        }

        if (!number().optional().min(0).integer().isValidSync(skipStr)) {
            res.status(400).json({ errors: ['invalid skip'] })
            return
        }

        let limit = number().required().min(1).integer().cast(limitStr ?? 25)
        let skip = number().required().min(0).integer().cast(skipStr ?? 0)

        let sort: { field: keyof Order, direction: SortDirection }[] | undefined = undefined
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

        let filter: Filter<Order> | undefined = undefined
        if (filterJson) {
            filter = JSON.parse(filterJson.toString())

            const filterSchema = object().required().strict(true)

            if (!filterSchema.isValidSync(filter)) {
                res.status(400).json({ errors: ['invalid filter'] })
                return
            }

            if (filter === undefined || FilterManagement.validateFilters<Order>(filter, orderSchema, readableFields) !== true) {
                if (req.headers.accept?.includes('plain/text') ?? false)
                    res.status(400).send('invalid filter')
                else
                    res.status(400).json({ errors: ['invalid filter'] })

                return
            }
        }

        const orderRepository = await OrderRepository.getInstance()
        const orders = await orderRepository.get(limit, skip, filter, sort, userId)
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

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const { orderId, order } = req.body

        if (!stringObjectId.required().isValidSync(orderId) || !orderUpdateSchema.isValidSync(order)) {
            res.sendStatus(400)
            return
        }

        const orderRepository = await OrderRepository.getInstance()
        const result = await orderRepository.updateForUser(userId, orderId, orderUpdateSchema.cast(order))

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

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const { orderId, order } = req.body

        if (!stringObjectId.required().isValidSync(orderId) || !orderImmutableSchema.isValidSync(order)) {
            res.sendStatus(400)
            return
        }

        const orderRepository = await OrderRepository.getInstance()
        const result = await orderRepository.updateImmutablesForUser(userId, orderId, orderImmutableSchema.cast(order))

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

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const { orderId } = req.body

        if (!stringObjectId.required().isValidSync(orderId)) {
            res.sendStatus(400)
            return
        }

        const orderRepository = await OrderRepository.getInstance()
        const result = await orderRepository.deleteForUser(userId, orderId)
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
