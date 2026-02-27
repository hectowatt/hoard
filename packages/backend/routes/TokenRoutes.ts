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
const ACCESS_TOKEN_EXPIRY = Number(process.env.ACCESS_TOKEN_EXPIRY) || 15 * 60;
const REFRESH_TOKEN_EXPIRY = Number(process.env.REFRESH_TOKEN_EXPIRY) || 7 * 24 * 60 * 60;

// トークン有効性確認エンドポイント
router.get('/verify', async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;

        const result = {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenValid: false,
            refreshTokenValid: false
        };

        // アクセストークン検証
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, SECRET) as any;
                const isValid = await redis.get(`accessToken:${decoded.jti}`);
                result.accessTokenValid = !!isValid;
            } catch (error) {
                result.accessTokenValid = false;
            }
        }

        // リフレッシュトークン検証
        if (refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
                const isValid = await redis.get(`refreshToken:${decoded.jti}`);
                result.refreshTokenValid = !!isValid;
            } catch (error) {
                result.refreshTokenValid = false;
            }
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error during token verification:", error);
        return res.status(500).json({ error: "Token verification failed" });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            // リフレッシュトークンがない場合はエラー
            console.log("Refresh token not found in cookies:", refreshToken);
            return res.status(401).json({ message: "Refresh token not found" });
        }

        const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
        const isValid = await redis.get(`refreshToken:${decoded.jti}`);

        if (!isValid) {
            console.log("Refresh token invalid or expired:", isValid);
            return res.status(401).json({ message: "Refresh token invalid or expired" });
        }

        // 古いアクセストークンを削除
        const oldAccessToken = req.cookies.accessToken;
        if (oldAccessToken) {
            try {
                const oldDecoded = jwt.verify(oldAccessToken, SECRET) as any;
                await redis.del(`accessToken:${oldDecoded.jti}`);
                console.log("Old access token deleted");
            } catch (error) {
                console.error("Old access token deletion error:", error);
                return res.status(500).json({ error: "Old token delete error" });
            }
        }

        // 新しいアクセストークンとリフレッシュトークンを発行
        const newAccessJti = nanoid();
        const newRefreshJti = nanoid();
        const newAccessToken = jwt.sign(
            { id: decoded.id, username: decoded.username, jti: newAccessJti },
            SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        const newRefreshToken = jwt.sign(
            { id: decoded.id, username: decoded.username, jti: newRefreshJti },
            REFRESH_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRY }
        );

        await redis.set(`accessToken:${newAccessJti}`, 'valid', 'EX', ACCESS_TOKEN_EXPIRY);
        await redis.set(`refreshToken:${newRefreshJti}`, 'valid', 'EX', REFRESH_TOKEN_EXPIRY);

        res.cookie("accessToken", newAccessToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : "localhost",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: "/",
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", newRefreshToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : "localhost",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error during token refresh:", error);
        return res.status(500).json({ error: "Token refresh failed" });
    }
});

export default router;