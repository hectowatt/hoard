import { Router } from 'express';
import { AppDataSource } from '../DataSource.js';
import jwt, { SignOptions } from 'jsonwebtoken';
import 'dotenv/config';
import bcrypt from "bcrypt";
import { nanoid } from 'nanoid';
import { redis } from '../server.js';

const router = Router();
const SECRET: string = process.env.SECRET || 'hoard_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'hoard_refresh_secret';
const ACCESS_TOKEN_EXPIRY_SEC =
    Number(process.env.ACCESS_TOKEN_EXPIRY ?? 15 * 60);
const REFRESH_TOKEN_EXPIRY_SEC =
    Number(process.env.REFRESH_TOKEN_EXPIRY ?? 7 * 24 * 60 * 60);
const ACCESS_TOKEN_EXPIRY_MS = ACCESS_TOKEN_EXPIRY_SEC * 1000;
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_SEC * 1000;



// 【SELECT】ログイン認証API
router.post('/', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userRepository = AppDataSource.getRepository('HoardUser');
        const user = await userRepository.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const userid: string = user.id;

        if (await bcrypt.compare(password, user.password)) {

            const accessJti = nanoid();
            const refreshJti = nanoid();

            // アクセストークンの生成
            const accessToken = jwt.sign({
                id: user.id,
                username: user.username,
                jti: accessJti
            }, SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY_SEC });

            // リフレッシュトークンの生成
            const refreshToken = jwt.sign({
                id: user.id,
                username: user.username,
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
            return res.status(200).json({ success: true });
        } else {
            return res.status(401).json({ success: false });
        }

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Login failed" });
    }
});


export default router;