import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import pg from 'pg';
import { AppDataSource } from './DataSource.js';
import loginRoutets from './routes/LoginRoutes.js';
import logoutRoutets from './routes/LogoutRoutes.js';
import hoardUserRoutes from './routes/HoardUserRoutes.js';
import noteRoutes from './routes/NoteRoutes.js';
import labelRoutes from './routes/LabelRoutes.js';
import passwordRoutes from './routes/PasswordRoutes.js';
import tableNoteRoutes from './routes/TableNoteRoutes.js';
import exportRoutes from './routes/ExportRoutes.js'
import importRoutes from './routes/ImportRoutes.js'
import tokenRoutes from './routes/TokenRoutes.js'
import { LessThan } from 'typeorm';
import Note from './entities/Note.js';
import cookieParser from 'cookie-parser';
import TableNote from './entities/TableNote.js';
import { Redis } from 'ioredis';

const { Pool } = pg;
export const app = express();
const port = 4000;

// JSONボディのパースを有効にする
app.use(express.json());
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

app.use(cookieParser());

// PostgreSQL接続設定
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'mydatabase',
});

// TypeORMの初期化
export async function startServer() {
  await AppDataSource.initialize();
  console.log("Data Source has been initialized!");

  const hoardserver = await new Promise((resolve) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${port}`);
      resolve(server);
    });
  });

  const wss = new WebSocketServer({ server: hoardserver });

  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  if (process.env.NODE_ENV !== 'test') {
    setInterval(deleteOldNotes, 60 * 60 * 1000);
  }

  return { hoardserver, wss };
}


// ルートにアクセスされたときの処理
app.get('/', (req, res) => {
  res.send('WebSocket Server is running');
});

app.use('/api/login', loginRoutets);
app.use('/api/logout', logoutRoutets);
app.use('/api/user', hoardUserRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/tablenotes', tableNoteRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/token', tokenRoutes);


// 定期的に古いノートを削除する関数（７日経過したら削除）
export async function deleteOldNotes() {
  try {
    const noteRepository = AppDataSource.getRepository(Note);
    const tableNoteRepository = AppDataSource.getRepository(TableNote);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await noteRepository.delete({
      is_deleted: true,
      deletedate: LessThan(sevenDaysAgo)
    });
    await tableNoteRepository.delete({
      is_deleted: true,
      deletedate: LessThan(sevenDaysAgo)
    });
    console.log('Old notes deleted successfully');
  } catch (error) {
    console.error('Error deleting old notes:', error);
  };
};

// エントリーポイントでstartServerを呼び出す
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
  });
};

export const redis = new Redis({ 
  host: process.env.REDIS_HOST || 'redis', 
  port: 6379 
});
