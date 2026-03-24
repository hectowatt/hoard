import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import pg from 'pg';
import { AppDataSource } from './DataSource.js';
import loginRoutets from './routes/LoginRoutes.js';
import logoutRoutets from './routes/LogoutRoutes.js';
import userRoutes from './routes/UserRoutes.js';
import noteRoutes from './routes/NoteRoutes.js';
import labelRoutes from './routes/LabelRoutes.js';
import notePasswordRoutes from './routes/NotePasswordRoutes.js';
import tableNoteRoutes from './routes/TableNoteRoutes.js';
import exportRoutes from './routes/ExportRoutes.js';
import importRoutes from './routes/ImportRoutes.js';
import tokenRoutes from './routes/TokenRoutes.js';
import { LessThan } from 'typeorm';
import Note from './entities/Note.js';
import cookieParser from 'cookie-parser';
import TableNote from './entities/TableNote.js';
import { Redis } from 'ioredis';
import next from 'next';
import type { NextServerOptions, NextServer } from 'next/dist/server/next.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dev = process.env.NODE_ENV !== 'production';
// 実行ファイルの位置から見た frontend フォルダの場所を切り替える
const frontendDir = dev
  ? path.resolve(__dirname, '../frontend')        // 開発時 (server.ts の場所から)
  : path.resolve(__dirname, '../../frontend');    // 本番時 (dist/server.js の場所から)

const port = 8120;
const nextApp: NextServer = (next as unknown as (options: NextServerOptions) => NextServer)({
  dev,
  dir: frontendDir,
  conf: {
    // Next.js 本番ビルドの場所を絶対パスで指定
    distDir: path.join(frontendDir, '.next')
  }
});
const handle = nextApp.getRequestHandler();

export const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    'http://localhost:8120',
    'http://127.0.0.1:8120',
    'http://localhost:3500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Redis / PostgreSQL 設定 (遅延初期化)
export let redis: Redis | null = null;
export let pool: pg.Pool | null = null;
export let hoardserver: any | null = null;

// サーバーリソースの初期化
export async function initializeServer() {
  // Redis の初期化
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: 6379
    });
  }

  // PostgreSQL の初期化
  if (!pool) {
    const { Pool } = pg;
    pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'password',
      database: process.env.PG_DATABASE || 'mydatabase',
    });
  }

  // サーバーの起動
  if (!hoardserver && process.env.NODE_ENV !== 'test') {
    hoardserver = await new Promise<any>((resolve) => {
      const server = app.listen(8120, '0.0.0.0', () => {
        console.log(`> Ready on http://localhost:8120`);
        resolve(server);
      });
    });
  }
}

// API ルート定義
app.use('/api/login', loginRoutets);
app.use('/api/logout', logoutRoutets);
app.use('/api/user', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/password', notePasswordRoutes);
app.use('/api/tablenotes', tableNoteRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/token', tokenRoutes);

// サーバー起動処理
export async function startServer() {
  // サーバーリソースの初期化
  await initializeServer();

  await nextApp.prepare();

  // TypeORM の初期化
  await AppDataSource.initialize();
  console.log("Data Source has been initialized!");

  // Next.js のハンドラーを最後に登録 (API以外をすべてNext.jsに流す)
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  // WebSocket の紐付け
  const wss = new WebSocketServer({ noServer: true });

  // HTTPサーバーのアップグレードイベントを横取りする
  if (hoardserver) {
    hoardserver.on('upgrade', (request: any, socket: any, head: any) => {
      const { pathname } = new URL(request.url, `http://${request.headers.host}`);

      if (pathname === '/api/ws' || pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        // それ以外のアップグレード（Next.jsのHMRなど）はそのまま流す
      }
    });
  }
  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
  });

  // 定期タスク
  if (process.env.NODE_ENV !== 'test') {
    setInterval(deleteOldNotes, 60 * 60 * 1000);
  }

  return { hoardserver, wss };
}

// 古いノート削除ロジック
export async function deleteOldNotes() {
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const tableNoteRepository = AppDataSource.getRepository(TableNote);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await noteRepository.delete({ is_deleted: true, deletedate: LessThan(sevenDaysAgo) });
    await tableNoteRepository.delete({ is_deleted: true, deletedate: LessThan(sevenDaysAgo) });
    console.log('Old notes deleted successfully');
  } catch (error) {
    console.error('Error deleting old notes:', error);
  }
}

export async function closeResources() {
  if (redis) await redis.quit();
  if (pool) await pool.end();
}

// 実行
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
  });
}