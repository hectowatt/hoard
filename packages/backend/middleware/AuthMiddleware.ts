import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { redis } from '../server';

const SECRET = process.env.SECRET || 'hoard_secret';
const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? process.env.DOMAIN : "http://localhost:8120";

export const authMiddleware = async (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    const origin = req.headers.origin;
    if (!accessToken) return res.status(401).json({ message: 'Unauthorized' });

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        if (!origin || origin !== ALLOWED_ORIGIN) {
            return res.status(403).json({ message: 'Forbidden: Invalid Origin' });
        }
    }

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
