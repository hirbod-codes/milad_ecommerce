import { Router } from "express";
import { categoryImmutableSchema, categoryInputSchema, categoryUpdateSchema } from "@/DB/Models/Category";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { number } from "yup";
import { CategoryRepository } from "../DB/Repositories/CategoryRepository";
import { stringObjectId } from "@monorepo/mongodb";

const categories = Router()

categories.post('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'create-category') !== true) {
            res.sendStatus(403)
            return
        }

        const category = req.body

        if (!categoryInputSchema.isValidSync(category)) {
            res.sendStatus(400)
            return
        }

        const categoryRepository = new CategoryRepository()
        const r = await categoryRepository.create(categoryInputSchema.cast(category))

        if (r === false || r.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(201).json({ id: r.insertedId })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

categories.get('/:id', async (req, res) => {
    try {
        const { id } = req.params

        if (!stringObjectId.required().isValidSync(id)) {
            res.sendStatus(400)
            return
        }

        const categoryRepository = new CategoryRepository()
        const category = await categoryRepository.getById(id)
        if (!category)
            res.sendStatus(404)
        else
            res.json(category)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

categories.get('/', async (req, res) => {
    try {
        const categoryRepository = new CategoryRepository()
        const result = await categoryRepository.get()
        if (result === false)
            res.sendStatus(500)
        else
            res.status(200).json(result)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

categories.patch('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-category') !== true) {
            res.sendStatus(403)
            return
        }

        const { id, addViews, recommendedProductProperties } = req.body

        let result
        if (addViews !== undefined) {
            if (!stringObjectId.required().isValidSync(id) || !number().strict(true).required().integer().positive().isValidSync(addViews)) {
                res.sendStatus(400)
                return
            }

            const categoryRepository = new CategoryRepository()
            result = await categoryRepository.addViews(id, addViews)

            if (result === false || result.acknowledged !== true)
                res.sendStatus(500)
        } else {
            if (!stringObjectId.required().isValidSync(id) || !categoryUpdateSchema.pick(['recommendedProductProperties']).required().strict(true).isValidSync({ recommendedProductProperties })) {
                res.sendStatus(400)
                return
            }

            const categoryRepository = new CategoryRepository()
            result = await categoryRepository.update(id, categoryUpdateSchema.pick(['recommendedProductProperties']).cast({ recommendedProductProperties }))

            if (result === false || result.acknowledged !== true)
                res.sendStatus(500)
        }

        res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

categories.patch('/immutables', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-immutables-category') !== true) {
            res.sendStatus(403)
            return
        }

        const { category, id } = req.body

        if (!stringObjectId.required().isValidSync(id) || !categoryImmutableSchema.isValidSync(category)) {
            res.sendStatus(400)
            return
        }

        const categoryRepository = new CategoryRepository()
        const result = await categoryRepository.updateImmutables(id, categoryImmutableSchema.cast(category))

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

categories.delete('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-category') !== true) {
            res.sendStatus(403)
            return
        }

        const { id } = req.body

        if (!stringObjectId.required().isValidSync(id)) {
            res.sendStatus(400)
            return
        }

        const categoryRepository = new CategoryRepository()
        const result = await categoryRepository.delete(id)

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { categories }
