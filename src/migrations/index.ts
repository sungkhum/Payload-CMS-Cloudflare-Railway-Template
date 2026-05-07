import * as migration_20260507_175724_initial from './20260507_175724_initial';
import * as migration_20260507_220000_scheduled_publish_jobs from './20260507_220000_scheduled_publish_jobs';

export const migrations = [
  {
    up: migration_20260507_175724_initial.up,
    down: migration_20260507_175724_initial.down,
    name: '20260507_175724_initial',
  },
  {
    up: migration_20260507_220000_scheduled_publish_jobs.up,
    down: migration_20260507_220000_scheduled_publish_jobs.down,
    name: '20260507_220000_scheduled_publish_jobs'
  },
];
