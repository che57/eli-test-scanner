import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('test_strip_submissions')
export class TestStripSubmission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  qrCode!: string | null;

  @Column({ type: 'text' })
  originalImagePath!: string;

  @Column({ type: 'text', nullable: true })
  thumbnailPath!: string | null;

  @Column({ type: 'integer', nullable: true })
  imageSize!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  imageDimensions!: string | null;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}