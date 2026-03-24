import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import Label from "./Label.js";

@Entity({ name: "note" })
export default class Note {

    // primary key
    @PrimaryGeneratedColumn("uuid")
    id: string;

    // title
    @Column({ name: "title", type: "text", nullable: false })
    title: string;

    // content
    @Column({ name: "content", type: "text", nullable: false })
    content: string;

    // label_id
    @Column({ name: "label_id", type: "uuid", nullable: true })
    label_id: string | null;

    // TODO: ラベルを複数追加できるようにしたい
    @ManyToOne(() => Label, label => label.notes, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "label_id" })
    label: Label | null;

    // is_deleted
    @Column({ name: "is_deleted", type: "boolean", default: false })
    is_deleted: boolean;

    // deletedata
    @Column({ name: "deletedate", type: "timestamp", nullable: true })
    deletedate: Date | null;

    // is_locked
    @Column({ name: "is_locked", type: "boolean", default: false })
    is_locked: boolean;

    // is_pinned
    @Column({ name: "is_pinned", type: "boolean", default: false })
    is_pinned: boolean;

    // createdate
    @CreateDateColumn({ name: "createdate", type: "timestamp" })
    createdate: Date;

    // updatedate
    @UpdateDateColumn({ name: "updatedate", type: "timestamp" })
    updatedate: Date;
} 