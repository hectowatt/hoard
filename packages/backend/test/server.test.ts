import request from 'supertest';
import { LessThan } from 'typeorm';
import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from "express";

jest.mock('../dist/entities/Note.js', () => ({
  __esModule: true,
  default: class Note { },
}));

jest.mock('../dist/entities/TableNote.js', () => ({
  __esModule: true,
  default: class TableNote { },
}));

const mockRepoNote = {
  delete: jest.fn((note) => Promise.resolve(note)),
};
const mockRepoTableNote = {
  delete: jest.fn((tableNote) => Promise.resolve(tableNote)),
};

const NoteModule = await import('../dist/entities/Note.js');
const TableNoteModule = await import('../dist/entities/TableNote.js');
const Note = NoteModule.default;
const TableNote = TableNoteModule.default;

const mockGetRepository = jest.fn((entity: any) => {
  if (entity === TableNote || entity?.name === TableNote?.name || entity?.constructor?.name === TableNote?.name) return mockRepoTableNote;
  if (entity === Note || entity?.name === Note?.name || entity?.constructor?.name === Note?.name) return mockRepoNote;
  return {};
});

jest.unstable_mockModule('../dist/DataSource.js', () => ({
  AppDataSource: {
    getRepository: mockGetRepository,
    initialize: jest.fn().mockImplementation(() => Promise.resolve(true)),
    destroy: jest.fn().mockImplementation(() => Promise.resolve()),
  },
}));

const { app, deleteOldNotes, startServer } = await import("../dist/server.js");
const DataSourceModule = await import("../dist/DataSource.js");
const AppDataSource = DataSourceModule.AppDataSource;

describe('Server Tests', () => {

  let hoardserver;

  beforeAll(async () => {
    // サーバーを起動
    const result = await startServer();
    hoardserver = result.server;
  });

  afterAll(async () => {
    // サーバーを停止
    if (hoardserver) {
      await new Promise<void>((resolve, reject) => {
        hoardserver.close((err) => (err ? reject(err) : resolve()));
      });
    }

    if (hoardserver?.wss && typeof hoardserver.wss.close === "function") {
      await new Promise<void>((resolve) => hoardserver.wss.close(() => resolve()));
    }

    if (AppDataSource.destroy && typeof AppDataSource.destroy === "function") {
      try {
        await AppDataSource.destroy();
      } catch (error) {
      }
    }

    // すべてのTimerをクリア
    jest.clearAllTimers();
    jest.useRealTimers();

    // すべてのmockをクリア
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });


  it('GET / should respond with a welcome message', async () => {
    const response = await request(app).get('/').set('Cookie', ['refreshToken=dummy-valid-token', 'accessToken=dummy-valid-token']);;
    expect(response.status).toBe(200);
    expect(response.text).toBe('WebSocket Server is running');
  });



  it('should call delete on repositories for notes older than 7 days', async () => {
    const mockDate = new Date('2025-01-15T12:00:00Z');
    const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());

    await deleteOldNotes();

    expect(mockGetRepository).toHaveBeenCalledWith(Note);
    expect(mockGetRepository).toHaveBeenCalledWith(TableNote);
    expect(mockRepoNote.delete).toHaveBeenCalledTimes(1);
    expect(mockRepoTableNote.delete).toHaveBeenCalledTimes(1);

    dateSpy.mockRestore();
  });

  it('should not throw an error if the database operation fails', async () => {
    mockRepoNote.delete.mockImplementationOnce(() => Promise.reject(new Error('DB Error')));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await deleteOldNotes();

    expect(consoleSpy).toHaveBeenCalledWith('Error deleting old notes:', expect.any(Error));
    consoleSpy.mockRestore();
  });

});