import { Router } from 'express';
import { AppDataSource } from '../DataSource';
import NotePassword from '../entities/NotePassword';
import bcrypt from "bcrypt";
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

// 【INSERT】ノートパスワード登録API
router.post('/', authMiddleware, async (req, res) => {
    const { passwordString } = req.body;

    if (!passwordString) {
        return res.status(400).json({ error: "Must set password string" });
    }

    const password_hashed = await bcrypt.hash(passwordString, 10);

    try {
        const passwordRepository = AppDataSource.getRepository(NotePassword);
        const newPassword = passwordRepository.create({
            password_hashed: password_hashed
        });
        const savedPassword = await passwordRepository.save(newPassword);

        res.status(201).json({ message: "Save password success!", password_id: savedPassword.password_id });
    } catch (error) {
        console.error("Error saving password:", error);
        return res.status(500).json({ error: "Failed to save password" });
    }
});

// 【SELECT】ノートパスワードid取得API
router.get('/', authMiddleware, async (req, res) => {
    try {
        const passwordRepository = AppDataSource.getRepository(NotePassword);
        // passwordを取得する
        const password_hashed = await passwordRepository.find();
        if (password_hashed.length === 0) {
            return res.status(200).json({ password_id: null });
        } else {
            const id = password_hashed[0].password_id; // 最初のパスワードIDを取得
            res.status(200).json({ password_id: id });
        }
    } catch (error) {
        console.error("Error fetching password:", error);
        return res.status(500).json({ error: 'Failed to fetch notepassword' });
    }
});

// 【UPDATE】ノートパスワード更新API
router.put('/', authMiddleware, async (req, res) => {
    const { password_id, passwordString } = req.body;
    if (!password_id || !passwordString || passwordString.trim() === "") {
        return res.status(400).json({ error: "Must set password_id, passwordString" });
    }
    try {
        const passwordRepository = AppDataSource.getRepository(NotePassword);
        const password = await passwordRepository.findOneBy({ password_id: password_id });
        if (!password) {
            return res.status(404).json({ error: "Password not found" });
        }

        // パスワードの検証
        const isMatch = await bcrypt.compare(passwordString, password.password_hashed);
        console.log("パスワードの一致:", isMatch);
        if (!isMatch) {
            return res.status(400).json({ error: "password is incorrect" })
        } else {
            password.password_hashed = await bcrypt.hash(passwordString, 10);

            await passwordRepository.save(password);
            res.status(200).json({ message: "Password updated successfully" });
        }
    } catch (error) {
        console.error("Error update password:", error);
        return res.status(500).json({ error: "Failed to update password" });
    }
});

export default router;