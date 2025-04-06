import { Router } from "express";
import { FilterManagement } from "@/src/DB/FilterManagement";
import { Product, productImmutableSchema, productInputSchema, productSchema, productUpdateSchema, readableFields } from "@/src/DB/Models/Product";
import { array, number, object, string, } from "yup";
import { stringObjectId } from "@/src/DB/Models/common_schemas";
import { authenticate } from "@/src/middlewares/authenticate";
import { authorize } from "@/src/middlewares/authorize";
import archiver from "archiver";
import busboy from "busboy";
import { Filter, SortDirection } from "mongodb";
import { ProductRepository } from "../DB/Repositories/ProductRepository";
import { ProductPictureRepository } from "../DB/Repositories/ProductPictureRepository";

const products = Router()

products.post('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'create-product') !== true) {
            res.sendStatus(403)
            return
        }

        const product = req.body

        if (!productInputSchema.isValidSync(product)) {
            res.sendStatus(400)
            return
        }

        const productRepository = await ProductRepository.getInstance()
        const r = await productRepository.create(productInputSchema.cast(product))

        if (r === false || r.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(201).json({ id: r.insertedId })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.get('/ids', async (req, res) => {
    try {
        const { ids: idsStr } = req.query

        if (!string().required().strict(true).isValidSync(idsStr)) {
            res.sendStatus(400)
            return
        }

        const ids = idsStr.split(',')
        if (!array().required().min(1).strict(true).of(stringObjectId.required()).isValidSync(ids)) {
            res.sendStatus(400)
            return
        }

        const productRepository = await ProductRepository.getInstance()
        const r = await productRepository.getByIds(ids)
        if (!r)
            res.sendStatus(404)
        else
            res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.get('/search', async (req, res) => {
    try {
        const { search } = req.query

        if (!string().required().isValidSync(search)) {
            res.status(400).json({ errors: ['invalid limit'] })
            return
        }

        const productRepository = await ProductRepository.getInstance()
        const products = await productRepository.search(search)
        console.log('products', products)
        if (products === false)
            res.sendStatus(500)
        else
            res.status(200).json(products)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.get('/', async (req, res) => {
    try {
        const { filter: filterJson, sort: sortJson, limit: limitStr, skip: skipStr } = req.query

        if (!number().optional().min(0).integer().isValidSync(limitStr)) {
            res.status(400).json({ errors: ['invalid limit'] })
            return
        }

        if (!number().optional().min(0).integer().isValidSync(skipStr)) {
            res.status(400).json({ errors: ['invalid skip'] })
            return
        }

        let limit = number().required().min(0).integer().cast(limitStr ?? 25)
        let skip = number().required().min(0).integer().cast(skipStr ?? 0)

        let sort: { field: keyof Product, direction: SortDirection }[] = []
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

        let filter: Filter<Product> = {}
        if (filterJson) {
            filter = JSON.parse(filterJson.toString())

            const filterSchema = object().required().strict(true)

            if (!filterSchema.isValidSync(filter)) {
                res.status(400).json({ errors: ['invalid filter'] })
                return
            }

            if (filter === undefined || FilterManagement.validateFilters<Product>(filter, productSchema, readableFields) !== true) {
                if (req.headers.accept?.includes('plain/text') ?? false)
                    res.status(400).send('invalid filter')
                else
                    res.status(400).json({ errors: ['invalid filter'] })

                return
            }
        }

        const productRepository = await ProductRepository.getInstance()
        const products = await productRepository.get(filter, sort, limit, skip)
        if (products === false)
            res.sendStatus(500)
        else
            res.status(200).json(products)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.get('/picture/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params

        if (!fileId) {
            res.sendStatus(400)
            return
        }

        if (!stringObjectId.required().isValidSync(fileId)) {
            res.sendStatus(400)
            return
        }
        const productPictureRepository = await ProductPictureRepository.getInstance()
        const file = await productPictureRepository.getFile(fileId)
        if (file === undefined) {
            res.sendStatus(404)
            return
        }

        const readstream = productPictureRepository.getReadStream(file._id);
        console.log('readstream', readstream)

        readstream.pipe(res)

        readstream.on('error', e => {
            console.error(e)
            res.sendStatus(500)
        })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.get('/pictures/:productIds', async (req, res) => {
    try {
        const { productIds: idsStr } = req.params

        if (!idsStr) {
            res.sendStatus(400)
            return
        }

        const ids = idsStr.split(",");

        if (!array().required().min(1).strict(true).of(stringObjectId.required()).isValidSync(ids)) {
            res.sendStatus(400)
            return
        }

        const productPictureRepository = await ProductPictureRepository.getInstance()
        const files = await productPictureRepository.getFilesByProductId(ids)

        res.json(files)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.post('/pictures/:productId', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-product') !== true) {
            res.sendStatus(403)
            return
        }

        const { productId } = req.params
        if (!stringObjectId.required().isValidSync(productId)) {
            res.sendStatus(403)
            return
        }

        const files: {
            filename: string,
            mimeType: string,
            size: number,
            buffer: Buffer,
        }[] = [];
        const maxFiles = 50; // Maximum number of files allowed
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ["image/jpeg", "image/png", "application/jpg"];

        const bb = busboy({ limits: { fileSize: maxFileSize, parts: maxFiles }, headers: req.headers });

        bb.on("file", (name, stream, { filename, mimeType, encoding }) => {
            if (files.length > maxFiles) {
                stream.resume(); // Discard the file if the maximum number of files is reached
                return;
            }

            const chunks: Uint8Array[] = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });

            stream.on("end", () => {
                const buffer = Buffer.concat(chunks);
                const fileData = {
                    filename,
                    mimeType,
                    size: buffer.length,
                    buffer,
                };

                // Validate the file
                if (fileData.size > maxFileSize)
                    return res.status(400).json({ message: `File size exceeds valid range` })

                if (!allowedTypes.includes(fileData.mimeType))
                    return res.status(400).json({ message: `Invalid file extension` })

                files.push(fileData);
            });
        })

        bb.on("finish", () => {
            if (files.length === 0)
                return res.status(400).json({ message: "No files uploaded" });

            const uploadedFiles: { filename: string, id: string }[] = [];

            console.log('files', files)
            files.forEach(async (file) => {
                const productPictureRepository = await ProductPictureRepository.getInstance()
                const writeStream = productPictureRepository.getWriteStream(file.filename, productId, file.mimeType)

                writeStream.on("finish", () => {
                    uploadedFiles.push({ filename: file.filename, id: writeStream.id.toString() });

                    if (uploadedFiles.length === files.length) {
                        res.status(201).json(uploadedFiles);
                    }
                });

                writeStream.on("error", (err) => {
                    console.error("File upload failed:", err);
                    res.status(500).json({ message: "File upload failed", error: err.message });
                });

                writeStream.write(file.buffer)
                writeStream.end()
            });
        });

        req.pipe(bb);
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.delete('/picture', async (req, res) => {
    try {
        const { fileId } = req.body

        if (!fileId) {
            res.sendStatus(400)
            return
        }

        if (!stringObjectId.required().isValidSync(fileId)) {
            res.sendStatus(400)
            return
        }

        const productPictureRepository = await ProductPictureRepository.getInstance()
        const file = await productPictureRepository.deleteFile(fileId)
        if (file === false) {
            res.sendStatus(404)
            return
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.patch('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-product') !== true) {
            res.sendStatus(403)
            return
        }

        const { product, id } = req.body

        if (!stringObjectId.required().isValidSync(id)) {
            res.sendStatus(400)
            return
        }

        if (!productUpdateSchema.required().isValidSync(product)) {
            res.sendStatus(400)
            return
        }

        const productRepository = await ProductRepository.getInstance()
        const result = await productRepository.update(id, productUpdateSchema.cast(product))

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.patch('/immutables', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-immutables-product') !== true) {
            res.sendStatus(403)
            return
        }

        const { product, id } = req.body

        if (!stringObjectId.required().isValidSync(id) || !productImmutableSchema.isValidSync(product)) {
            res.sendStatus(400)
            return
        }

        const productRepository = await ProductRepository.getInstance()
        const result = await productRepository.updateImmutables(id, productImmutableSchema.cast(product))

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

products.delete('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-product') !== true) {
            res.sendStatus(403)
            return
        }

        const { id } = req.body

        if (!stringObjectId.required().isValidSync(id)) {
            res.sendStatus(400)
            return
        }

        const productRepository = await ProductRepository.getInstance()
        const result = await productRepository.delete(id)

        if (result === false || result.acknowledged !== true)
            res.sendStatus(500)
        else
            res.status(200).json({ result })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { products }
