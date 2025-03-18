import { Router } from "express";
import { productRepository } from "../";
import { FilterManagement } from "../DB/FilterManagement";
import { Product, productImmutableSchema, productInputSchema, productSchema, productUpdateSchema, readableFields } from "../DB/Models/Product";
import { array, number, object, string, } from "yup";
import { stringObjectId } from "src/DB/Models/common_schemas";
import { authenticate } from "src/middlewares/authenticate";
import { authorize } from "src/middlewares/authorize";

const products = Router()

products.post('/', authenticate, async (req, res) => {
    if (await authorize(req, 'create-product') !== true) {
        res.sendStatus(403)
        return
    }

    const { product } = req.body

    if (!productInputSchema.isValidSync(product)) {
        res.sendStatus(400)
        return
    }

    const r = await productRepository.create(productInputSchema.cast(product))

    if (r === false || r.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(201).json({ id: r.insertedId })
})

products.get('/', async (req, res) => {
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

    if (filter === undefined || FilterManagement.validateFilters<Product>(filter, productSchema, readableFields) !== true) {
        if (req.headers.accept?.includes('plain/text') ?? false)
            res.status(400).send('invalid filter provided')
        else
            res.status(400).json({ message: 'invalid filter provided' })

        return
    }

    const products = await productRepository.get(filter, sortSchema.cast(sort) as any, limit, skip)
    if (products === false)
        res.sendStatus(500)
    else
        res.status(200).json()
})

products.patch('/', authenticate, async (req, res) => {
    if (await authorize(req, 'update-product') !== true) {
        res.sendStatus(403)
        return
    }

    const { product, id } = req.body

    if (!stringObjectId.required().isValidSync(id) || !productUpdateSchema.isValidSync(product)) {
        res.sendStatus(400)
        return
    }

    const result = await productRepository.update(id, productUpdateSchema.cast(product))

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(200).json({ result })
})

products.patch('/immutables', authenticate, async (req, res) => {
    if (await authorize(req, 'update-immutables-product') !== true) {
        res.sendStatus(403)
        return
    }

    const { product, id } = req.body

    if (!stringObjectId.required().isValidSync(id) || !productImmutableSchema.isValidSync(product)) {
        res.sendStatus(400)
        return
    }

    const result = await productRepository.updateImmutables(id, productImmutableSchema.cast(product))

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(20).json({ result })
})

products.delete('/', authenticate, async (req, res) => {
    if (await authorize(req, 'delete-product') !== true) {
        res.sendStatus(403)
        return
    }

    const { id } = req.body

    if (!stringObjectId.required().isValidSync(id)) {
        res.sendStatus(400)
        return
    }

    const result = await productRepository.delete(id)

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(201).json({ result })
})

export { products }
