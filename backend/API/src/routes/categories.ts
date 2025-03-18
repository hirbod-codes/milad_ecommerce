import { Router } from "express";
import { categoryRepository } from "src";
import { categoryImmutableSchema, categoryInputSchema, categoryUpdateSchema } from "src/DB/Models/Category";
import { stringObjectId } from "src/DB/Models/common_schemas";
import { authenticate } from "src/middlewares/authenticate";
import { authorize } from "src/middlewares/authorize";

const categories = Router()

categories.post('/', authenticate, async (req, res) => {
    if (await authorize(req, 'create-category') !== true) {
        res.sendStatus(403)
        return
    }

    const { category } = req.body

    if (!categoryInputSchema.isValidSync(category)) {
        res.sendStatus(400)
        return
    }

    const r = await categoryRepository.create(categoryInputSchema.cast(category))

    if (r === false || r.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(201).json({ id: r.insertedId })
})

categories.get('/', async (req, res) => {
    if (await authorize(req, 'get-category') !== true) {
        res.sendStatus(403)
        return
    }

    const result = await categoryRepository.get()
    if (result === false)
        res.sendStatus(500)
    else
        res.status(200).json(result)
})

categories.patch('/', authenticate, async (req, res) => {
    if (await authorize(req, 'update-category') !== true) {
        res.sendStatus(403)
        return
    }

    const { category, id } = req.body

    if (!stringObjectId.required().isValidSync(id) || !categoryUpdateSchema.isValidSync(category)) {
        res.sendStatus(400)
        return
    }

    const result = await categoryRepository.update(id, categoryUpdateSchema.cast(category))

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(200).json({ result })
})

categories.patch('/immutables', authenticate, async (req, res) => {
    if (await authorize(req, 'update-immutables-category') !== true) {
        res.sendStatus(403)
        return
    }

    const { category, id } = req.body

    if (!stringObjectId.required().isValidSync(id) || !categoryImmutableSchema.isValidSync(category)) {
        res.sendStatus(400)
        return
    }

    const result = await categoryRepository.updateImmutables(id, categoryImmutableSchema.cast(category))

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(20).json({ result })
})

categories.delete('/', authenticate, async (req, res) => {
    if (await authorize(req, 'delete-category') !== true) {
        res.sendStatus(403)
        return
    }

    const { id } = req.body

    if (!stringObjectId.required().isValidSync(id)) {
        res.sendStatus(400)
        return
    }

    const result = await categoryRepository.delete(id)

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(201).json({ result })
})

export { categories }
