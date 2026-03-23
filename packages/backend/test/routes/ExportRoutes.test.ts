import request from "supertest";
import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from "express";

// --- モックの定義 ---

// 1. archiver モック
const mockPipe = jest.fn((res: any) => {
    res.end();
});
const mockAppend = jest.fn();
const mockFinalize = jest.fn(() => Promise.resolve());
const mockArchiver = jest.fn(() => ({
    pipe: mockPipe,
    append: mockAppend,
    finalize: mockFinalize,
}));

// 2. csv-stringify/sync モック
const mockStringify = jest.fn((data: any, options) => {
    if (data.length > 0) {
        return `header,${data.length} rows\n`;
    }
    return "header\n";
});

// 3. TypeORM リポジトリモック
const mockFind = jest.fn(() => Promise.resolve([
    { id: "1", data: "test" },
]));

const mockRepo = {
    find: mockFind,
};

const mockGetRepository = jest.fn(() => mockRepo);


// --- モックの設定 ---

// archiver をモック
jest.unstable_mockModule("archiver", () => ({
    default: mockArchiver,
}));

// AuthMiddlewareをモック
jest.unstable_mockModule('../../middleware/AuthMiddleware', () => ({
  authMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
    next();
  }),
}));

// csv-stringify/sync をモック
jest.unstable_mockModule("csv-stringify/sync", () => ({
    stringify: mockStringify,
}));

// DataSource モック
jest.unstable_mockModule("../../DataSource", () => ({
    AppDataSource: {
        getRepository: mockGetRepository,
        destroy: jest.fn(() => Promise.resolve()),
    },
}));

// --- テストスイート ---
describe("ExportRoutes", () => {
    let app: any;

    beforeAll(async () => {
        // Express app を手動作成
        const express_module = await import("express");
        const express_app = express_module.default;
        
        app = express_app();
        app.use(express_app.json());
        
        // ExportRoutes をインポートして、ルーターをマウント
        const { default: exportRouter } = await import("../../routes/ExportRoutes");
        app.use('/api/export', exportRouter);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockPipe.mockClear();
        mockAppend.mockClear();
        mockFinalize.mockClear();
        mockArchiver.mockClear();
        mockStringify.mockClear();
        mockFind.mockClear();

        mockFind.mockResolvedValue([
            { id: "1", data: "dummy" }
        ]);
    });

    it("GET /api/export should return 200, set zip headers, and finalize archive", async () => {
        const response = await request(app).get("/api/export");

        // 1. ステータスコードの検証
        expect(response.status).toBe(200);

        // 2. ヘッダーの検証
        expect(response.headers["content-type"]).toBe("application/zip");
        expect(response.headers["content-disposition"]).toBe("attachment; filename=data.zip");

        // 3. DB からすべてのリポジトリが呼び出されたか検証
        const expectedRepoCalls = [
            "Note", "Label", "NotePassword",
            "TableNote", "TableNoteColumn", "TableNoteCell"
        ];

        // getRepository が6回、それぞれのエンティティで呼ばれているか
        expect(mockGetRepository).toHaveBeenCalledTimes(expectedRepoCalls.length);

        // find() が6回呼ばれているか (DBからデータ取得)
        expect(mockFind).toHaveBeenCalledTimes(expectedRepoCalls.length);

        // 4. CSV への変換が6回行われたか検証
        expect(mockStringify).toHaveBeenCalledTimes(expectedRepoCalls.length);

        // 5. archiver の検証
        // archiver() コンストラクタが "zip" オプションで呼ばれたか
        expect(mockArchiver).toHaveBeenCalledWith("zip", { zlib: { level: 9 } });

        // archiver がレスポンスストリームにパイプされたか
        expect(mockPipe).toHaveBeenCalledWith(expect.anything());

        // 6. すべての CSV が ZIP に追加されたか検証 (6回 append)
        expect(mockAppend).toHaveBeenCalledTimes(expectedRepoCalls.length);

        // ZIP に追加されたファイル名とデータ内容の検証 (一部抜粋)
        expect(mockAppend).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ name: "labels.csv" })
        );
        expect(mockAppend).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ name: "notes.csv" })
        );
        expect(mockAppend).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ name: "tablenotecells.csv" })
        );

        // 7. finalize() が呼び出されたか検証(ストリーミングの完了)
        expect(mockFinalize).toHaveBeenCalledTimes(1);
    });

    it("DB取得中にエラーが発生した場合、500とエラーメッセージを返す", async () => {
        // DBアクセス (find) が失敗するようにモックを上書き
        mockFind.mockRejectedValue(new Error("DB read error"));

        const response = await request(app).get("/api/export");

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: "Export failed" });

        // archiver の処理は開始されていないことを確認
        expect(mockArchiver).not.toHaveBeenCalled();
    });

    afterAll(async () => {
        jest.clearAllTimers();
    });
});