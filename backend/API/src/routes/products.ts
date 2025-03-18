import { Router } from "express";
import { productPictureRepository, productRepository } from "../";
import { FilterManagement } from "../DB/FilterManagement";
import { Product, productImmutableSchema, productInputSchema, productSchema, productUpdateSchema, readableFields } from "../DB/Models/Product";
import { array, number, object, string, } from "yup";
import { stringObjectId } from "src/DB/Models/common_schemas";
import { authenticate } from "src/middlewares/authenticate";
import { authorize } from "src/middlewares/authorize";
import archiver from "archiver";
import busboy from "busboy";

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

products.get('/pictures/:ids', async (req, res) => {
    try {
        const { ids: idsStr } = req.params

        if (!idsStr) {
            res.sendStatus(400)
            return
        }

        const ids = idsStr.split(",");

        if (!array().required().min(1).strict(true).of(stringObjectId.required()).isValidSync(ids)) {
            res.sendStatus(400)
            return
        }

        // Create a ZIP archive
        const archive = archiver("zip", {
            zlib: { level: 9 }, // Compression level
        });

        // Set the response headers
        res.attachment("files.zip");
        archive.pipe(res);

        // Add each file to the archive
        const files = await productPictureRepository.getFilesByProductId(ids)
        files.forEach((file) => {
            const readstream = productPictureRepository.getReadStream(file._id);
            archive.append(readstream, { name: file.filename });
        });

        // Finalize the archive and send it
        archive.finalize();
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

        const bb = busboy({ limits: {}, headers: req.headers });
        const files: {
            filename: string,
            mimeType: string,
            size: number,
            buffer: Buffer,
        }[] = [];
        const maxFiles = 50; // Maximum number of files allowed
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ["image/jpeg", "image/png", "application/jpg"];

        bb.on("file", (name, stream, { filename, mimeType, encoding }) => {
            if (files.length >= maxFiles) {
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
        });

        bb.on("finish", () => {
            if (files.length === 0)
                return res.status(400).json({ message: "No files uploaded" });

            const uploadedFiles: { filename: string, id: string }[] = [];

            files.forEach((file) => {
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
