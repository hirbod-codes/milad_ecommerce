import { Router } from "express";
import { authentication, productRepository, roleRepository } from "../";
import { validateFilters } from "../DB/helpers";
import { productInputSchema, productSchema, readableFields } from "../DB/Models/Product";
import { array, number, object, string, } from "yup";
import Jwt from 'jsonwebtoken'

const products = Router()

products.post('/create', authentication, async (req, res) => {
    let userRole = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.payload?.role ?? ''
    console.log('userRole', userRole)
    if ((await roleRepository.getByPrivilegeName('create-product')).map(r => r.name).includes(userRole)) {
        res.sendStatus(403)
        return
    }

    const { product } = req.body

    if (!productInputSchema.isValidSync(product)) {
        res.sendStatus(400)
        return
    }

    const r = await productRepository.create(product)

    if (r === false || r.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(201).json({ id: r.insertedId })
})

products.get('/query', async (req, res) => {
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

    if (filter === undefined || validateFilters(filter, productSchema, readableFields) !== true) {
        if (req.headers.accept?.includes('plain/text') ?? false)
            res.status(400).send('invalid filter provided')
        else
            res.status(400).json({ message: 'invalid filter provided' })
        return
    }

    res.status(200).json(await productRepository.get(filter, sortSchema.cast(sort) as any, limit, skip))
})

export { products }
