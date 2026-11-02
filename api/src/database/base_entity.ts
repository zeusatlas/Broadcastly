import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Every entity extends this. Always give each @Column an explicit `type`: the dev runner (tsx)
// and tests (vitest) do not emit decorator metadata, so TypeORM cannot infer column types.
export abstract class BaseEntity {
  // UUIDs, not serial ids: ids appear in URLs and must not reveal record counts.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
