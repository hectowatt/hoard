import "reflect-metadata";
import { DataSource } from "typeorm";
import Note from "./entities/Note.ts";
import Label from "./entities/Label.ts";
import TableNote from "./entities/TableNote.ts";
import TableNoteColumn from "./entities/TableNoteColumn.ts";
import TableNoteCell from "./entities/TableNoteCell.ts";
import Password from "./entities/NotePassword.ts";
import HoardUser from "./entities/HoardUser.ts";

export const AppDataSource: DataSource = new DataSource({
    type: "postgres",
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432"),
    username: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "password",
    database: process.env.PG_DATABASE || "mydatabase",
    synchronize: true, // 開発環境では自動スキーマ同期
    logging: false,
    entities: [Note, Label, TableNote, TableNoteColumn, TableNoteCell, Password, HoardUser],
    migrations: [],
    subscribers: [],
});
