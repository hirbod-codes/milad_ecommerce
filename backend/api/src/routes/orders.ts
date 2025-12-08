import { Router } from "express";
import { forbiddenFieldsToFilter, Order, orderImmutableSchema, orderInputSchema, orderSchema, readableFields } from "@/src/DB/Models/Order";
import { authenticate } from "@/src/middlewares/authenticate";
import { authorize } from "@/src/middlewares/authorize";
import { FilterManagement } from "@/src/DB/FilterManagement";
import { array, number, object, string } from "yup";
import { Filter, SortDirection } from "mongodb";
import { ProductRepository } from "../DB/Repositories/Products/ProductRepository";
import { OrderRepository } from "../DB/Repositories/OrderRepository";
import { stringObjectId } from "@monorepo/mongodb";

const orders = Router()

orders.post('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'create-order') !== true) {
            res.sendStatus(403)
            return
        }

        let { userId, order } = req.body

        if (!stringObjectId.required().isValidSync(userId)) {
            res.status(400).json({ errors: ['invalid userId'] })
            return
        }

        if (!orderInputSchema.isValidSync(order)) {
            res.status(400).json({ errors: ['invalid order'] })
            return
        }

        order = orderInputSchema.cast(order)

        const productRepository = new ProductRepository()
        let cost: number | false = await productRepository.sumPriceOfAvailable(order.products, 'IRR')
        if (cost === false) {
            res.status(400).json({ errors: ['invalid product list'] })
            return
        }

        const orderRepository = new OrderRepository()
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

orders.get('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'get-order') !== true) {
            res.sendStatus(403)
            return
        }

        const { userId, filter: filterJson, sort: sortJson, limit: limitStr, skip: skipStr } = req.query

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

            if (filter === undefined || FilterManagement.validateFilters<Order>(filter, orderSchema, undefined, forbiddenFieldsToFilter) !== true) {
                if (req.headers.accept?.includes('plain/text') ?? false)
                    res.status(400).send('invalid filter')
                else
                    res.status(400).json({ errors: ['invalid filter'] })

                return
            }
        }

        const orderRepository = new OrderRepository()
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

orders.patch('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-order') !== true) {
            res.sendStatus(403)
            return
        }

        const { orderId, order } = req.body

        if (!stringObjectId.required().isValidSync(orderId) || !orderImmutableSchema.isValidSync(order)) {
            res.sendStatus(400)
            return
        }

        const orderRepository = new OrderRepository()
        const result = await orderRepository.update(orderId, orderImmutableSchema.cast(order))

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

orders.patch('/immutables', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-immutables-order') !== true) {
            res.sendStatus(403)
            return
        }

        const { orderId, order } = req.body

        if (!stringObjectId.required().isValidSync(orderId) || !orderImmutableSchema.isValidSync(order)) {
            res.sendStatus(400)
            return
        }

        const orderRepository = new OrderRepository()
        const result = await orderRepository.updateImmutables(orderId, orderImmutableSchema.cast(order))

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

orders.delete('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-order') !== true) {
            res.sendStatus(403)
            return
        }

        const { orderId } = req.body

        if (!stringObjectId.required().isValidSync(orderId)) {
            res.sendStatus(400)
            return
        }

        const orderRepository = new OrderRepository()
        const result = await orderRepository.delete(orderId)

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { orders }
