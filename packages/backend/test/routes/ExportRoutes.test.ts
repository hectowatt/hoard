import request from "supertest";
import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../../dist/DataSource.js";

// --- モックの定義 ---

// 1. archiver モック
const mockPipe = jest.fn((res: any) => {
    res.end(); // ★これが超重要
});
const mockAppend = jest.fn();
const mockFinalize = jest.fn(() => Promise.resolve()); // finalize() は非同期で完了
const mockArchiver = jest.fn(() => ({
    pipe: mockPipe,
    append: mockAppend,
    finalize: mockFinalize,
}));

// archiver をモック
jest.unstable_mockModule("archiver", () => ({
    default: mockArchiver,
}));

// 2. csv-stringify/sync モック
const mockStringify = jest.fn((data: any, options) => {
    // 取得したデータに基づいてモックの CSV データを返す
    if (data.length > 0) {
        // 例: [{ id: '1', ... }] -> "id,..."
        return `header,${data.length} rows\n`;
    }
    return "header\n";
});

// csv-stringify/sync をモック
jest.unstable_mockModule("csv-stringify/sync", () => ({
    stringify: mockStringify,
}));

// 3. TypeORM リポジトリモック
const mockFind = jest.fn(() => Promise.resolve([
    { id: "1", data: "test" },
])); // ダミーデータを返す

const mockRepo = {
    find: mockFind,
};

// getRepository のモック (すべてのエンティティに同じモックを返す)
const mockGetRepository = jest.fn(() => mockRepo);

// DataSource モック
jest.unstable_mockModule("../../dist/DataSource.js", () => ({
    AppDataSource: {
        getRepository: mockGetRepository,
    },
}));

// --- テスト対象 API のインポート (モックの後に実行) ---
const { app, hoardserver } = await import("../../dist/server.js");

// --- テストスイート ---
describe("ExportRoutes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // archiver モックの初期状態をリセット
        mockPipe.mockClear();
        mockAppend.mockClear();
        mockFinalize.mockClear();
        mockArchiver.mockClear();
        mockStringify.mockClear();
        mockFind.mockClear();

        // find が呼ばれるたびにダミーデータを返すように設定
        // 異なるエンティティが呼ばれた回数を検証するために find のモックを使用
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