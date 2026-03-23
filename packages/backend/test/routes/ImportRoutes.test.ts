import request from "supertest";
import express from "express";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";
import { jest } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../../DataSource";

// ===== DataSource モック =====
const mockSave = jest.fn(() => {
    return Promise.resolve();
});

const mockRepo = {
    save: mockSave,
};

// AuthMiddlewareをモック
jest.unstable_mockModule('../../middleware/AuthMiddleware', () => ({
  authMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
    next();
  }),
}));

const mockGetRepository = jest.fn(() => mockRepo);

jest.unstable_mockModule("../../DataSource", () => ({
    AppDataSource: {
        getRepository: mockGetRepository,
    },
}));

// ===== テスト対象 import =====
const { app, hoardserver } = await import("../../server");

// ===== ヘルパー: ZIP作成 =====
const createZipBuffer = () => {
    const zip = new AdmZip();

    zip.addFile(
        "labels.csv",
        Buffer.from("id,createdate\n1,1710000000000\n")
    );
    zip.addFile(
        "notes.csv",
        Buffer.from(
            "id,title,content,label_id,is_deleted,is_locked,deletedate,createdate,updatedate\n" +
            "1,test,hello,,false,false,,1710000000000,1710000000000\n"
        )
    );
    zip.addFile(
        "notepassword.csv",
        Buffer.from("id,password\n1,hashed\n")
    );
    zip.addFile(
        "tablenotes.csv",
        Buffer.from(
            "id,title,content,label_id,is_deleted,is_locked,deletedate,createdate,updatedate\n" +
            "1,table,test,,false,false,,1710000000000,1710000000000\n"
        )
    );
    zip.addFile(
        "tablenotecolumns.csv",
        Buffer.from("id,name\n1,col\n")
    );
    zip.addFile(
        "tablenotecells.csv",
        Buffer.from("id,value\n1,cell\n")
    );

    return zip.toBuffer();
};

describe("POST /api/import", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("ZIP をアップロードして正常にインポートできる", async () => {
        const zipBuffer = createZipBuffer();

        const res = await request(app)
            .post("/api/import")
            .attach("file", zipBuffer, {
                filename: "data.zip",
                contentType: "application/zip",
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Import completed" });

        // getRepository は6回
        expect(mockGetRepository).toHaveBeenCalledTimes(6);

        // save が各 CSV 分呼ばれている
        expect(mockSave).toHaveBeenCalledTimes(6);
    });

    it("ファイル未指定の場合 400 を返す", async () => {
        const res = await request(app)
            .post("/api/import");

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "No file uploaded" });
    });

    it("DB 保存中にエラーが発生した場合 500 を返す", async () => {
        mockSave.mockRejectedValueOnce(new Error("DB error"));

        const zipBuffer = createZipBuffer();

        const res = await request(app)
            .post("/api/import")
            .attach("file", zipBuffer, {
                filename: "data.zip",
            });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ message: "Import failed" });
    });

    afterAll(async () => {
        if (hoardserver) {
            await new Promise<void>((resolve, reject) => {
                hoardserver.close((err: Error) => (err ? reject(err) : resolve()));
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
