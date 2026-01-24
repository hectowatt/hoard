import { Router } from 'express';
import { AppDataSource } from '../DataSource.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import HoardUser from '../entities/HoardUser.js';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { redis } from '../server.js';
import { nanoid } from 'nanoid';

const router = Router();
const SECRET: string = process.env.SECRET || 'hoard_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'hoard_refresh_secret';
const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.ACCESS_TOKEN_EXPIRY) * 1000 || 15 * 60 * 1000; // 15分
const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000; // 7日
const ACCESS_TOKEN_EXPIRY_SEC = Number(process.env.ACCESS_TOKEN_EXPIRY) || 15 * 60;
const REFRESH_TOKEN_EXPIRY_SEC = Number(process.env.REFRESH_TOKEN_EXPIRY) || 7 * 24 * 60 * 60;

// 【SELECT】User存在確認API
router.get('/isexist', async (req, res) => {
    const userRepository = AppDataSource.getRepository('HoardUser');
    const users = await userRepository.find();
    if (users && users.length > 0) {
        return res.status(200).json({ exists: true });
    } else {
        return res.status(200).json({ exists: false });
    }
});

// 【SELECT】User取得API
router.get('/', authMiddleware, async (req, res) => {
    const userRepository = AppDataSource.getRepository('HoardUser');
    const users = await userRepository.find();
    res.status(200).json(users);
});

// 【INSERT】User登録API
router.post('/', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userRepository = AppDataSource.getRepository(HoardUser);
        const password_hashed = await bcrypt.hash(password, 10);
        const newUser = userRepository.create({
            username: username,
            password: password_hashed,
            createdate: new Date(),
            updatedate: new Date()
        });

        const savedUser = await userRepository.save(newUser);
        const accessJti = nanoid();
        const refreshJti = nanoid();

        // アクセストークンの生成
        const accessToken = jwt.sign({
            id: savedUser.id,
            username: savedUser.username,
            jti: accessJti
        }, SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY_SEC });

        // リフレッシュトークンの生成
        const refreshToken = jwt.sign({
            id: savedUser.id,
            username: savedUser.username,
            jti: refreshJti
        }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY_SEC });

        // Redis にトークン情報を保存
        await redis.set(`accessToken:${accessJti}`, 'valid', 'EX', ACCESS_TOKEN_EXPIRY_SEC);
        await redis.set(`refreshToken:${refreshJti}`, 'valid', 'EX', REFRESH_TOKEN_EXPIRY_SEC);
        console.log("Access and Refresh tokens created");


        //アクセストークンは短命
        res.cookie("accessToken", accessToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : "",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: "/",
            maxAge: ACCESS_TOKEN_EXPIRY_MS
        });

        // リフレッシュトークンは長命
        res.cookie("refreshToken", refreshToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : "",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: "/",
            maxAge: REFRESH_TOKEN_EXPIRY_MS
        });
        res.status(201).json({ message: "regist user success!" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// 【UPDATE】User更新API
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { username, password } = req.body;
        // cookie から JWT を取得
        const prevAccessToken = req.cookies.get("accessToken")?.value;
        if (!prevAccessToken) {
            return res.status(401).json({ error: "No token provided" });
        }

        // JWT を検証・デコード
        const decoded = jwt.verify(prevAccessToken, SECRET);
        if (typeof decoded === 'string' || !('id' in decoded)) {
            return res.status(401).json({ error: "Invalid token" });
        }
        const user_id = typeof decoded !== 'string' && 'id' in decoded ? decoded.id : null;
        if (!user_id) {
            return res.status(401).json({ error: "Invalid token" });
        }
        const oldJti = decoded.jti;

        // user_id でユーザーを検索
        const userRepository = AppDataSource.getRepository(HoardUser);
        const user = await userRepository.findOneBy({ id: user_id });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const password_hashed = await bcrypt.hash(password, 10);


        if (!username) {
            if (!password) {
                // usernameとpasswordの両方が空の場合はエラー
                return res.status(400).json({ error: "Must set password or username" });
            } else {
                // passwordのみ入力されている場合
                user.password = password_hashed;
            }
        } else {
            if (!password) {
                // usernameのみ入力されている場合
                user.username = username;
            } else {
                // usernameとpasswordの両方が入力されている場合
                user.username = username;
                user.password = password_hashed;
            }
        }

        user.updatedate = new Date();
        const savedUser = await userRepository.save(user);

        const newJti = nanoid();
        const newAccessToken = jwt.sign({ id: savedUser.id, username: savedUser.username, jti: newJti }, SECRET, { expiresIn: '1d' });

        if (oldJti) {
            console.log("old jti is deleted.")
            await redis.del(`accessToken:${oldJti}`); // 古いトークンを無効化
        }

        await redis.set(`accessToken:${newJti}`, 'valid', 'EX', ACCESS_TOKEN_EXPIRY_SEC); // 新しいトークンを登録
        console.log("new jti is set.")

        res.cookie("accessToken", newAccessToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : "localhost", // 本番はenvファイルの設定を使用,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: "/",
            maxAge: ACCESS_TOKEN_EXPIRY_MS
        });
        res.status(201).json({ message: "update user success!" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// 【SELECT】パスワード比較API（リクエスト値とDBのハッシュ化されたパスワードが一致するかを返却）
router.post('/compare', authMiddleware, async (req, res) => {
    try {
        // cookie から JWT を取得
        const accessToken = req.cookies.get("accessToken")?.value;
        if (!accessToken) {
            return res.status(401).json({ error: "No token provided" });
        }

        // JWT を検証・デコード
        const decoded = jwt.verify(accessToken, SECRET);
        const user_id = typeof decoded !== 'string' && 'id' in decoded ? decoded.id : null;

        const passwordString = req.body.passwordString;
        if (!passwordString) {
            return res.status(400).json({ error: "Must set password string" });
        }

        // user_id でユーザーを検索
        const userRepository = AppDataSource.getRepository(HoardUser);
        const user = await userRepository.findOneBy({ id: user_id });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // パスワード比較
        const isMatch = await bcrypt.compare(passwordString, user.password);
        console.log("パスワードの一致:", isMatch);

        res.status(200).json({ isMatch });
    } catch (error) {
        console.error("Error comparing password:", error);
        res.status(500).json({ error: 'Failed to compare password' });
    }
});

export default router;