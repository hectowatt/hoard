import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import TableNote from "./TableNote.js";

@Entity({ name: "table_note_column" })
export default class TableNoteColumn {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "name", type: "text" })
    name: string;

    @Column({ name: "order", type: "int", default: 0 })
    order: number;

    @Column({ name: "table_note_id", type: "uuid" })
    table_note_id: string;

    @ManyToOne(() => TableNote, tableNote => tableNote.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "table_note_id" })
    tableNote: TableNote;
}