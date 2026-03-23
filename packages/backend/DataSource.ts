import "reflect-metadata";
import { DataSource } from "typeorm";
import Note from "./entities/Note";
import Label from "./entities/Label";
import TableNote from "./entities/TableNote";
import TableNoteColumn from "./entities/TableNoteColumn";
import TableNoteCell from "./entities/TableNoteCell";
import Password from "./entities/NotePassword";
import HoardUser from "./entities/HoardUser";

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
