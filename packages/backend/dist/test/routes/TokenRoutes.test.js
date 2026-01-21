import request from "supertest";
import { jest } from '@jest/globals';
import { AppDataSource } from "../../dist/DataSource.js";
// Redisのメソッドのモック関数
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();
// ioredis モジュールそのものをモック化
jest.unstable_mockModule("ioredis", () => {
    return {
        Redis: jest.fn().mockImplementation(() => ({
            get: mockRedisGet,
            set: mockRedisSet,
            del: mockRedisDel,
        })),
    };
});
const mockJwtVerify = jest.fn((token, secret) => {
    if (token === 'dummy-valid-token') {
        return { jti: 'valid-jti', id: 'test-user-id', username: 'testuser' };
    }
    throw new Error('Invalid token');
});
// jwt.signのモック関数
const mockJwtSign = jest.fn(() => 'dummy-valid-token');
jest.unstable_mockModule('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        verify: mockJwtVerify,
        sign: mockJwtSign,
    },
    verify: mockJwtVerify,
    sign: mockJwtSign,
}));
const { app, hoardserver } = await import("../../dist/server.js");
describe("Token Routes", () => {
    afterEach(() => {
        // Cookieの値は都度初期化
        if (!global.document) {
            global.document = {};
        }
        Object.defineProperty(global.document, 'cookie', {
            writable: true,
            configurable: true,
            value: '',
        });
    });
    it("POST /token/refresh should return 200 and set new access token cookie", async () => {
        mockRedisGet.mockResolvedValueOnce('valid');
        const res = await request(app)
            .post("/api/token/refresh")
            .set('Cookie', ["refreshToken=dummy-valid-token", 'accessToken=dummy-valid-token']);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.headers["set-cookie"]).toBeDefined();
        expect(res.headers["set-cookie"][0]).toMatch(/accessToken=dummy-valid-token/);
    });
    it("POST /token/refresh with no refresh token should return 401 and message", async () => {
        const res = await request(app)
            .post("/api/token/refresh")
            .set('Cookie', ['accessToken=dummy-valid-token']);
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Refresh token not found");
    });
    it("POST /token/refresh with invalid refresh token should return 401 and message", async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        const res = await request(app)
            .post("/api/token/refresh")
            .set('Cookie', ['refreshToken=dummy-valid-token', 'accessToken=dummy-valid-token']);
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Refresh token invalid or expired");
    });
    it("POST /token/refresh and error occured should return 401 and error", async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        const res = await request(app)
            .post("/api/token/refresh")
            .set('Cookie', ['refreshToken=invalid-token', 'accessToken=dummy-valid-token']);
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Token refresh failed");
    });
    it("POST /token/refresh and redis del error occured should return 500 and error", async () => {
        mockRedisGet.mockResolvedValueOnce('valid');
        mockRedisDel.mockRejectedValueOnce(new Error("Redis del error"));
        const res = await request(app)
            .post("/api/token/refresh")
            .set('Cookie', ['refreshToken=dummy-valid-token', 'accessToken=dummy-valid-token']);
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Old token delete error");
    });
    afterAll(async () => {
        if (hoardserver) {
            await new Promise((resolve, reject) => {
                hoardserver.close((err) => (err ? reject(err) : resolve()));
            });
        }
        ;
        if (AppDataSource.destroy && typeof AppDataSource.destroy === "function") {
            try {
                await AppDataSource.destroy();
            }
            catch (error) {
            }
        }
        ;
        jest.clearAllTimers();
    });
});
//# sourceMappingURL=TokenRoutes.test.js.map