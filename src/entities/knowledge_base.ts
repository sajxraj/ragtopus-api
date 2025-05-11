import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('knowledge_bases')
export class KnowledgeBase {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  readonly payload: unknown | null

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp with time zone',
  })
  readonly createdAt: Date

  @UpdateDateColumn({
    name: 'updatedAt',
    type: 'timestamp with time zone',
  })
  readonly updatedAt: Date
}
