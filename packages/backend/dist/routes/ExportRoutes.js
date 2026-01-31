import { Router } from "express";
import { AppDataSource } from "../DataSource.js";
import Note from "../entities/Note.js";
import Label from "../entities/Label.js";
import archiver from "archiver";
import { stringify } from "csv-stringify/sync";
import NotePassword from "../entities/NotePassword.js";
import TableNote from "../entities/TableNote.js";
import TableNoteCell from "../entities/TableNoteCell.js";
import TableNoteColumn from "../entities/TableNoteColumn.js";
const router = Router();
router.get("/", async (req, res) => {
    try {
        const noteRepo = AppDataSource.getRepository(Note);
        const labelRepo = AppDataSource.getRepository(Label);
        const notepasswordRepo = AppDataSource.getRepository(NotePassword);
        const tablenoteRepo = AppDataSource.getRepository(TableNote);
        const tablenotecolumnRepo = AppDataSource.getRepository(TableNoteColumn);
        const tablenotecellRepo = AppDataSource.getRepository(TableNoteCell);
        // DB からデータ取得
        const notes = await noteRepo.find();
        const labels = await labelRepo.find();
        const notepassword = await notepasswordRepo.find();
        const tablenotes = await tablenoteRepo.find();
        const tablenotecolumns = await tablenotecolumnRepo.find();
        const tablenotecells = await tablenotecellRepo.find();
        // JSON → CSV
        const notesCsv = stringify(notes, { header: true, quoted: true });
        const labelsCsv = stringify(labels, { header: true, quoted: true });
        const notepasswordCsv = stringify(notepassword, { header: true, quoted: true });
        const tablenotesCsv = stringify(tablenotes, { header: true, quoted: true });
        const tablenotecolumnsCsv = stringify(tablenotecolumns, { header: true, quoted: true });
        const tablenotecellsCsv = stringify(tablenotecells, { header: true, quoted: true });
        // ZIP 生成
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=data.zip");
        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(res);
        // ZIP に CSV を追加
        archive.append(labelsCsv, { name: "labels.csv" });
        archive.append(notesCsv, { name: "notes.csv" });
        archive.append(notepasswordCsv, { name: "notepassword.csv" });
        archive.append(tablenotesCsv, { name: "tablenotes.csv" });
        archive.append(tablenotecolumnsCsv, { name: "tablenotecolumns.csv" });
        archive.append(tablenotecellsCsv, { name: "tablenotecells.csv" });
        await archive.finalize();
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Export failed" });
    }
});
export default router;
//# sourceMappingURL=ExportRoutes.js.map