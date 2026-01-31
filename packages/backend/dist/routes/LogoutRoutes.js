import { Router } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { redis } from '../server.js';
const router = Router();
const SECRET = process.env.SECRET || 'hoard_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'hoard_refresh_secret';
// 【POST】ログアウトAPI
router.post('/', async (req, res) => {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;
    if (accessToken) {
        try {
            const decoded = jwt.verify(accessToken, SECRET);
            if (typeof decoded === 'object' && decoded !== null && 'jti' in decoded) {
                await redis.del(`accessToken:${decoded.jti}`);
            }
        }
        catch (e) {
            console.error(e);
            return res.status(500).json({ success: false });
        }
    }
    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
            if (typeof decoded === 'object' && decoded !== null && 'jti' in decoded) {
                await redis.del(`refreshToken:${decoded.jti}`);
            }
        }
        catch (e) {
            console.error(e);
            return res.status(500).json({ success: false });
        }
    }
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.status(200).json({ success: true });
});
export default router;
//# sourceMappingURL=LogoutRoutes.js.map