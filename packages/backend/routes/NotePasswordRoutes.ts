import { Router } from 'express';
import { AppDataSource } from '../DataSource.js';
import NotePassword from '../entities/NotePassword.js';
import bcrypt from "bcrypt";
import { authMiddleware } from '../middleware/AuthMiddleware.js';

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
        res.status(500).json({ error: "Failed to save password" });
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
        res.status(500).json({ error: 'Failed to fetch notepassword' });
    }
});

// 【UPDATE】ノートパスワード更新API
router.put('/', authMiddleware, async (req, res) => {
    const { password_id, passwordString } = req.body;
    if (!password_id || !passwordString) {
        return res.status(400).json({ error: "Must set password_id, passwordString" });
    }
    try {
        const passwordRepository = AppDataSource.getRepository(NotePassword);
        const password = await passwordRepository.findOneBy({ password_id: password_id });
        if (!password) {
            return res.status(404).json({ error: "Password not found" });
        }
        password.password_hashed = await bcrypt.hash(passwordString, 10);

        await passwordRepository.save(password);
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error update password:", error);
        res.status(500).json({ error: "Failed to update password" });
    }
});

// 【SELECT】ノートパスワード比較API（リクエスト値とDBのハッシュ化されたパスワードが一致するかを返却）
router.post('/compare', authMiddleware, async (req, res) => {
    try {
        const password_id = req.body.password_id;
        const passwordString = req.body.passwordString;

        if (!passwordString || !password_id) {
            return res.status(400).json({ error: "Must set password string" });
        }
        const passwordRepository = AppDataSource.getRepository(NotePassword);
        // passwordを取得する
        const password = await passwordRepository.findOneBy({ password_id: password_id });
        if (password === null) {
            return res.status(404).json({ error: "Password not found" });
        }
        const isMatch = await bcrypt.compare(passwordString, password.password_hashed);
        console.log("パスワードの一致:", isMatch);
        res.status(200).json({ isMatch: isMatch });
    } catch (error) {
        console.error("Error fetching password:", error);
        res.status(500).json({ error: 'Failed to fetch notepassword' });
    }
});

export default router;