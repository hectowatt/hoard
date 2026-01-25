import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jest } from '@jest/globals';
import { AppDataSource } from "../../dist/DataSource.js";
import { idText, server } from "typescript";

import type NotePassword from "../../entities/NotePassword.js";
import { authMiddleware } from "../../middleware/AuthMiddleware.js";
import type { Request, Response, NextFunction } from "express";

// Redis をモック
jest.unstable_mockModule("ioredis", () => ({
    Redis: jest.fn().mockImplementation(() => ({
        set: jest.fn().mockImplementation(() => Promise.resolve("OK")),
        get: jest.fn().mockImplementation(() => Promise.resolve("valid")),
    })),
}));

// パスワードのモック
const mockPassword = [{ password_id: "1", password_hashed: "hashed_password" }];

// bcrypt のモックを変数化
const mockBcrypt = {
    compare: jest.fn().mockImplementation((password, hashed) => {
        if (password !== null && password === hashed) {
            return Promise.resolve(true);
        } else {
            return Promise.resolve(false);
        }
    }),
    hash: jest.fn().mockImplementation((password, saltRounds) => {
        return Promise.resolve("hashed_" + password);
    }),
};

jest.unstable_mockModule("bcrypt", () => ({
    default: mockBcrypt,
}));


// AuthMiddlewareをモック
jest.unstable_mockModule('../../dist/middleware/AuthMiddleware', () => ({
    authMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }),
}));



// パスワード設定無しの想定
const mockPasswordUndefined = [{ password_id: "", password_hashed: "" }];

// DataSource をモック
const mockRepo = {
    find: jest.fn(() => Promise.resolve(mockPassword)),
    findOneBy: jest.fn(({ password_id }) => {
        if (password_id === mockPassword[0].password_id) {
            return Promise.resolve(mockPassword[0]);
        }
        return Promise.resolve(null);
    }),
    create: jest.fn((data: { password_hashed: string }) => {
        return { id: 2, ...data };
    }),
    save: jest.fn((password: NotePassword) => {
        return Promise.resolve({
            id: password.password_id,
            password_hashed: password.password_hashed
        });
    }),
};

jest.unstable_mockModule("../../dist/DataSource.js", () => ({
    AppDataSource: {
        initialize: jest.fn().mockImplementation(() => Promise.resolve(true)),
        getRepository: jest.fn().mockImplementation(() => mockRepo),
    },
}));

// モックが終わってから import
const { app, hoardserver } = await import("../../dist/server.js");

describe("PasswordRoutes", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // 明示的にモックの実装をリセット
        mockRepo.findOneBy.mockImplementation(({ password_id }) => {
            if (password_id === mockPassword[0].password_id) {
                return Promise.resolve(mockPassword[0]);
            }
            return Promise.resolve(null);
        });

        mockBcrypt.compare.mockImplementation((password, hashed) => {
            return Promise.resolve(password === hashed);
        });
    });

    it("POST /password/compare should return 200 and isMatch: true when passwords match", async () => {
        const response = await request(app)
            .post("/api/password/compare")
            .send({ password_id: "1", passwordString: "hashed_password" });

        expect(response.status).toBe(200);
        expect(response.body.isMatch).toBe(true);
    });

    it("POST /password/compare should return 200 and isMatch: false when passwords do not match", async () => {
        const response = await request(app)
            .post("/api/password/compare")
            .send({ password_id: "1", passwordString: "testpassword" });

        expect(response.status).toBe(200);
        expect(response.body.isMatch).toBe(false);
    });

    it("POST /password/compare should return 400 when passwordString is not provided", async () => {
        const response = await request(app)
            .post("/api/password/compare")
            .send({ password_id: "1" });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Must set password string");
    });

    it("POST /password/compare should return 404 when password is not found", async () => {

        const response = await request(app)
            .post("/api/password/compare")
            .send({ password_id: "999", passwordString: "testpassword" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Password not found");
    });

    it("POST /password/compare should return 500 when an error occurs", async () => {
        mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB save error")));
        const response = await request(app)
            .post("/api/password/compare")
            .send({ password_id: "1", passwordString: "testpassword" });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to fetch notepassword");
    });

    it("POST /password should return 201 and message", async () => {
        const response = await request(app)
            .post("/api/password")
            .send({ passwordString: "test_password" });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("Save password success!");
    });

    it("POST /password and NOT exists passwordstring should return 400 and message", async () => {
        const response = await request(app)
            .post("/api/password")
            .send({ passwordString: "" });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Must set password string");
    });

    it("POST /password and error occured should return 500 and message", async () => {
        mockRepo.save.mockImplementationOnce(() => Promise.reject(new Error("DB save error")));
        const response = await request(app)
            .post("/api/password")
            .send({ passwordString: "testpassword" });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to save password");
    });

    it("GET /password should return 200 and password id", async () => {
        const response = await request(app)
            .get("/api/password");

        expect(response.status).toBe(200);
        expect(response.body.password_id).toBe("1");
    });

    it("GET /password should return 200 and password id", async () => {
        mockRepo.find.mockImplementationOnce(() => Promise.resolve(mockPasswordUndefined));
        const response = await request(app)
            .get("/api/password");

        expect(response.status).toBe(200);
        expect(response.body.password_id).toBe("");
    });

    it("GET /password and error occured should return 500 and message", async () => {
        mockRepo.find.mockImplementationOnce(() => Promise.reject(new Error("DB save error")));
        const response = await request(app)
            .get("/api/password");

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to fetch notepassword");
    });

    it("PUT /password should return 200 and message", async () => {
        const response = await request(app)
            .put("/api/password")
            .send({ password_id: "1", passwordString: "updatedpassword" });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Password updated successfully");
    });

    it("PUT /password with NOT exists password_id should return 404 and message", async () => {
        const response = await request(app)
            .put("/api/password")
            .send({ password_id: "999", passwordString: "updatedpassword" });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Password not found");
    });

    it("PUT /password and error occured should return 404 and message", async () => {
        mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB save error")));
        const response = await request(app)
            .put("/api/password")
            .send({ password_id: "1", passwordString: "updatedpassword" });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to update password");
    });

    it("PUT /password without password_id should return 400 and message", async () => {
        mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB save error")));
        const response = await request(app)
            .put("/api/password")
            .send({ passwordString: "updatedpassword" });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Must set password_id, passwordString");
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
})