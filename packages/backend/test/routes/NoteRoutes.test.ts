import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jest } from '@jest/globals';
import { AppDataSource } from "../../dist/DataSource.js";
import { idText, server } from "typescript";

import Label from "../../dist/entities/Label.js";
import Note from "../../dist/entities/Note.js";
import { authMiddleware } from "../../middleware/AuthMiddleware.js";
import type { Request, Response, NextFunction } from "express";

// Redis をモック
jest.unstable_mockModule("ioredis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockImplementation(() => Promise.resolve("OK")),
    get: jest.fn().mockImplementation(() => Promise.resolve("valid")),
  })),
}));

const mockExecute = jest.fn(() => Promise.resolve({ affected: 1 }));
const mockAndWhere = jest.fn(() => ({ execute: mockExecute }));
const mockWhere = jest.fn(() => ({ andWhere: mockAndWhere }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockDelete = jest.fn(() => ({ from: mockFrom }));

// ラベルのモック
const mockLabels = [
  { id: "1", labelname: "work", createdate: new Date(), notes: [] },
  { id: "2", labelname: "study", createdate: new Date(), notes: [] }
]

// ノートのモック
const mockNotes = [
  { id: "1", title: "test title1", content: "test content1", label_id: "1", label: mockLabels[0], is_deleted: false, is_pinned: false, deletedate: null, is_locked: false, createdate: new Date(), updatedate: new Date() },
  { id: "2", title: "test title2", content: "test content2", label_id: "2", label: mockLabels[1], is_deleted: false, is_pinned: false, deletedate: null, is_locked: true, createdate: new Date(), updatedate: new Date() }
]

// 削除済みノートのモック
const mockDeletedNotes = [
  { id: "3", title: "test title3", content: "test content3", label_id: "1", label: mockLabels[0], is_deleted: true, is_pinned: false, deletedate: new Date(), is_locked: false, createdate: new Date(), updatedate: new Date() }
]

// AuthMiddlewareをモック
jest.unstable_mockModule('../../dist/middleware/AuthMiddleware', () => ({
  authMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
    next();
  }),
}));

// DataSource をモック
const mockRepo = {
  find: jest.fn(() => Promise.resolve(mockNotes)),
  findOneBy: jest.fn(({ id }) => {
    if (id === mockNotes[0].id) {
      return Promise.resolve(mockNotes[0]);
    } else if (id === mockNotes[1].id) {
      return Promise.resolve(mockNotes[1]);
    }
    return Promise.resolve(null);
  }),
  create: jest.fn((data: { title: string; content: string; label_id: null; createdate: Date; updatedate: Date; is_locked: boolean; is_pinned: boolean }) => {
    return { id: 3, ...data };
  }),
  save: jest.fn((note: Note) => {
    return Promise.resolve({
      id: note.id,
      title: note.title,
      content: note.content,
      label_id: note.label_id,
      is_locked: note.is_locked,
      is_pinned: note.is_pinned,
      createdate: new Date(),
      updatedate: new Date(),
      is_deleted: false,
      deletedate: null
    });
  }),
  remove: jest.fn((note: Note) => Promise.resolve(note)),
  createQueryBuilder: jest.fn(() => ({
    delete: mockDelete,
    update: jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn(() => ({ execute: mockExecute })) })) })),
  }))
};

jest.unstable_mockModule("../../dist/DataSource.js", () => ({
  AppDataSource: {
    initialize: jest.fn().mockImplementation(() => Promise.resolve(true)),
    getRepository: jest.fn().mockImplementation(() => mockRepo),
  },
}));

// モックが終わってから import
const { app, hoardserver } = await import("../../dist/server.js");

describe("NoteRoutes", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /notes should return 200 and all notes", async () => {
    const response = await request(app).get("/api/notes");

    expect(response.status).toBe(200);
    expect(response.body[0].id).toBe("1");
    expect(response.body[0].title).toBe("test title1");
    expect(response.body[0].content).toBe("test content1");
    expect(response.body[0].label_id).toBe("1");
    expect(response.body[0].is_deleted).toBe(false);
    expect(response.body[0].deletedate).toBe(null);
    expect(response.body[0].is_locked).toBe(false);
    expect(response.body[0].is_pinned).toBe(false);
    expect(response.body[0].label.id).toBe("1");

    expect(response.body[1].id).toBe("2");
    expect(response.body[1].title).toBe("test title2");
    expect(response.body[1].content).toBe("");
    expect(response.body[1].label_id).toBe("2");
    expect(response.body[1].is_deleted).toBe(false);
    expect(response.body[1].deletedate).toBe(null);
    expect(response.body[1].is_locked).toBe(true);
    expect(response.body[0].is_pinned).toBe(false);
    expect(response.body[1].label.id).toBe("2");
  });

  it("GET /notes and Error occured should return 500 and error message", async () => {
    mockRepo.find.mockImplementationOnce(() => Promise.reject(new Error("DB find error")));

    const response = await request(app).get("/api/notes");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch notes");
  })

  it("POST /notes should return 201 and message, registered note", async () => {
    const res = await request(app)
      .post("/api/notes")
      .send({ title: "test title3", content: "test content3", label: "1", isLocked: false, isPinned: false });

    expect(res.status).toBe(201);

    expect(res.body.message).toBe("save note success!");
    expect(res.body.note).toHaveProperty("id");
    expect(res.body.note.title).toBe("test title3");
    expect(res.body.note.content).toBe("test content3");
    expect(res.body.note.label_id).toBe("1");
    expect(res.body.note.is_locked).toBe(false);
    expect(res.body.note.is_pinned).toBe(false);
    expect(res.body.note.is_deleted).toBe(false);
    expect(res.body.note.deletedate).toBe(null);
    expect(res.body.note).toHaveProperty("createdate");
    expect(res.body.note).toHaveProperty("updatedate");
  });

  it("POST /notes and Error occured should return 500 and message", async () => {
    mockRepo.save.mockImplementationOnce(() => Promise.reject(new Error("DB save error")));

    const response = await request(app)
      .post("/api/notes")
      .send({ title: "test title3", content: "test content3", label: "1", isLocked: false, isPinned: false });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to save note");
  });

  it("POST /notes without title should return 400 and message", async () => {
    const response = await request(app)
      .post("/api/notes")
      .send({ label: "1", isLocked: false });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Must set title or content");
  });

  it("PUT /notes should return 200 and message, updated note", async () => {
    const response = await request(app)
      .put("/api/notes")
      .send({ id: "1", title: "updated title", content: "updated content", label: "2", isLocked: true, isPinned: false });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("update note success!");
    expect(response.body.note.id).toBe("1");
    expect(response.body.note.title).toBe("updated title");
    expect(response.body.note.content).toBe("updated content");
    expect(response.body.note.label_id).toBe("2");
    expect(response.body.note.is_locked).toBe(true);
    expect(response.body.note.is_pinned).toBe(false);
    expect(response.body.note).toHaveProperty("createdate");
    expect(response.body.note).toHaveProperty("updatedate");
  });

  it("PUT /notes with invalid id should return 404 and message", async () => {
    const response = await request(app)
      .put("/api/notes")
      .send({ id: "999", title: "updated title", content: "updated content", label: "2", isLocked: true, isPinned: false });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Can't find note");
  });

    it("PUT /notes without id should return 400 and message", async () => {
    const response = await request(app)
      .put("/api/notes")
      .send({ title: "updated title", content: "updated content", label: "2", isLocked: true, isPinned: false });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Must set title or content and must set id");
  });

  it("PUT /notes and Error occured should return 500 and message", async () => {
    mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB findOneBy error")));

    const response = await request(app)
      .put("/api/notes")
      .send({ id: "1", title: "updated title", content: "updated content", label: "2", isLocked: true, isPinned: false });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("failed to update notes");
  });

  it("DELETE /notes should return 200 and message", async () => {
    const response = await request(app)
      .delete("/api/notes/1");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Note moved to trash successfully");
  });

  it("DELETE /notes with NOT exists note should return 404 and message", async () => {
    const response = await request(app)
      .delete("/api/notes/999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Note not found");
  });

  it("DELETE /notes and Error occured should return 500 and message", async () => {
    mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB findOneBy error")));

    const response = await request(app)
      .delete("/api/notes/1");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to move note to trash");
  });

  it("PUT /notes/pin should return 200 and message", async () => {
    const response = await request(app)
      .put("/api/notes/pin")
      .send({ id: "1", isPinned: false });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Pin note success!");
  });

  it("PUT /notes/pin with not exists note should return 404 and message", async () => {
     mockExecute.mockResolvedValueOnce({ affected: 0 }); 
     const response = await request(app)
      .put("/api/notes/pin")
      .send({ id: "999-999", isPinned: false });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Can't find Note");
  });

    it("PUT /notes/pin with no id should return 400 and message", async () => {
     const response = await request(app)
      .put("/api/notes/pin")
      .send({ isPinned: false });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Must set id and pin status");
  });

   it("PUT /notes/pin and error occured should return 500 and message", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB update error"));
     const response = await request(app)
      .put("/api/notes/pin")
      .send({ id: "1", isPinned: false });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to pin notes");
  });

  /************ TrashNote ************/

  it("GET /notes/trash should return deleted notes", async () => {
    mockRepo.find.mockImplementationOnce(() => Promise.resolve(mockDeletedNotes));
    const response = await request(app)
      .get("/api/notes/trash");

    expect(response.status).toBe(200);
    expect(response.body[0].id).toBe("3");
    expect(response.body[0].title).toBe("test title3");
    expect(response.body[0].content).toBe("test content3");
    expect(response.body[0].label_id).toBe("1");
    expect(response.body[0].is_locked).toBe(false);
    expect(response.body[0].is_pinned).toBe(false);
    expect(response.body[0].is_deleted).toBe(true);
    expect(response.body[0]).toHaveProperty("deletedate");
    expect(response.body[0]).toHaveProperty("createdate");
    expect(response.body[0]).toHaveProperty("updatedate");
  });

  it("GET /notes/trash and error occured should return 500 and message", async () => {
    mockRepo.find.mockImplementationOnce(() => Promise.reject(new Error("DB find error")));
    const response = await request(app)
      .get("/api/notes/trash");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch trash notes");
  });

  it("DELETE /notes/trash:2 should return 200 and message", async () => {
    mockRepo.remove.mockImplementationOnce(() => Promise.resolve());
    const response = await request(app)
      .delete("/api/notes/trash/2");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Note deleted successfully");
  });

  it("DELETE /notes/trash with NOT exist note should return 404 and message", async () => {
    const response = await request(app)
      .delete("/api/notes/trash/999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("TrashNote not found");
  });

  it("DELETE /notes/trash:2 and error occured should return 500 and message", async () => {
    mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB find error")));
    const response = await request(app)
      .delete("/api/notes/trash/2");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to delete note");
  });

  it("PUT /notes/trash should return 200 and message", async () => {
    mockRepo.findOneBy.mockImplementationOnce(() => Promise.resolve(mockDeletedNotes[0]));
    const response = await request(app)
      .put("/api/notes/trash/3");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Restore note success!");
    expect(response.body.note.id).toBe("3");
    expect(response.body.note.is_deleted).toBe(false);
    expect(response.body.note.deletedate).toBe(null);
  });

  it("PUT /notes/trash with NOT exist note should return 404 and message", async () => {
    const response = await request(app)
      .put("/api/notes/trash/999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("TrashNote not found");
  });

  it("PUT /notes/trash and error occured should return 500 and message", async () => {
    mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB find error")));
    const response = await request(app)
      .put("/api/notes/trash/3");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to restore notes");
  });

  it("PUT /notes/lock should return 200 and message", async () => {
    const response = await request(app)
      .put("/api/notes/lock")
      .send({ id: "1", isLocked: true });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Update lock state success!");
    expect(response.body.note.id).toBe("1");
    expect(response.body.note.is_locked).toBe(true);
  });

    it("PUT /notes/lock without id should return 200 and message", async () => {
    const response = await request(app)
      .put("/api/notes/lock")
      .send({  isLocked: true });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Must set id or isLocked");
  });

  it("PUT /notes/lock with NOT exist note should return 404 and message", async () => {
    const response = await request(app)
      .put("/api/notes/lock")
      .send({ id: "999", isLocked: true });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Can't find note");
  });

  it("PUT /notes/lock and error occured should return 500 and message", async () => {
    mockRepo.findOneBy.mockImplementationOnce(() => Promise.reject(new Error("DB find error")));
    const response = await request(app)
      .put("/api/notes/lock")
      .send({ id: "1", isLocked: true });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to update lock state");
  });

  it("DELETE /notes/trash should return 200 and message", async () => {

    const response = await request(app)
      .delete("/api/notes/trash");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("All TrashNote deleted successfully");
  });

  it("DELETE /notes/trash and error occured should return 500 and message", async () => {
    const dbError = new Error("DB Deletion Failed during execution");
    mockExecute.mockRejectedValue(dbError);

    const response = await request(app)
      .delete("/api/notes/trash");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to delete trashnote");
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