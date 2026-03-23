import { Router } from "express";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { AppDataSource } from "../DataSource";
import Note from "../entities/Note";
import Label from "../entities/Label";
import multer from "multer";
import NotePassword from "../entities/NotePassword";
import TableNote from "../entities/TableNote";
import TableNoteColumn from "../entities/TableNoteColumn";
import TableNoteCell from "../entities/TableNoteCell";
import fs from "fs/promises";
import path from "path";
import { authMiddleware } from "../middleware/AuthMiddleware";

const upload = multer({ dest: "uploads/" });
const router = Router();

type CsvRecord = Record<string, string>;

const toDateOrNull = (value: string | undefined | null): Date | null => {
    if (!value) return null;

    const d = new Date(Number(value));
    return isNaN(d.getTime()) ? null : d;
};

router.post("/",authMiddleware, upload.single("file"), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        const zip = new AdmZip(req.file.path);
        const zipEntries = zip.getEntries();

        const noteRepo = AppDataSource.getRepository(Note);
        const labelRepo = AppDataSource.getRepository(Label);
        const notepasswordRepo = AppDataSource.getRepository(NotePassword);
        const tablenoteRepo = AppDataSource.getRepository(TableNote);
        const tablenotecolumnRepo = AppDataSource.getRepository(TableNoteColumn);
        const tablenotecellRepo = AppDataSource.getRepository(TableNoteCell);

        for (const entry of zipEntries) {
            if (entry.entryName === "labels.csv") {
                const csvStr = zip.readAsText(entry);
                const records = parse<CsvRecord>(csvStr, { columns: true });
                const parsed = records.map((row) => ({
                    ...row,
                    createdate: toDateOrNull(row.createdate),
                }));

                await labelRepo.save(parsed);
            }

            if (entry.entryName === "notes.csv") {
                const csvStr = zip.readAsText(entry);
                const records = parse<CsvRecord>(csvStr, { columns: true });

                const parsed = records.map((row) => ({
                    ...row,
                    title: row.title || "",
                    content: row.content || "",
                    label_id: row.label_id === "" ? null : row.label_id,
                    is_deleted: row["is_deleted"] === "" ? false : row["is_deleted"] === "true",
                    is_locked: row["is_locked"] === "" ? false : row["is_locked"] === "true",
                    is_pinned: row["is_pinned"] === "" ? false : row["is_pinned"] === "true",
                    deletedate: toDateOrNull(row.deletedate),
                    createdate: toDateOrNull(row.createdate),
                    updatedate: toDateOrNull(row.updatedate),
                }));

                await noteRepo.save(parsed);
            }

            if (entry.entryName === "notepassword.csv") {
                const csvStr = zip.readAsText(entry);
                const records = parse<CsvRecord>(csvStr, { columns: true });

                await notepasswordRepo.save(records);
            }

            if (entry.entryName === "tablenotes.csv") {
                const csvStr = zip.readAsText(entry);
                const records = parse<CsvRecord>(csvStr, { columns: true });

                const parsed = records.map((row) => ({
                    ...row,
                    title: row.title || "",
                    content: row.content || "",
                    label_id: row.label_id === "" ? null : row.label_id,
                    is_deleted: row["is_deleted"] === "" ? false : row["is_deleted"] === "true",
                    is_locked: row["is_locked"] === "" ? false : row["is_locked"] === "true",
                    is_pinned: row["is_pinned"] === "" ? false : row["is_pinned"] === "true",
                    deletedate: toDateOrNull(row.deletedate),
                    createdate: toDateOrNull(row.createdate),
                    updatedate: toDateOrNull(row.updatedate),
                }));

                await tablenoteRepo.save(parsed);
            }

            if (entry.entryName === "tablenotecolumns.csv") {
                const csvStr = zip.readAsText(entry);
                const records = parse<CsvRecord>(csvStr, { columns: true });

                await tablenotecolumnRepo.save(records);
            }

            if (entry.entryName === "tablenotecells.csv") {
                const csvStr = zip.readAsText(entry);
                const records = parse<CsvRecord>(csvStr, { columns: true });

                await tablenotecellRepo.save(records);
            }
        }

        await fs.unlink(filePath);
        res.status(200).json({ message: "Import completed" });
    } catch (error) {
        console.error(error);
        try { await fs.unlink(filePath); } catch { }
        return res.status(500).json({ message: "Import failed" });
    }
});

export default router;
