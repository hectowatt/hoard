import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';


// Redisのgetメソッドのモック関数
const mockRedisGet = jest.fn<(key: string) => Promise<string | null>>();

const mockJwtVerify = jest.fn((token, secret) => {
    if (token === 'valid-token') {
        return { jti: 'valid-jti', id: 'test-user-id', username: 'testuser' };
    }
    throw new Error('Invalid token');
});

// jwt.signのモック関数
const mockJwtSign = jest.fn(() => 'valid-token');

// AuthMiddleware が "import { redis } from '../server.js'" するのを傍受
jest.unstable_mockModule("../../server", () => ({
    redis: {
        get: mockRedisGet,
    },
    // テストファイル自体が 'hoardserver' を import しているため、それもモック
    hoardserver: {
        close: (cb?: (err?: any) => void) => cb?.(), // afterAll のため
    },
    app: {},
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        verify: mockJwtVerify,
        sign: mockJwtSign,
    },
    verify: mockJwtVerify,
    sign: mockJwtSign,
}));


const { authMiddleware } = await import('../../middleware/AuthMiddleware');
const { app, hoardserver } = await import("../../server");

const jwt = (await import('jsonwebtoken')).default;

const SECRET = 'hoard_secret';


describe('AuthMiddleware', () => {

    beforeEach(() => {
        mockJwtVerify.mockClear();
        mockJwtSign.mockClear();
        mockRedisGet.mockClear();
    });

    it('should call next() for a valid token that exists in Redis', async () => {
        const payload = { jti: 'valid-jti', id: 'test-user-id', username: 'testuser' };

        const token = jwt.sign(payload, SECRET);

        mockRedisGet.mockResolvedValueOnce('valid');

        const req = { cookies: { accessToken:token }, user: undefined, headers: {}, method: 'GET' } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        const next = jest.fn();

        await authMiddleware(req, res, next);

        expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', SECRET);

        expect(mockRedisGet).toHaveBeenCalledWith('accessToken:valid-jti');

        expect(next).toHaveBeenCalled();

        expect(req.user).toMatchObject(payload);
    });

    it('should return 401 for a token that is not valid in Redis', async () => {
        const token = jwt.sign({ jti: 'expired-jti' }, SECRET);

        mockRedisGet.mockResolvedValueOnce(null);

        const req = { cookies: { accessToken:token }, headers: {}, method: 'GET' } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        const next = jest.fn();

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'accessToken invalid or expired' });
        expect(next).not.toHaveBeenCalled();
    });


    it('should return 401 for an invalid token signature', async () => {
        const req = { cookies: { accessToken: 'invalid-signature-token' }, headers: {}, method: 'GET' } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        const next = jest.fn();

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', async () => {
        const req = { cookies: {}, headers: {}, method: 'GET' } as any;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        const next = jest.fn();

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        expect(next).not.toHaveBeenCalled();
    });

    afterAll(async () => {
        if (hoardserver) {
            await new Promise<void>((resolve, reject) => {
                hoardserver.close((err:Error) => (err ? reject(err) : resolve()));
            });
        };

        jest.clearAllTimers();
    });
});
