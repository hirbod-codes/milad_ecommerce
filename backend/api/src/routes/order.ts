import { Router } from "express";
import { forbiddenFieldsToFilter, Order, orderImmutableSchema, orderInputSchema, orderSchema, orderUpdateSchema, readableFields } from "@/DB/Models/Order";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { FilterManagement } from "@/DB/FilterManagement";
import { array, number, object, string } from "yup";
import Jwt from "jsonwebtoken";
import { Filter, SortDirection } from "mongodb";
import { OrderRepository } from "../DB/Repositories/OrderRepository";
import { ProductRepository } from "../DB/Repositories/Products/ProductRepository";
import { DateTime } from "luxon";
import { ProductSaleRepository } from "../DB/Repositories/Products/ProductSaleRepository";
import { MongoDB, stringObjectId } from "@monorepo/mongodb";

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

        const productRepository = new ProductRepository()
        let cost: number | false = await productRepository.sumPriceOfAvailable(order.products, 'IRR')
        if (cost === false) {
            res.sendStatus(400)
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

// add order record to productSale collection
order.patch('/payed', authenticate, async (req, res) => {
    try {
        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        const { orderId }: { orderId: string } = req.body

        let order: Order = undefined!

        // payment logic

        const mongodb = MongoDB.getDbInstance()
        const orderRepository = new OrderRepository()
        const productSaleRepository = new ProductSaleRepository()

        if (!stringObjectId.required().isValidSync(orderId)) {
            res.sendStatus(400)
            return
        }

        let o = await orderRepository.getById(orderId)
        if (!o) {
            res.sendStatus(404)
            return
        }
        order = o

        try {
            const session = await mongodb.startTransaction()
            if (session === undefined)
                throw new Error('Transaction session initialization failed!')

            orderRepository.setTransactionSession(session)
            productSaleRepository.setTransactionSession(session)

            const r = await orderRepository.payed(o._id)
            if (r === false || !r.acknowledged) {
                res.sendStatus(500)
                await mongodb.abortTransaction()
                return
            }

            res.sendStatus(200)
        } catch (e) {
            console.error(e)
            res.sendStatus(500)
            await mongodb.abortTransaction()
            return
        }

        try {
            // add to ProductSale collection
            const creations = await Promise.all(order.products.map(async ({ productId, quantity }) => {
                return productSaleRepository.create({ metadata: { productId, quantity, userId } }, DateTime.utc().toUnixInteger());
            }))
            for (const c of creations)
                if (c === false || !c.acknowledged)
                    throw new Error('')

            await mongodb.commitTransaction()
        } catch (e) {
            console.error(e)
            await mongodb.abortTransaction()
        }
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

        const orderRepository = new OrderRepository()
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

        const orderRepository = new OrderRepository()
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

        const orderRepository = new OrderRepository()
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
