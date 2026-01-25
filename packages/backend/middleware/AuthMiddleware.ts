import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { redis } from '../server.js';

const SECRET = process.env.SECRET || 'hoard_secret';

export const authMiddleware = async (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(accessToken, SECRET);
        if (typeof decoded !== 'string' && 'jti' in decoded) {
            const status = await redis.get(`accessToken:${decoded.jti}`);
            if (status !== 'valid') {
                return res.status(401).json({ message: 'accessToken invalid or expired' });
            }
            req.user = {
                id: decoded.id,
                username: decoded.username,
                jti: decoded.jti
            };
            return next();
        } else {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
