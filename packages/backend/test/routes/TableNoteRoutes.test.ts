import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jest } from '@jest/globals';
import { idText, server } from "typescript";

import Label from "../../dist/entities/Label.js";
import type TableNote from "../../entities/TableNote.js";
import type TableNoteColumn from "../../entities/TableNoteColumn.js";
import TableNoteCell from "../../entities/TableNoteCell.js";
import type { Request, Response, NextFunction } from "express";
import { createQueryBuilder, EntityManager } from "typeorm";

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
const mockLabels: Label[] = [
    { id: "1", labelname: "work", createdate: new Date(), notes: [] },
    { id: "2", labelname: "study", createdate: new Date(), notes: [] }
];

// テーブルノートのモック
const mockTableNotes: TableNote[] = [
    { id: "1", title: "test title1", label_id: "1", label: mockLabels[0], is_deleted: false, deletedate: null, is_locked: false, is_pinned: false, createdate: new Date(), updatedate: new Date() },
    { id: "2", title: "test title2", label_id: "2", label: mockLabels[1], is_deleted: false, deletedate: null, is_locked: true, is_pinned: false, createdate: new Date(), updatedate: new Date() }
];

// テーブルノートのカラムのモック
const mockTableNoteColumns: TableNoteColumn[] = [
    { id: "1", name: "test column1", order: 1, table_note_id: mockTableNotes[0].id, tableNote: mockTableNotes[0] },
    { id: "2", name: "test column2", order: 2, table_note_id: mockTableNotes[0].id, tableNote: mockTableNotes[0] },
    { id: "3", name: "test column3", order: 1, table_note_id: mockTableNotes[1].id, tableNote: mockTableNotes[1] },
];

// テーブルノートのセルのモック
const mockTableNoteCells: TableNoteCell[] = [
    { id: "1", row_index: 0, value: "test cell1", table_note_id: mockTableNotes[0].id, column_id: mockTableNoteColumns[0].id, tableNote: mockTableNotes[0], column: mockTableNoteColumns[0] },
    { id: "2", row_index: 0, value: "test cell2", table_note_id: mockTableNotes[0].id, column_id: mockTableNoteColumns[1].id, tableNote: mockTableNotes[0], column: mockTableNoteColumns[1] },
    { id: "3", row_index: 0, value: "test cell3", table_note_id: mockTableNotes[1].id, column_id: mockTableNoteColumns[2].id, tableNote: mockTableNotes[1], column: mockTableNoteColumns[2] },
    { id: "4", row_index: 1, value: "test cell4", table_note_id: mockTableNotes[1].id, column_id: mockTableNoteColumns[2].id, tableNote: mockTableNotes[1], column: mockTableNoteColumns[2] },
];



// 削除済みノートのモック
const mockDeletedTableNotes = [
    { id: "3", title: "test title3", label_id: "1", label: mockLabels[0], is_deleted: true, deletedate: new Date(), is_locked: false, is_pinned: false, createdate: new Date(), updatedate: new Date() }
];

// 削除済みテーブルノートのカラムのモック
const mockDeletedTableNoteColumns: TableNoteColumn[] = [
    { id: "1", name: "test column1", order: 1, table_note_id: mockTableNotes[0].id, tableNote: mockTableNotes[0] },
    { id: "2", name: "test column2", order: 2, table_note_id: mockTableNotes[0].id, tableNote: mockTableNotes[0] },
];

// 削除済みテーブルノートのセルのモック
const mockDeletedTableNoteCells: TableNoteCell[] = [
    { id: "1", row_index: 0, value: "test cell1", table_note_id: mockTableNotes[0].id, column_id: mockTableNoteColumns[0].id, tableNote: mockTableNotes[0], column: mockTableNoteColumns[0] },
    { id: "2", row_index: 0, value: "test cell2", table_note_id: mockTableNotes[0].id, column_id: mockTableNoteColumns[1].id, tableNote: mockTableNotes[0], column: mockTableNoteColumns[1] },
];

// AuthMiddlewareをモック
jest.unstable_mockModule('../../dist/middleware/AuthMiddleware', () => ({
    authMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }),
}));

// TableNoteのリポジトリをモック
const mockRepoTableNote = {
    find: jest.fn(() => Promise.resolve(mockTableNotes)),
    findOneBy: jest.fn(({ id }) => {
        if (id === mockTableNotes[0].id) {
            return Promise.resolve(mockTableNotes[0]);
        } else if (id === mockTableNotes[1].id) {
            return Promise.resolve(mockTableNotes[1]);
        }
        return Promise.resolve(null);
    }),
    create: jest.fn((data: { title: string; label_id: null; createdate: Date; updatedate: Date; is_locked: boolean; is_pinned: boolean }) => {
        return { id: 3, ...data };
    }),
    save: jest.fn((tableNote: TableNote) => {
        return Promise.resolve({
            id: tableNote.id,
            title: tableNote.title,
            label_id: tableNote.label_id,
            is_locked: tableNote.is_locked,
            is_pinned: tableNote.is_pinned,
            createdate: new Date(),
            updatedate: new Date(),
            is_deleted: false,
            deletedate: null
        });
    }),
    remove: jest.fn((tableNote: TableNote) => Promise.resolve(tableNote)),
    createQueryBuilder: jest.fn(() => ({
        delete: mockDelete,
        update: jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn(() => ({ execute: mockExecute })) })) })),
    }))
};

// TableNoteColumnのリポジトリをモック
const mockRepoTableNoteColumn = {
    find: jest.fn((options?: any) => {
        if (options?.where?.table_note_id === "1") {
            return Promise.resolve([mockTableNoteColumns[0], mockTableNoteColumns[1]]);
        }
        if (options?.where?.table_note_id === "2") {
            return Promise.resolve([
                mockTableNoteColumns[2]
            ]);
        }
        return Promise.resolve([]);
    }),
    findOneBy: jest.fn(({ id }) => {
        if (id === mockTableNoteColumns[0].id) {
            return Promise.resolve(mockTableNoteColumns[0]);
        } else if (id === mockTableNoteColumns[1].id) {
            return Promise.resolve(mockTableNoteColumns[1]);
        } else if (id === mockTableNoteColumns[2].id) {
            return Promise.resolve(mockTableNoteColumns[2]);
        }
        return Promise.resolve(null);
    }),
    create: jest.fn((data: { name: string; order: number; }) => {
        return { id: 3, ...data };
    }),
    save: jest.fn((tableNoteColumn: TableNoteColumn) => {
        return Promise.resolve({
            id: tableNoteColumn.id,
            name: tableNoteColumn.name,
            order: tableNoteColumn.order,
            tableNote: tableNoteColumn.tableNote,
        });
    }),
    remove: jest.fn((tableNoteColumn: TableNoteColumn) => Promise.resolve(tableNoteColumn)),
    delete: jest.fn((tableNoteColumn: TableNoteColumn) => Promise.resolve(tableNoteColumn))
};

// TableNoteCellのリポジトリをモック
const mockRepoTableNoteCell = {
    find: jest.fn((options?: any) => {
        const noteId = options?.where?.table_note_id;
        if (noteId) {
            const filteredCells = mockTableNoteCells.filter(
                cell => cell.table_note_id === noteId
            );
            return Promise.resolve(
                filteredCells.map(cell => ({
                    ...cell,
                    column: mockTableNoteColumns.find(col => col.id === cell.column_id)
                }))
            );
        }

        // 検索条件がない場合（本来GET /tablenotesでは通らないはず）
        return Promise.resolve(mockTableNoteCells);
    }),
    findOneBy: jest.fn(({ id }) => {
        if (id === mockTableNoteCells[0][0].id) {
            return Promise.resolve(mockTableNoteCells[0]);
        } else if (id === mockTableNoteCells[0][1].id) {
            return Promise.resolve(mockTableNoteCells[1]);
        } else if (id === mockTableNoteCells[1][0].id) {
            return Promise.resolve(mockTableNoteCells[2]);
        }
        return Promise.resolve(null);
    }),
    create: jest.fn((data: { row_index: number; value: string }) => {
        return { id: 3, ...data };
    }),
    save: jest.fn((tableNoteCell: TableNoteCell) => {
        return Promise.resolve({
            id: tableNoteCell.id,
            row_index: tableNoteCell.row_index,
            value: tableNoteCell.value,
            tableNote: tableNoteCell.tableNote,
            column: tableNoteCell.column,
        });
    }),
    remove: jest.fn((tableNoteCell: TableNoteCell) => Promise.resolve(tableNoteCell)),
    delete: jest.fn((tableNoteCell: TableNoteCell) => Promise.resolve(tableNoteCell))
};

const mockGetRepository = jest.fn((entity: { name: string }) => {
    console.log('getRepository called with:', entity?.name);
    // コンストラクタ名や静的プロパティで判定
    const entityName = entity.name;
    if (entityName === 'TableNote') return mockRepoTableNote;
    if (entityName === 'TableNoteColumn') return mockRepoTableNoteColumn;
    if (entityName === 'TableNoteCell') return mockRepoTableNoteCell;
    // デフォルトのフォールバック
    return {};
});

const mockTransaction = jest.fn(async (callback: (entityManager: EntityManager) => Promise<void>) => {
    const mockEntityManager = {
        getRepository: mockGetRepository,
    };
    await callback(mockEntityManager as unknown as EntityManager);
});

jest.unstable_mockModule("../../dist/DataSource.js", () => ({
    AppDataSource: {
        initialize: jest.fn<() => Promise<any>>().mockResolvedValue(true),
        getRepository: mockGetRepository,
        transaction: mockTransaction,
        destroy: jest.fn<() => Promise<any>>().mockResolvedValue(true),
    },
}));

// モックが終わってから import
const { app, hoardserver } = await import("../../dist/server.js");
const AppDataSource = await import("../../dist/DataSource.js");

describe("TableNoteRoutes", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("PUT /tablenotes/lock and error occured should return 500 and message", async () => {

        const dbError = new Error("DB save error!");
        mockRepoTableNote.save.mockRejectedValueOnce(dbError);

        const response = await request(app)
            .put("/api/tablenotes/lock")
            .send({ id: "2", isLocked: true });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to update lock state");
    });


    it("POST /tablenotes should return 201 and message", async () => {
        const response = await request(app)
            .post("/api/tablenotes")
            .send({ title: "test title", columns: mockTableNoteColumns, rowCells: mockTableNoteCells, label_id: mockLabels[0].id, is_locked: false, is_pinned: false });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("Save TableNote success!");

        expect(response.body.tableNote).toHaveProperty("id");
        expect(response.body.tableNote.title).toBe("test title");
        expect(response.body.tableNote.label_id).toBe(mockLabels[0].id);
        expect(response.body.tableNote.is_locked).toBe(false);
        expect(response.body.tableNote.is_pinned).toBe(false);
        expect(response.body.tableNote).toHaveProperty("createdate");
        expect(response.body.tableNote).toHaveProperty("updatedate");
    });

    it("POST /tablenotes and error occured should return 500 and message", async () => {
        mockRepoTableNote.save.mockRejectedValueOnce(() => Promise.reject(new Error("DB find error")));
        const response = await request(app)
            .post("/api/tablenotes")
            .send({ title: "test title", columns: mockTableNoteColumns, rowCells: mockTableNoteCells, label_id: mockLabels[0].id, is_locked: false, is_pinned: false });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to save TableNote");
    });

    it("POST /tablenotes with NO columns should return 400 and message", async () => {
        const response = await request(app)
            .post("/api/tablenotes")
            .send({ title: "", columns: null, rowCells: mockTableNoteCells, label_id: mockLabels[0].id, is_locked: false, is_pinned: false });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Must set tablenote columns, rows");
    });

    it("GET /tablenotes should return 200 and message", async () => {
        const response = await request(app)
            .get("/api/tablenotes");

        expect(response.status).toBe(200);
        expect(response.body[0].id).toBe("1");
        expect(response.body[0].title).toBe("test title1");
        expect(response.body[0].label_id).toBe("1");
        expect(response.body[0].is_locked).toBe(false);
        expect(response.body[0].is_pinned).toBe(false);
        expect(response.body[0]).toHaveProperty("createdate");
        expect(response.body[0]).toHaveProperty("updatedate");
        expect(response.body[0].columns[0].id).toBe("1");
        expect(response.body[0].columns[0].name).toBe("test column1");
        expect(response.body[0].columns[0].order).toBe(1);
        expect(response.body[0].columns[1].id).toBe("2");
        expect(response.body[0].columns[1].name).toBe("test column2");
        expect(response.body[0].columns[1].order).toBe(2);
        expect(response.body[0].rowCells[0][0].id).toBe("1");
        expect(response.body[0].rowCells[0][0].rowIndex).toBe(0);
        expect(response.body[0].rowCells[0][0].value).toBe("test cell1");
        expect(response.body[0].rowCells[0][0]).toHaveProperty("columnId");
        expect(response.body[0].rowCells[0][1].id).toBe("2");
        expect(response.body[0].rowCells[0][1].rowIndex).toBe(0);
        expect(response.body[0].rowCells[0][1].value).toBe("test cell2");
        expect(response.body[0].rowCells[0][1]).toHaveProperty("columnId");

        expect(response.body[1].id).toBe("2");
        expect(response.body[1].title).toBe("test title2");
        expect(response.body[1].label_id).toBe("2");
        expect(response.body[1].is_locked).toBe(true);
        expect(response.body[1].is_pinned).toBe(false);
        expect(response.body[1]).toHaveProperty("createdate");
        expect(response.body[1]).toHaveProperty("updatedate");
        expect(response.body[1].columns[0].id).not.toBe("3");
        expect(response.body[1].columns[0].name).toBe("secret");
        expect(response.body[1].columns[0].order).toBe(1);
        expect(response.body[1].rowCells[0][0].id).not.toBe("3");
        expect(response.body[1].rowCells[0][0].rowIndex).toBe(0);
        expect(response.body[1].rowCells[0][0].value).toBe("secret");
    });

    it("GET /tablenotes and error ocuured should return 200 and message", async () => {
        mockRepoTableNote.find.mockRejectedValueOnce(() => Promise.reject(new Error("DB find error!")));
        const response = await request(app)
            .get("/api/tablenotes");

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to fetch TableNote");
    });

    it("PUT /tablenotes should return 200 and message", async () => {
        const response = await request(app)
            .put("/api/tablenotes")
            .send({ id: "1", title: "updated title", columns: [mockTableNoteColumns[0]], rowCells: [[]], label: mockLabels[0], is_locked: false, is_pinned: false });

        expect(response.status).toBe(200);
        expect(response.body.tableNote.id).toBe("1");
        expect(response.body.tableNote.title).toBe("updated title");
        expect(response.body.tableNote.is_locked).toBe(false);
        expect(response.body.tableNote.is_pinned).toBe(false);
        expect(response.body.tableNote).toHaveProperty("createdate");
        expect(response.body.tableNote).toHaveProperty("updatedate");
        expect(response.body.tableNote.columns[0].id).toBe("1");
        expect(response.body.tableNote.columns[0].name).toBe("test column1");
        expect(response.body.tableNote.columns[0].order).toBe(1);
        expect(response.body.tableNote).toHaveProperty("rowCells");
    });

    it("PUT /tablenotes and cannot find tablenote should return 404 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(() => Promise.resolve(null));
        const response = await request(app)
            .put("/api/tablenotes")
            .send({ id: "1", title: "updated title", columns: [mockTableNoteColumns[0]], rowCells: [[]], label: mockLabels[0], is_locked: false, is_pinned: false });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("tablenote not found");
    });

    it("PUT /tablenotes and error occured should return 500 and message", async () => {
        mockRepoTableNote.findOneBy.mockRejectedValueOnce(() => Promise.reject(new Error("DB find error!")));
        const response = await request(app)
            .put("/api/tablenotes")
            .send({ id: "1", title: "updated title", columns: [mockTableNoteColumns[0]], rowCells: [[]], label: mockLabels[0], is_locked: false, is_pinned: false });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to update TableNote");
    });

    it("DELETE /tablenotes should return 200 and message", async () => {
        const response = await request(app)
            .delete("/api/tablenotes/1");

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("TableNote moved to trash successfully");
    });

    it("DELETE /tablenotes and cannot find tablenote should return 404 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(() => Promise.resolve(null));
        const response = await request(app)
            .delete("/api/tablenotes/1");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("tablenote not found");
    });

    it("DELETE /tablenotes and error occured should return 500 and message", async () => {
        mockRepoTableNote.findOneBy.mockRejectedValue(() => Promise.reject(new Error("DB find error!")));
        const response = await request(app)
            .delete("/api/tablenotes/1")

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed moved to trash");
    });


      it("PUT /tablenotes/pin should return 200 and message", async () => {
        const response = await request(app)
          .put("/api/tablenotes/pin")
          .send({ id: "1", isPinned: false });
    
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Pin TableNote success!");
      });
    
      it("PUT /tablenotes/pin with not exists note should return 404 and message", async () => {
         mockExecute.mockResolvedValueOnce({ affected: 0 }); 
         const response = await request(app)
          .put("/api/tablenotes/pin")
          .send({ id: "999-999", isPinned: false });
    
        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Can't find TableNote");
      });
    
        it("PUT /tablenotes/pin with no id should return 400 and message", async () => {
         const response = await request(app)
          .put("/api/tablenotes/pin")
          .send({ isPinned: false });
    
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Must set id and pin status");
      });
    
       it("PUT /tablenotes/pin and error occured should return 500 and message", async () => {
        mockExecute.mockRejectedValueOnce(new Error("DB update error"));
         const response = await request(app)
          .put("/api/tablenotes/pin")
          .send({ id: "1", isPinned: false });
    
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to pin TableNote");
      });

    /************ TrashNote ************/

    it("GET /tablenotes/trash should return 200 and trash tablenotes", async () => {
        mockRepoTableNote.find.mockImplementationOnce(() => Promise.resolve(mockDeletedTableNotes));
        const response = await request(app)
            .get("/api/tablenotes/trash");

        console.log(response.body);

        expect(response.status).toBe(200);
        expect(response.body[0].id).toBe("3");
        expect(response.body[0].title).toBe("test title3");
        expect(response.body[0].label_id).toBe("1");
        expect(response.body[0].is_locked).toBe(false);
        expect(response.body[0].is_pinned).toBe(false);
        expect(response.body[0]).toHaveProperty("createdate");
        expect(response.body[0]).toHaveProperty("updatedate");
    });

    it("GET /tablenotes/trash and error occured should return 200 and trash tablenotes", async () => {
        mockRepoTableNote.find.mockRejectedValueOnce(() => Promise.reject(new Error("DB find error!")));

        const response = await request(app)
            .get("/api/tablenotes/trash");

        console.log(response.body);

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to fetch trash TableNotes");
    });

    it("DELETE /tablenotes/trash should return 200 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(() => Promise.resolve(mockDeletedTableNotes));

        const response = await request(app)
            .delete("/api/tablenotes/trash/3");

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("TableNote deleted successfully");
    });

    it("DELETE /tablenotes/trash with NOT exists id should return 200 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(({ id }) => {
            if (id === 3) {
                return Promise.resolve(mockDeletedTableNotes);
            } else {
                return Promise.resolve(null);
            }
        });

        const response = await request(app)
            .delete("/api/tablenotes/trash/999");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("TableNotes not found");
    });

    it("DELETE /tablenotes/trash and error occured should return 500 and message", async () => {
        mockRepoTableNote.findOneBy.mockRejectedValueOnce(() => Promise.reject(new Error("DB find error!")));

        const response = await request(app)
            .delete("/api/tablenotes/trash/3");

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to delete TableNote");
    });

    it("PUT /tablenotes/trash should return 200 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(() => Promise.resolve(mockDeletedTableNotes));

        const response = await request(app)
            .put("/api/tablenotes/trash/3")

        console.log("response body:", response.body)
        expect(response.status).toBe(200);
        expect(response.body.tablenote.is_deleted).toBe(false);
        expect(response.body.tablenote).toHaveProperty("createdate");
        expect(response.body.tablenote).toHaveProperty("updatedate");
        expect(response.body.tablenote.deletedate).toBe(null);
    });

    it("PUT /tablenotes/trash with NOT exists id should return 200 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(({ id }) => {
            if (id === 3) {
                return Promise.resolve(mockDeletedTableNotes);
            } else {
                return Promise.resolve(null);
            }
        });

        const response = await request(app)
            .put("/api/tablenotes/trash/999")

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Can't find TableNote");
    });

    it("PUT /tablenotes/trash and error occured should return 500 and message", async () => {
        mockRepoTableNote.findOneBy.mockRejectedValueOnce(() => Promise.reject(new Error("DB find error!")));

        const response = await request(app)
            .put("/api/tablenotes/trash/3")

        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to restore TableNote");
    });

    it("PUT /tablenotes/lock should return 200 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(() => Promise.resolve(mockDeletedTableNotes));

        const response = await request(app)
            .put("/api/tablenotes/lock")
            .send({ id: "3", isLocked: true });

        console.log("response.body.tablenote:", response.body.tablenote);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Update lock state success!");
        expect(response.body.tablenote.is_deleted).toBe(false);
        expect(response.body.tablenote).toHaveProperty("createdate");
        expect(response.body.tablenote).toHaveProperty("updatedate");
        expect(response.body.tablenote.deletedate).toBe(null);
        expect(response.body.tablenote.is_locked).toBe(true);
    });

    it("PUT /tablenotes/lock with NOT exists id should return 200 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(({ id }) => {
            if (id === 3) {
                return Promise.resolve(mockDeletedTableNotes);
            } else {
                return Promise.resolve(null);
            }
        });

        const response = await request(app)
            .put("/api/tablenotes/lock")
            .send({ id: "999", isLocked: true });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Can't find TableNote");
    });

    it("PUT /tablenotes/lock with NO id should return 400 and message", async () => {
        mockRepoTableNote.findOneBy.mockImplementationOnce(({ id }) => {
            if (id === 3) {
                return Promise.resolve(mockDeletedTableNotes);
            } else {
                return Promise.resolve(null);
            }
        });

        const response = await request(app)
            .put("/api/tablenotes/lock")
            .send({ isLocked: true });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Must set tablenote id,isLocked");
    });

    it("DELETE /tablenotes/trash should return 200 and message", async () => {

        const response = await request(app)
            .delete("/api/tablenotes/trash");

        console.log("response.body.tablenote:", response.body.tablenote);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("All TrashTableNote deleted successfully");
    });

    it("DELETE /tablenotes/trash and error occured should return 500 and message", async () => {
        const dbError = new Error("DB Deletion Failed during execution");
        mockExecute.mockRejectedValueOnce(dbError);

        const response = await request(app)
            .delete("/api/tablenotes/trash");

        console.log("response.body.tablenote:", response.body.tablenote);
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to delete all TrashTableNote");
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