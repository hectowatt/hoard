import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LessThan } from 'typeorm';

// Next.js のモック化 (テスト時にNextサーバーを起動させないため)
jest.unstable_mockModule('next', () => ({
  default: jest.fn().mockReturnValue({
    prepare: jest.fn().mockImplementation(() => Promise.resolve()),
    getRequestHandler: jest.fn().mockReturnValue((req: any, res: any) => {
      res.status(200).send('Next.js Page');
    }),
  }),
}));

// エンティティのモック化
jest.unstable_mockModule('../entities/Note', () => ({
  __esModule: true,
  default: class Note { },
}));

jest.unstable_mockModule('../entities/TableNote', () => ({
  __esModule: true,
  default: class TableNote { },
}));

const mockRepoNote = {
  delete: jest.fn((note) => Promise.resolve(note)),
};
const mockRepoTableNote = {
  delete: jest.fn((tableNote) => Promise.resolve(tableNote)),
};

const NoteModule = await import('../entities/Note.js');
const TableNoteModule = await import('../entities/TableNote.js');
const Note = NoteModule.default;
const TableNote = TableNoteModule.default;

// DataSource のモック
const mockGetRepository = jest.fn((entity: any) => {
  if (entity === Note || entity?.name === 'Note') return mockRepoNote;
  if (entity === TableNote || entity?.name === 'TableNote') return mockRepoTableNote;
  return {};
});

jest.unstable_mockModule('../DataSource', () => ({
  AppDataSource: {
    getRepository: mockGetRepository,
    initialize: jest.fn().mockImplementation(() => Promise.resolve(true)),
    destroy: jest.fn().mockImplementation(() => Promise.resolve()),
  },
}));

// モジュールをインポート
const { app, deleteOldNotes, startServer,closeResources } = await import("../server.js");
const { AppDataSource } = await import("../DataSource.js");

describe('Server Tests', () => {
  let serverInstance: any;
  let wssInstance: any;

  beforeAll(async () => {
    // サーバーを起動
    const result = await startServer();
    serverInstance = result.hoardserver;
    wssInstance = result.wss;
  });

  afterAll(async () => {
    // サーバーを停止
    if (serverInstance) {
      await new Promise<void>((resolve) => serverInstance.close(() => resolve()));
    }
    if (wssInstance) {
      wssInstance.close();
    }
    await AppDataSource.destroy();

    await closeResources();

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET / should be handled by Next.js (returns mock string)', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Next.js Page');
  });

    it('GET /api should return version information', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('version');
    expect(response.body.version).toBe("1.1.2");
  });

  it('API routes should still respond (e.g., /api/login)', async () => {
    const response = await request(app).get('/api/login');
    expect(response.status).not.toBe(404);
  });

  it('should call delete on repositories for notes older than 7 days', async () => {
    const mockDate = new Date('2025-01-15T12:00:00Z');
    const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());

    await deleteOldNotes();

    expect(mockGetRepository).toHaveBeenCalledWith(Note);
    expect(mockGetRepository).toHaveBeenCalledWith(TableNote);
    expect(mockRepoNote.delete).toHaveBeenCalledTimes(1);
    expect(mockRepoTableNote.delete).toHaveBeenCalledTimes(1);

    // deleteの引数が七日前の日付（LessThan）になっているかチェック
    const sevenDaysAgo = new Date(mockDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(mockRepoNote.delete).toHaveBeenCalledWith({
      is_deleted: true,
      deletedate: LessThan(sevenDaysAgo)
    });

    dateSpy.mockRestore();
  });

  it('should log error if database operation fails', async () => {
    mockRepoNote.delete.mockRejectedValueOnce(new Error('DB Error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await deleteOldNotes();

    expect(consoleSpy).toHaveBeenCalledWith('Error deleting old notes:', expect.any(Error));
    consoleSpy.mockRestore();
  });

});