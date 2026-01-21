import { Router } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { nanoid } from 'nanoid';
import { redis } from '../server.js';
const router = Router();
const SECRET = process.env.SECRET || 'hoard_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'hoard_refresh_secret';
const ACCESS_TOKEN_EXPIRY = Number(process.env.ACCESS_TOKEN_EXPIRY) || 15 * 60;
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            console.log("Refresh token not found in cookies:", refreshToken);
            return res.status(401).json({ message: "Refresh token not found" });
        }
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        const isValid = await redis.get(`refreshToken:${decoded.jti}`);
        if (!isValid) {
            console.log("Refresh token invalid or expired:", isValid);
            return res.status(401).json({ message: "Refresh token invalid or expired" });
        }
        // 古いアクセストークンを削除
        const oldAccessToken = req.cookies.accessToken;
        if (oldAccessToken) {
            try {
                const oldDecoded = jwt.verify(oldAccessToken, SECRET);
                await redis.del(`accessToken:${oldDecoded.jti}`);
                console.log("Old access token deleted");
            }
            catch (error) {
                console.error("Old access token deletion error:", error);
                return res.status(500).json({ error: "Old token delete error" });
            }
        }
        // 新しいアクセストークンを発行
        const newAccessJti = nanoid();
        const newAccessToken = jwt.sign({ id: decoded.id, username: decoded.username, jti: newAccessJti }, SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
        await redis.set(`accessToken:${newAccessJti}`, 'valid', 'EX', 15 * 60);
        res.cookie("accessToken", newAccessToken, {
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : "localhost",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: "/",
            maxAge: 15 * 60 * 1000
        });
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("Error during token refresh:", error);
        res.status(500).json({ error: "Token refresh failed" });
    }
});
export default router;
//# sourceMappingURL=TokenRoutes.js.map