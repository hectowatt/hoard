import { Router } from 'express';
import { AppDataSource } from '../DataSource.js';
import Note from '../entities/Note.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';

const router = Router();

// 【SELECT】Notes全件取得API
router.get('/', authMiddleware, async (req, res) => {
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    // Notesを全件取得する
    const notes = await noteRepository.find({ where: { is_deleted: false }, order: { updatedate: 'DESC' } });
    notes.map(note => {
      if (note.is_locked) {
        note.content = "";
      }
    });
    return res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// 【INSERT】Notes登録API
router.post('/', authMiddleware, async (req, res) => {
  const { title, content, label, isLocked, isPinned } = req.body;
  if (!title && !content) {
    return res.status(400).json({ error: "Must set title or content" });
  }

  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const newNote = noteRepository.create({
      title: title,
      content: content,
      label_id: label || null, // ラベルがない場合はnullを設定
      createdate: new Date(),
      updatedate: new Date(),
      is_locked: isLocked, // ロック状態を設定
      is_pinned: isPinned
    });
    const savedNote = await noteRepository.save(newNote);

    console.log('Note inserted with ID: ', savedNote.id);
    res.status(201).json({ message: "save note success!", note: savedNote });
  } catch (error) {
    console.error("Error saving note:", error);
    return res.status(500).json({ error: "Failed to save note" });
  }
});

// 【UPDATE】Notes更新用API
router.put('/', authMiddleware, async (req, res) => {
  const { id, title, content, label, isLocked, isPinned } = req.body;
  if (!id || !title && !content) {
    return res.status(400).json({ error: "Must set title or content and must set id" });
  }

  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const note = await noteRepository.findOneBy({ id: id });
    if (!note) {
      return res.status(404).json({ error: "Can't find note" });
    }
    note.content = content;
    note.title = title;
    note.label_id = label;
    note.updatedate = new Date();
    note.is_locked = isLocked;
    note.is_pinned = isPinned;
    const updatedNote = await noteRepository.save(note);
    console.log('updated: ', updatedNote.updatedate);
    res.status(200).json({ message: "update note success!", note: updatedNote });
  } catch (error) {
    console.error("Error updating note", error);
    return res.status(500).json({ error: "failed to update notes" });
  }
});



// 【UPDATE】Notesロック状態更新用API
router.put('/lock', authMiddleware, async (req, res) => {
  const { id, isLocked } = req.body;
  if (!id || isLocked === null || isLocked === undefined) {
    return res.status(400).json({ error: "Must set id or isLocked" });
  }
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const note = await noteRepository.findOneBy({ id: id });
    if (!note) {
      return res.status(404).json({ error: "Can't find note" });
    }
    note.is_locked = isLocked; // ロック状態を更新
    const updatedNote = await noteRepository.save(note);
    console.log('Note lock state updated: ', updatedNote.is_locked);
    res.status(200).json({ message: "Update lock state success!", note: updatedNote });
  } catch (error) {
    console.error("Error updating lock state", error);
    return res.status(500).json({ error: "Failed to update lock state" });
  }
});

// 【UPDATE】Noteピン用API
router.put('/pin', authMiddleware, async (req, res) => {
  const { id, isPinned } = req.body;
  if (!id || typeof isPinned !== 'boolean') {
    return res.status(400).json({ error: "Must set id and pin status" });
  }
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const result = await noteRepository
      .createQueryBuilder()
      .update(Note)
      .set({
        is_pinned: isPinned,
        updatedate: () => '"updatedate"'
      })
      .where("id = :id", { id })
      .execute();

    if (result.affected === 0) {
      return res.status(404).json({ error: "Can't find Note" });
    }
    res.status(200).json({ message: "Pin note success!" });
  } catch (error) {
    console.error("Error pin note", error);
    return res.status(500).json({ error: "Failed to pin notes" });
  }
});


/************ TrashNote ************/

// 【SELECT】TrashNote取得API
router.get('/trash', authMiddleware, async (req, res) => {
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const notes = await noteRepository.find({ where: { is_deleted: true }, order: { deletedate: 'DESC' } });
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching trash notes:", error);
    return res.status(500).json({ error: 'Failed to fetch trash notes' });
  }
});

// 【DELETE】TrashNote一括削除用API
router.delete('/trash', authMiddleware, async (req, res) => {
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    await noteRepository
      .createQueryBuilder()
      .delete()
      .from(Note)
      .where("is_deleted = :isDeleted", { isDeleted: true })
      .andWhere("deletedate IS NOT NULL")
      .execute();
    res.status(200).json({ message: "All TrashNote deleted successfully" });
  } catch (error) {
    console.error("Error deleting trashnote:", error);
    return res.status(500).json({ error: "Failed to delete trashnote" });
  }
});


// 【UPDATE】Notes一括復元用API
router.put('/trash', authMiddleware, async (req, res) => {
  try {
    const noteRepository = AppDataSource.getRepository(Note);

    const result = await noteRepository
      .createQueryBuilder()
      .update(Note)
      .set({
        is_deleted: false,
        deletedate: null,
      })
      .where("is_deleted = :isDeleted", { isDeleted: true })
      .andWhere("deletedate IS NOT NULL")
      .execute();

    res.status(200).json({
      message: "Restore all notes success!",
      affected: result.affected, // 何件更新されたか
    });

  } catch (error) {
    console.error("Error restoring notes", error);
    return res.status(500).json({ error: "Failed to restore notes" });
  }
});


// ******************* 動的パラメータ持ち *******************
// 【DELETE】TrashNote削除用API
router.delete('/trash/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log("delete id: ", id);
  if (!id) {
    return res.status(400).json({ error: "Must set id" });
  }

  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const note = await noteRepository.findOneBy({ id: id });
    if (!note) {
      return res.status(404).json({ error: "TrashNote not found" });
    }
    await noteRepository.remove(note);
    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return res.status(500).json({ error: "Failed to delete note" });
  }
});


// 【DELETE】Notes削除用API
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log("delete id: ", id);
  if (!id) {
    return res.status(400).json({ error: "Must set id" });
  }
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const note = await noteRepository.findOneBy({ id: id });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    note.is_deleted = true; // 論理削除のためフラグを立てる
    note.deletedate = new Date(); // 削除日時を設定
    await noteRepository.save(note);
    res.status(200).json({ message: "Note moved to trash successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return res.status(500).json({ error: "Failed to move note to trash" });
  }
});

// 【UPDATE】Notes復元用API
router.put('/trash/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Must set id" });
  }
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const note = await noteRepository.findOneBy({ id: id });
    if (!note) {
      return res.status(404).json({ error: "TrashNote not found" });
    }
    note.is_deleted = false; // 論理削除フラグを解除
    note.deletedate = null; // 削除日時をnullに設定
    const restoredNote = await noteRepository.save(note);
    console.log('Note restored: ', restoredNote.updatedate);
    res.status(200).json({ message: "Restore note success!", note: restoredNote });
  } catch (error) {
    console.error("Error restoring note", error);
    return res.status(500).json({ error: "Failed to restore notes" });
  }
});

// 【SELECT】ノート単体取得API
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Must set id" });
  }

  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const note = await noteRepository.findOneBy({ id: id });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    if (note.is_locked) {
      note.content = "";
    }
    return res.status(200).json(note);
  } catch (error) { }
});


export default router;