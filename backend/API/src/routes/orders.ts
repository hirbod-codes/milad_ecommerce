import { Router } from "express";
import { orderRepository } from "../";
import { orderInputSchema } from "src/DB/Models/Order";
import { authenticate } from "src/middlewares/authenticate";
import { authorize } from "src/middlewares/authorize";

const orders = Router()

orders.post('/create', authenticate, async (req, res) => {
    if (await authorize(req, 'create-order') !== true) {
        res.sendStatus(403)
        return
    }

    const { order } = req.body

    if (!orderInputSchema.isValidSync(order)) {
        res.sendStatus(400)
        return
    }

    const r = await orderRepository.create(orderInputSchema.cast(order), { IRR: 0 })

    if (r === false || r.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(201).json({ id: r.insertedId })
})

export { orders }
