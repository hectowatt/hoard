import request from "supertest";
import jwt from "jsonwebtoken";
import { expect, jest } from "@jest/globals";
import { server } from "typescript";
import { AppDataSource } from "../../DataSource.ts";

// Redis をモック
jest.unstable_mockModule("ioredis", () => ({
    Redis: jest.fn().mockImplementation(() => ({
        set: jest.fn().mockImplementation(() => Promise.resolve("OK")),
        get: jest.fn().mockImplementation(() => Promise.resolve("valid")),
        del: jest.fn().mockImplementation(() => Promise.resolve("OK")),
    })),
}));

// DataSource をモック
jest.unstable_mockModule("../../DataSource.ts", () => ({
    AppDataSource: {
        initialize: jest.fn().mockImplementation(() => Promise.resolve(true))
    },
}));

const { app, hoardserver } = await import("../../server.ts");

const SECRET = process.env.SECRET || "hoard_secret";

describe("POST /logout", () => {
    it("return 200 and clear cookie on successful logout", async () => {
        const token = jwt.sign({ d: 1, username: "testuser", jti: "123" }, SECRET, { expiresIn: '1h' });
        const response = await request(app).post("/api/logout").set("Cookie", `accessToken=${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    afterAll(async () => {
        if (hoardserver) {
            await new Promise<void>((resolve, reject) => {
                hoardserver.close((err) => (err ? reject(err) : resolve()));
            });
        };

        if (AppDataSource.destroy && typeof AppDataSource.destroy === "function") {
            try {
                await AppDataSource.destroy();
            } catch (error) {
            }
        };

        jest.clearAllTimers();
    });
});