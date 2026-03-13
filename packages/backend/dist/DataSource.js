import "reflect-metadata";
import { DataSource } from "typeorm";
import Note from "./entities/Note.js";
import Label from "./entities/Label.js";
import TableNote from "./entities/TableNote.js";
import TableNoteColumn from "./entities/TableNoteColumn.js";
import TableNoteCell from "./entities/TableNoteCell.js";
import Password from "./entities/NotePassword.js";
import HoardUser from "./entities/HoardUser.js";
export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432"),
    username: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "password",
    database: process.env.PG_DATABASE || "mydatabase",
    synchronize: true, // 開発環境では自動スキーマ確同期
    logging: false,
    entities: [Note, Label, TableNote, TableNoteColumn, TableNoteCell, Password, HoardUser],
    migrations: [],
    subscribers: [],
});
//# sourceMappingURL=DataSource.js.map