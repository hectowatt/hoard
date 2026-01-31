import { Router } from 'express';
import { AppDataSource } from '../DataSource.js';
import TableNoteCell from '../entities/TableNoteCell.js';
import TableNoteColumn from '../entities/TableNoteColumn.js';
import TableNote from '../entities/TableNote.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
const router = Router();
const generateRandomId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
// 【INSERT】テーブルノート登録API
router.post('/', authMiddleware, async (req, res) => {
    const { title, columns, rowCells, label_id, is_locked, is_pinned } = req.body;
    if (!columns || !rowCells) {
        return res.status(400).json({ error: "Must set tablenote columns, rows" });
    }
    try {
        let tableNoteAfterRegist = {
            id: "",
            title: "",
            label_id: "",
            is_locked: false,
            is_pinned: false,
            createdate: "",
            updatedate: "",
            columns: null,
            rowCells: null
        };
        let columnsAfterRegist = null;
        let rowCellsAfterRegist = null;
        await AppDataSource.transaction(async (transactionalEntityManager) => {
            var savedTableNote = null;
            // table_noteテーブルにデータを登録
            const tableNoteRepository = transactionalEntityManager.getRepository(TableNote);
            const newTableNote = tableNoteRepository.create({
                title: title,
                label_id: label_id || null, // ラベルがない場合はnullを設定
                is_locked: is_locked || false, // ロック状態を設定
                is_pinned: is_pinned,
                createdate: new Date(),
                updatedate: new Date()
            });
            savedTableNote = await tableNoteRepository.save(newTableNote);
            // columnの登録
            const columnRepository = transactionalEntityManager.getRepository(TableNoteColumn);
            const columnIdMap = {};
            for (const col of columns) {
                const newColumn = columnRepository.create({
                    name: col.name,
                    order: col.order ?? 0,
                    table_note_id: savedTableNote.id
                });
                const savedColumn = await columnRepository.save(newColumn);
                columnIdMap[col.id] = savedColumn.id; // カラム名とIDのマッピングを作成
            }
            columnsAfterRegist = await columnRepository.find({ where: { table_note_id: savedTableNote.id }, order: { order: 'ASC' } });
            // rowCellの登録
            const cellRepository = transactionalEntityManager.getRepository(TableNoteCell);
            for (let rowIdx = 0; rowIdx < rowCells.length; rowIdx++) {
                const row = rowCells[rowIdx];
                for (let colIndex = 0; colIndex < row.length; colIndex++) {
                    const cell = row[colIndex];
                    // クライアントのcolumnIdからDBのcolumnIdに変換
                    const dbColumnId = columnIdMap[cell.columnId];
                    const newCell = cellRepository.create({
                        row_index: cell.rowIndex,
                        value: cell.value,
                        table_note_id: savedTableNote.id,
                        column_id: dbColumnId,
                    });
                    await cellRepository.save(newCell);
                }
            }
            rowCellsAfterRegist = await cellRepository.find({ where: { table_note_id: savedTableNote.id }, order: { row_index: 'ASC', column: { order: "ASC" } } });
            // rowCellsをrow_indexごとにグループ化して2次元配列に変換
            const groupedRowCells = [];
            rowCellsAfterRegist.forEach(cell => {
                const rowIdx = cell.row_index;
                if (!groupedRowCells[rowIdx])
                    groupedRowCells[rowIdx] = [];
                groupedRowCells[rowIdx].push({
                    id: cell.id,
                    rowIndex: cell.row_index,
                    value: cell.value,
                    columnId: cell.column ? cell.column.id : undefined,
                    table_note_id: cell.table_note_id
                });
            });
            // レスポンス用データ整形
            tableNoteAfterRegist = {
                id: savedTableNote.id,
                title: savedTableNote.title,
                label_id: savedTableNote.label_id,
                is_locked: savedTableNote.is_locked,
                is_pinned: savedTableNote.is_pinned,
                createdate: savedTableNote.createdate.toISOString(),
                updatedate: savedTableNote.updatedate.toISOString(),
                columns: columnsAfterRegist,
                rowCells: groupedRowCells
            };
        });
        res.status(201).json({ message: "Save TableNote success!", tableNote: tableNoteAfterRegist });
    }
    catch (error) {
        console.error("Error saving TableNote:", error);
        return res.status(500).json({ error: "Failed to save TableNote" });
    }
});
// 【SELECT】テーブルノート取得API
router.get('/', authMiddleware, async (req, res) => {
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        const tableNotes = await tableNoteRepository.find({ where: { is_deleted: false }, order: { updatedate: 'DESC' } });
        if (tableNotes) {
            // 返却するテーブルノートの配列
            let tableNoteArray = [];
            // 各テーブルノートのカラムとセルを取得
            for (var i = 0; i < tableNotes.length; i++) {
                const tableNote = tableNotes[i];
                const columnRepository = AppDataSource.getRepository(TableNoteColumn);
                const cellRepository = AppDataSource.getRepository(TableNoteCell);
                const columns = await columnRepository.find({ where: { table_note_id: tableNote.id }, order: { order: 'ASC' } });
                const rowCells = await cellRepository.find({ where: { table_note_id: tableNote.id }, relations: ['column'], order: { row_index: 'ASC', column: { order: 'ASC' } } });
                // rowCellsをrow_indexごとにグループ化して2次元配列に変換
                const groupedRowCells = [];
                rowCells.forEach(cell => {
                    const rowIdx = cell.row_index;
                    if (!groupedRowCells[rowIdx])
                        groupedRowCells[rowIdx] = [];
                    groupedRowCells[rowIdx].push({
                        id: cell.id,
                        rowIndex: cell.row_index,
                        value: cell.value,
                        columnId: cell.column ? cell.column.id : undefined,
                        table_note_id: cell.table_note_id
                    });
                });
                tableNoteArray.push({
                    id: tableNote.id,
                    title: tableNote.title,
                    label_id: tableNote.label_id,
                    is_locked: tableNote.is_locked,
                    is_pinned: tableNote.is_pinned,
                    createdate: tableNote.createdate.toISOString(),
                    updatedate: tableNote.updatedate.toISOString(),
                    columns: tableNote.is_locked ? [{ id: generateRandomId(), name: "secret", order: 1, table_note_id: tableNote.id }] : columns.map(col => ({ id: col.id, name: col.name, order: col.order, table_note_id: col.table_note_id })),
                    rowCells: tableNote.is_locked ? [[{ id: generateRandomId(), rowIndex: 0, value: "secret", columnId: columns[0].id, table_note_id: tableNote.id }]] : groupedRowCells
                });
            }
            return res.status(200).json(tableNoteArray);
        }
        else {
            return res.status(200).json([]);
        }
    }
    catch (error) {
        console.error("Error fetching TableNote:", error);
        return res.status(500).json({ error: 'Failed to fetch TableNote' });
    }
});
// 【UPDATE】テーブルノート更新API
router.put('/', authMiddleware, async (req, res) => {
    const { id, title, columns, rowCells, label_id, is_locked, is_pinned } = req.body;
    if (!columns || !rowCells) {
        return res.status(400).json({ error: "Must set tablenote title, columns, rows" });
    }
    try {
        await AppDataSource.transaction(async (transactionalEntityManager) => {
            const tableNoteRepository = transactionalEntityManager.getRepository(TableNote);
            const columnRepository = transactionalEntityManager.getRepository(TableNoteColumn);
            const cellRepository = transactionalEntityManager.getRepository(TableNoteCell);
            const tableNote = await tableNoteRepository.findOneBy({ id: id });
            if (!tableNote) {
                return res.status(404).json({ error: "tablenote not found" });
            }
            // ノート情報更新
            tableNote.title = title;
            tableNote.label_id = label_id || null;
            tableNote.is_locked = is_locked || false;
            tableNote.is_pinned = is_pinned || false;
            tableNote.updatedate = new Date();
            await tableNoteRepository.save(tableNote);
            // --- カラムの更新 ---
            // 既存カラム取得
            const dbColumns = await columnRepository.find({ where: { table_note_id: tableNote.id }, order: { order: 'ASC' } });
            // 既存カラムIDセット
            const dbColumnIds = dbColumns.map(col => col.id);
            // 新カラムIDセット（新規はidがない場合もあるので注意）
            const newColumnIds = columns.map(col => col.id).filter(Boolean);
            // 削除対象カラム
            const columnsToDelete = dbColumns.filter(col => !newColumnIds.includes(col.id));
            // 追加・更新対象カラム
            const columnsToUpsert = columns;
            // カラム削除
            for (const col of columnsToDelete) {
                await columnRepository.delete(col.id);
            }
            // カラム追加・更新
            const columnIdMap = {};
            for (const col of columnsToUpsert) {
                let savedColumn;
                if (col.id && dbColumnIds.includes(col.id)) {
                    // 既存カラムは更新
                    const existCol = await columnRepository.findOneBy({ id: col.id });
                    if (existCol) {
                        existCol.name = col.name;
                        existCol.order = col.order ?? 0;
                        savedColumn = await columnRepository.save(existCol);
                    }
                }
                else {
                    // 新規カラムは追加
                    const newCol = columnRepository.create({
                        name: col.name,
                        order: col.order ?? 0,
                        table_note_id: tableNote.id
                    });
                    savedColumn = await columnRepository.save(newCol);
                }
                columnIdMap[col.id] = savedColumn.id;
            }
            // --- セルの更新 ---
            // 既存セル取得
            const dbCells = await cellRepository.find({ where: { table_note_id: tableNote.id } });
            const dbCellIds = dbCells.map(cell => cell.id);
            // 新セルを1次元配列化
            const flatNewCells = rowCells.flat();
            // 削除対象セル
            const newCellIds = flatNewCells.map(cell => cell.id).filter(Boolean);
            const cellsToDelete = dbCells.filter(cell => !newCellIds.includes(cell.id));
            for (const cell of cellsToDelete) {
                await cellRepository.delete(cell.id);
            }
            // 追加・更新対象セル
            for (let rowIndex = 0; rowIndex < rowCells.length; rowIndex++) {
                const row = rowCells[rowIndex];
                for (let colIndex = 0; colIndex < row.length; colIndex++) {
                    const cell = row[colIndex];
                    // columnIdのマッピング
                    const dbColumnId = columnIdMap[cell.columnId] || cell.columnId;
                    if (cell.id && dbCellIds.includes(cell.id)) {
                        // 既存セルは更新
                        const existCell = await cellRepository.findOneBy({ id: cell.id });
                        if (existCell) {
                            existCell.row_index = rowIndex;
                            existCell.value = cell.value;
                            existCell.table_note_id = tableNote.id;
                            existCell.column_id = dbColumnId;
                            const columnEntity = await columnRepository.findOneBy({ id: dbColumnId });
                            existCell.column = columnEntity;
                            await cellRepository.save(existCell);
                        }
                    }
                    else {
                        // 新規セルは追加
                        const columnEntity = await columnRepository.findOneBy({ id: dbColumnId });
                        const newCell = cellRepository.create({
                            row_index: rowIndex,
                            value: cell.value,
                            table_note_id: tableNote.id,
                            column_id: dbColumnId.id,
                            column: columnEntity
                        });
                        await cellRepository.save(newCell);
                    }
                }
            }
            // レスポンス用データ再取得
            const updatedColumns = await columnRepository.find({ where: { table_note_id: tableNote.id }, order: { order: 'ASC' } });
            const updatedRowCells = await cellRepository.find({ where: { table_note_id: tableNote.id }, order: { row_index: 'ASC' } });
            const groupedRowCells = [];
            updatedRowCells.forEach(cell => {
                const rowIdx = cell.row_index;
                if (!groupedRowCells[rowIdx])
                    groupedRowCells[rowIdx] = [];
                groupedRowCells[rowIdx].push({
                    id: cell.id,
                    rowIndex: cell.row_index,
                    value: cell.value,
                    columnId: cell.column ? cell.column.id : undefined,
                    table_note_id: cell.table_note_id
                });
            });
            res.status(200).json({
                message: "Save TableNote success!",
                tableNote: {
                    id: tableNote.id,
                    title: tableNote.title,
                    is_locked: tableNote.is_locked,
                    is_pinned: tableNote.is_pinned,
                    createdate: tableNote.createdate.toISOString(),
                    updatedate: tableNote.updatedate.toISOString(),
                    columns: updatedColumns.map(col => ({ id: col.id, name: col.name, order: col.order, table_note_id: col.table_note_id })),
                    rowCells: groupedRowCells
                }
            });
        });
    }
    catch (error) {
        console.error("Error update TableNote:", error);
        return res.status(500).json({ error: "Failed to update TableNote" });
    }
});
// 【UPDATE】TableNoteロック状態更新用API
router.put('/lock', authMiddleware, async (req, res) => {
    const { id, isLocked } = req.body;
    if (!id || isLocked === null || isLocked === undefined) {
        return res.status(400).json({ error: "Must set tablenote id,isLocked" });
    }
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        const tableNote = await tableNoteRepository.findOneBy({ id: id });
        if (!tableNote) {
            return res.status(404).json({ error: "Can't find TableNote" });
        }
        tableNote.is_locked = isLocked; // ロック状態を更新
        const updatedNote = await tableNoteRepository.save(tableNote);
        console.log('Note lock state updated: ', updatedNote.is_locked);
        res.status(200).json({ message: "Update lock state success!", tablenote: updatedNote });
    }
    catch (error) {
        console.error("Error updating lock state", error);
        return res.status(500).json({ error: "Failed to update lock state" });
    }
});
// 【UPDATE】TableNoteピン用API
router.put('/pin', authMiddleware, async (req, res) => {
    const { id, isPinned } = req.body;
    if (!id || typeof isPinned !== 'boolean') {
        return res.status(400).json({ error: "Must set id and pin status" });
    }
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        const result = await tableNoteRepository
            .createQueryBuilder()
            .update(TableNote)
            .set({
            is_pinned: isPinned,
            updatedate: () => '"updatedate"'
        })
            .where("id = :id", { id })
            .execute();
        if (result.affected === 0) {
            return res.status(404).json({ error: "Can't find TableNote" });
        }
        res.status(200).json({ message: "Pin TableNote success!" });
    }
    catch (error) {
        console.error("Error pin TableNote", error);
        return res.status(500).json({ error: "Failed to pin TableNote" });
    }
});
/************ TrashNote ************/
// 【SELECT】TrashTableNote取得API
router.get('/trash', authMiddleware, async (req, res) => {
    try {
        const noteRepository = AppDataSource.getRepository(TableNote);
        const notes = await noteRepository.find({ where: { is_deleted: true }, order: { deletedate: 'DESC' } });
        res.status(200).json(notes);
    }
    catch (error) {
        console.error("Error fetching trash TableNotes:", error);
        return res.status(500).json({ error: 'Failed to fetch trash TableNotes' });
    }
});
// 【DELETE】TrashTableNote一括削除用API
router.delete('/trash', authMiddleware, async (req, res) => {
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        await tableNoteRepository
            .createQueryBuilder()
            .delete()
            .from(TableNote)
            .where("is_deleted = :isDeleted", { isDeleted: true })
            .andWhere("deletedate IS NOT NULL")
            .execute();
        res.status(200).json({ message: "All TrashTableNote deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting TrashTableNote:", error);
        return res.status(500).json({ error: "Failed to delete all TrashTableNote" });
    }
});
// 【UPDATE】TableNotes一括復元用API
router.put('/trash', authMiddleware, async (req, res) => {
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        const result = await tableNoteRepository
            .createQueryBuilder()
            .update(TableNote)
            .set({
            is_deleted: false,
            deletedate: null,
        })
            .where("is_deleted = :isDeleted", { isDeleted: true })
            .andWhere("deletedate IS NOT NULL")
            .execute();
        res.status(200).json({
            message: "Restore all tablenotes success!",
            affected: result.affected, // 何件更新されたか
        });
    }
    catch (error) {
        console.error("Error restoring tablenotes", error);
        return res.status(500).json({ error: "Failed to restore tablenotes" });
    }
});
// ******************* 動的パラメータ持ち *******************
// 【DELETE】TrashTableNote削除用API
router.delete('/trash/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    console.log("delete id: ", id);
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        const tableNote = await tableNoteRepository.findOneBy({ id: id });
        if (!tableNote) {
            return res.status(404).json({ error: "TableNotes not found" });
        }
        await tableNoteRepository.remove(tableNote);
        res.status(200).json({ message: "TableNote deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting TableNote:", error);
        return res.status(500).json({ error: "Failed to delete TableNote" });
    }
});
// 【DELETE】Notes削除用API
router.delete('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: "Must set tablenote id" });
    }
    console.log("delete id: ", id);
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        const tableNote = await tableNoteRepository.findOneBy({ id: id });
        if (!tableNote) {
            return res.status(404).json({ error: "tablenote not found" });
        }
        tableNote.is_deleted = true; // 論理削除のためフラグを立てる
        tableNote.deletedate = new Date(); // 削除日時を設定
        await tableNoteRepository.save(tableNote);
        res.status(200).json({ message: "TableNote moved to trash successfully" });
    }
    catch (error) {
        console.error("Error deleting TableNote:", error);
        return res.status(500).json({ error: "Failed moved to trash" });
    }
});
// 【UPDATE】TrashTableNote復元用API
router.put('/trash/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: "Must set tablenote id" });
    }
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        const tableNote = await tableNoteRepository.findOneBy({ id: id });
        if (!tableNote) {
            return res.status(404).json({ error: "Can't find TableNote" });
        }
        tableNote.is_deleted = false; // 論理削除フラグを解除
        tableNote.deletedate = null; // 削除日時をnullに設定
        const restoredNote = await tableNoteRepository.save(tableNote);
        console.log('Note restored: ', restoredNote.updatedate);
        res.status(200).json({ message: "Restore TableNote success!", tablenote: restoredNote });
    }
    catch (error) {
        console.error("Error restoring TableNote", error);
        return res.status(500).json({ error: "Failed to restore TableNote" });
    }
});
// 【SELECT】テーブルノート単体取得API
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: "Must set id" });
    }
    try {
        const tableNoteRepository = AppDataSource.getRepository(TableNote);
        const tableNote = await tableNoteRepository.findOne({ where: { id: id, is_deleted: false }, order: { updatedate: 'DESC' } });
        if (tableNote) {
            // 返却するテーブルノートの配列
            let result = {
                tablenote: {
                    id: tableNote.id,
                    title: tableNote.title,
                    label_id: tableNote.label_id,
                    is_locked: tableNote.is_locked,
                    is_pinned: tableNote.is_pinned,
                    createdate: tableNote.createdate.toISOString(),
                    updatedate: tableNote.updatedate.toISOString()
                },
                columns: [],
                rowCells: []
            };
            result.tablenote.id = tableNote.id;
            result.tablenote.title = tableNote.title;
            result.tablenote.label_id = tableNote.label_id;
            result.tablenote.is_locked = tableNote.is_locked;
            result.tablenote.is_pinned = tableNote.is_pinned;
            result.tablenote.createdate = tableNote.createdate.toISOString();
            result.tablenote.updatedate = tableNote.updatedate.toISOString();
            // 各テーブルノートのカラムとセルを取得
            const columnRepository = AppDataSource.getRepository(TableNoteColumn);
            const cellRepository = AppDataSource.getRepository(TableNoteCell);
            const columns = await columnRepository.find({ where: { table_note_id: tableNote.id }, order: { order: 'ASC' } });
            const rowCells = await cellRepository.find({ where: { table_note_id: tableNote.id }, relations: ['column'], order: { row_index: 'ASC', column: { order: 'ASC' } } });
            // rowCellsをrow_indexごとにグループ化して2次元配列に変換
            const groupedRowCells = [];
            rowCells.forEach(cell => {
                const rowIdx = cell.row_index;
                if (!groupedRowCells[rowIdx])
                    groupedRowCells[rowIdx] = [];
                groupedRowCells[rowIdx].push({
                    id: cell.id,
                    rowIndex: cell.row_index,
                    value: cell.value,
                    columnId: cell.column ? cell.column.id : undefined,
                    table_note_id: cell.table_note_id
                });
            });
            result.columns = tableNote.is_locked ? null : columns.map(col => ({ id: col.id, name: col.name, order: col.order, table_note_id: col.table_note_id })),
                result.rowCells = tableNote.is_locked ? null : groupedRowCells;
            return res.status(200).json(result);
        }
        else {
            return res.status(200).json([]);
        }
    }
    catch (error) {
        console.error("Error fetching TableNote:", error);
        return res.status(500).json({ error: 'Failed to fetch TableNote' });
    }
});
export default router;
//# sourceMappingURL=TableNoteRoutes.js.map