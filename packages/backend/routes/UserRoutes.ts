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
const ACCESS_TOKEN_EXPIRY_SEC =
    Number(process.env.ACCESS_TOKEN_EXPIRY ?? 15 * 60);
const REFRESH_TOKEN_EXPIRY_SEC =
    Number(process.env.REFRESH_TOKEN_EXPIRY ?? 7 * 24 * 60 * 60);
const ACCESS_TOKEN_EXPIRY_MS = ACCESS_TOKEN_EXPIRY_SEC * 1000;
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_SEC * 1000;

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
        if (username == "" || username === null || username.trim() === "" || password == "" || password === null || password.trim() === "") {
            return res.status(400).json({ message: "username and password must be set" })
        }
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
            domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : "",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: 'strict',
            path: "/",
            maxAge: ACCESS_TOKEN_EXPIRY_MS
        });

        // リフレッシュトークンは長命
        res.cookie("refreshToken", refreshToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : "",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: 'strict',
            path: "/",
            maxAge: REFRESH_TOKEN_EXPIRY_MS
        });
        res.status(201).json({ message: "regist user success!" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// 【UPDATE】User更新API
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { username, oldpassword, newpassword } = req.body;
        // cookie から JWT を取得
        const prevAccessToken = req.cookies.accessToken;
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

        // user_id でユーザーを検索
        const userRepository = AppDataSource.getRepository(HoardUser);
        const user = await userRepository.findOneBy({ id: user_id });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }


        if (!username) {
            if (!oldpassword || !newpassword) {
                // usernameとpasswordの両方が空の場合はエラー
                return res.status(400).json({ error: "Must set password or username" });
            } else {
                // passwordのみ入力されている場合
                // パスワードの検証
                const isMatch = await bcrypt.compare(oldpassword, user.password);
                console.log("パスワードの一致:", isMatch);
                if (!isMatch) {
                    return res.status(400).json({ error: "password is incorrect" })
                } else {
                    const password_hashed = await bcrypt.hash(newpassword, 10);
                    user.password = password_hashed;
                }
            }
        } else {
            if (!oldpassword || !newpassword) {
                // usernameのみ入力されている場合
                user.username = username;
            } else {
                // usernameとpasswordの両方が入力されている場合
                // パスワードの検証
                const isMatch = await bcrypt.compare(oldpassword, user.password);
                console.log("パスワードの一致:", isMatch);
                if (!isMatch) {
                    return res.status(400).json({ error: "password is incorrect" })
                } else {
                    const password_hashed = await bcrypt.hash(newpassword, 10);
                    user.username = username;
                    user.password = password_hashed;
                }
            }
        }

        user.updatedate = new Date();
        const savedUser = await userRepository.save(user);

        const accessJti = nanoid();
        const refreshJti = nanoid();
        const newAccessToken = jwt.sign({ id: savedUser.id, username: savedUser.username, jti: accessJti }, SECRET, { expiresIn: '1d' });
        const refreshToken = jwt.sign({
            id: user.id,
            username: user.username,
            jti: refreshJti
        }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY_SEC });


        await redis.set(`accessToken:${accessJti}`, 'valid', 'EX', ACCESS_TOKEN_EXPIRY_SEC); // 新しいトークンを登録
        await redis.set(`refreshToken:${refreshJti}`, 'valid', 'EX', REFRESH_TOKEN_EXPIRY_SEC);
        console.log("new jti is set.")

        res.cookie("accessToken", newAccessToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : "localhost", // 本番はenvファイルの設定を使用,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: 'strict',
            path: "/",
            maxAge: ACCESS_TOKEN_EXPIRY_MS
        });

        res.cookie("refreshToken", refreshToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : "",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: 'strict',
            path: "/",
            maxAge: REFRESH_TOKEN_EXPIRY_MS
        });
        res.status(201).json({ message: "update user success!" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

export default router;