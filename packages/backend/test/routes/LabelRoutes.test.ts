import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jest } from '@jest/globals';
import { AppDataSource } from "../../DataSource.ts";
import { idText, server } from "typescript";

import Label from "../../entities/Label.ts";
import { authMiddleware } from "../../middleware/AuthMiddleware.ts";
import type { Request, Response, NextFunction } from "express";

// Redis をモック
jest.unstable_mockModule("ioredis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockImplementation(() => Promise.resolve("OK")),
    get: jest.fn().mockImplementation(() => Promise.resolve("valid")),
  })),
}));

// ラベルのモック
const mockLabels = [
  { id: "1", labelname: "work", createdate: new Date(), notes: [] },
  { id: "2", labelname: "study", createdate: new Date(), notes: [] }
]

// AuthMiddlewareをモック
jest.unstable_mockModule('../../middleware/AuthMiddleware', () => ({
  authMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
    next();
  }),
}));

// DataSource をモック
const mockRepo = {
  find: jest.fn(() => Promise.resolve(mockLabels)),
  findOneBy: jest.fn(({ id: id }) => {
    console.log("mockRepo.findOneBy called with id:", id);
    const label_id = id as string;
    if (label_id === mockLabels[0].id) {
      return Promise.resolve(mockLabels[0]);
    } else if (label_id === mockLabels[1].id) {
      return Promise.resolve(mockLabels[1]);
    }
    return Promise.resolve(null);
  }),
  create: jest.fn((data: { labelname: string; createdate: Date }) => {
    return { id: 3, ...data };
  }),
  save: jest.fn((label: Label) => {
    if (label.labelname === "work" || label.labelname === "study") {
      const error = new Error("Label name must be unique");
      // PostgreSQLの一意制約違反コードを付与
      (error as any).code = '23505';
      return Promise.reject(error);
    } else {
      return Promise.resolve({
        id: 3,
        labelname: label.labelname,
        createdate: new Date(),
      });
    }
  }),
  remove: jest.fn((label: Label) => Promise.resolve(label)),
};

jest.unstable_mockModule("../../DataSource.ts", () => ({
  AppDataSource: {
    initialize: jest.fn().mockImplementation(() => Promise.resolve(true)),
    getRepository: jest.fn().mockImplementation(() => mockRepo),
  },
}));

// モックが終わってから import
const { app, hoardserver } = await import("../../server.ts");

describe("/labels", () => {
  it("POST /labels should return 201 and message, registered label", async () => {
    const res = await request(app)
      .post("/api/labels")
      .send({ labelName: "test" });

    expect(res.status).toBe(201);

    expect(res.body.message).toBe("Save label success!");
    expect(res.body.label).toHaveProperty("id");
    expect(res.body.label.labelname).toBe("test");
  });

  it("POST /labels without labelname shourld return 400 and message", async () => {
    const res = await request(app)
      .post("/api/labels")
      .send({ labelName: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Must set labelname");
  });

  it("POST /labels and Error occured should return 500 and message", async () => {
    mockRepo.save.mockImplementationOnce(() => Promise.reject(new Error("DB save error")));


    const res = await request(app)
      .post("/api/labels")
      .send({ labelName: "test" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to save label");
  });

  it("POST /labels with duplicate labelname should return 400 and message", async () => {
    const res = await request(app)
      .post("/api/labels")
      .send({ labelName: "work" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Label name must be unique");
  });

  it("GET /labels should return 200 and all labels", async () => {
    const res = await request(app)
      .get("/api/labels");

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe("1");
    expect(res.body[1].id).toBe("2");
    expect(res.body[0].labelname).toBe("work");
    expect(res.body[1].labelname).toBe("study");
  });

  it("GET /labels and Error occured should return 500 and message", async () => {
    mockRepo.find.mockImplementationOnce(() => Promise.reject(new Error("DB find error")));

    const res = await request(app)
      .get("/api/labels");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch labels");
  })

  it("DELETE /labels should return 200 and message", async () => {
    const res = await request(app)
      .delete("/api/labels/1");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Label deleted successfully");
  });

  it("DELETE /labels with NOT exists label should return 404 and message", async () => {
    const res = await request(app)
      .delete("/api/labels/3");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Label not found");
  });

  it("DELETE /labels and Error occured should return 500 and message", async () => {
    mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB findOneBy error")));

    const res = await request(app)
      .delete("/api/labels/1");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to delete label");
  })

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
