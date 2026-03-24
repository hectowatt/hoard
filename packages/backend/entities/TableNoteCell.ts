import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import TableNoteColumn from "./TableNoteColumn.js";
import TableNote from "./TableNote.js";

@Entity({ name: "table_note_cell" })
export default class TableNoteCell {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: "row_index", type: "int" })
    row_index: number;

    @Column({ name: "value", type: "text" })
    value: string;

    @Column({ name: "table_note_id", type: "uuid" })
    table_note_id: string;

    @Column({ name: "column_id", type: "uuid" })
    column_id: string;

    @ManyToOne(() => TableNote, tableNote => tableNote.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "table_note_id" })
    tableNote: TableNote;

    @ManyToOne(() => TableNoteColumn, column => column.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "column_id" })
    column: TableNoteColumn;
}