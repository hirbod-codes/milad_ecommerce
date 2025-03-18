import { Router } from "express";
import { tagRepository } from "src";
import { tagImmutableSchema, tagInputSchema, tagUpdateSchema } from "src/DB/Models/Tag";
import { stringObjectId } from "src/DB/Models/common_schemas";
import { authenticate } from "src/middlewares/authenticate";
import { authorize } from "src/middlewares/authorize";

const tags = Router()

tags.post('/', authenticate, async (req, res) => {
    if (await authorize(req, 'create-tag') !== true) {
        res.sendStatus(403)
        return
    }

    const { tag } = req.body

    if (!tagInputSchema.isValidSync(tag)) {
        res.sendStatus(400)
        return
    }

    const r = await tagRepository.create(tagInputSchema.cast(tag))

    if (r === false || r.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(201).json({ id: r.insertedId })
})

tags.get('/', async (req, res) => {
    if (await authorize(req, 'get-tag') !== true) {
        res.sendStatus(403)
        return
    }

    const result = await tagRepository.get()
    if (result === false)
        res.sendStatus(500)
    else
        res.status(200).json(result)
})

tags.patch('/', authenticate, async (req, res) => {
    if (await authorize(req, 'update-tag') !== true) {
        res.sendStatus(403)
        return
    }

    const { tag, id } = req.body

    if (!stringObjectId.required().isValidSync(id) || !tagUpdateSchema.isValidSync(tag)) {
        res.sendStatus(400)
        return
    }

    const result = await tagRepository.update(id, tagUpdateSchema.cast(tag))

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(200).json({ result })
})

tags.patch('/immutables', authenticate, async (req, res) => {
    if (await authorize(req, 'update-immutables-tag') !== true) {
        res.sendStatus(403)
        return
    }

    const { tag, id } = req.body

    if (!stringObjectId.required().isValidSync(id) || !tagImmutableSchema.isValidSync(tag)) {
        res.sendStatus(400)
        return
    }

    const result = await tagRepository.updateImmutables(id, tagImmutableSchema.cast(tag))

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(20).json({ result })
})

tags.delete('/', authenticate, async (req, res) => {
    if (await authorize(req, 'delete-tag') !== true) {
        res.sendStatus(403)
        return
    }

    const { id } = req.body

    if (!stringObjectId.required().isValidSync(id)) {
        res.sendStatus(400)
        return
    }

    const result = await tagRepository.delete(id)

    if (result === false || result.acknowledged !== true)
        res.sendStatus(500)
    else
        res.status(201).json({ result })
})

export { tags }
