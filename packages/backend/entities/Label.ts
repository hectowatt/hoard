import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import Note from "./Note.js";

@Entity({ name: "label" })
export default class Label {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    // labelname
    @Column({ name: "labelname", type: "varchar", length: 8, nullable: false, unique: true })
    labelname: string;

    // createdate
    @CreateDateColumn({ name: "createdate", type: "timestamp" })
    createdate: Date;

    @OneToMany(() => Note, note => note.label_id)
    notes: Note[];
} 