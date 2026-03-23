import { Router } from 'express';
import { AppDataSource } from '../DataSource';
import Label from '../entities/Label';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

// 【INSERT】ラベル登録API
router.post('/', authMiddleware, async (req, res) => {
  const { labelName } = req.body;

  if (!labelName) {
    return res.status(400).json({ error: "Must set labelname" });
  }

  try {
    const labelRepository = AppDataSource.getRepository(Label);
    const newLabel = labelRepository.create({
      labelname: labelName,
      createdate: new Date()
    });
    const savedLabel = await labelRepository.save(newLabel);

    console.log('Label inserted with ID: ', savedLabel.id);
    res.status(201).json({ message: "Save label success!", label: savedLabel });
  } catch (error) {
    console.error("Error saving label:", error);
    if (error.code === '22001') {
      return res.status(400).json({ error: "Label name is too long" });
    } else if (error.code === '23505') {
      return res.status(400).json({ error: "Label name must be unique" });
    } else {
      return res.status(500).json({ error: "Failed to save label" });
    }
  }
});

// 【SELECT】label全件取得API
router.get('/', authMiddleware, async (req, res) => {
  try {
    const labelRepository = AppDataSource.getRepository(Label);
    // labelを全件取得する
    const labels = await labelRepository.find();
    return res.status(200).json(labels);
  } catch (error) {
    console.error("Error fetching labels:", error);
    return res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// 【DELETE】ラベル削除API
router.delete('/:id', authMiddleware, async (req, res) => {
  const id: string = req.params?.id ?? req.body?.id;
  console.log("delete label id: ", id);
  if (!id) {
    return res.status(400).json({ error: "Must set id" });
  }
  try {
    const labelRepository = AppDataSource.getRepository(Label);
    const label = await labelRepository.findOneBy({ id: id });
    if (!label) {
      return res.status(404).json({ error: "Label not found" });
    }

    await labelRepository.remove(label);
    res.status(200).json({ message: "Label deleted successfully" });
  } catch (error) {
    console.error("Error deleting label:", error);
    return res.status(500).json({ error: "Failed to delete label" });
  }
});

export default router;