/**
 * Runs Payload's job queue once and exits. Wired to the Railway cron
 * service via `cronSchedule: */30 * * * *` and `startCommand: pnpm jobs:run`.
 *
 * Each invocation:
 *   1. Boots Payload (loads config, opens a DB pool).
 *   2. Calls payload.jobs.run() — picks up any jobs whose waitUntil <= now,
 *      runs them sequentially, marks them complete.
 *   3. Exits with code 0 on success, 1 on error so Railway shows the run
 *      as failed in the dashboard.
 */
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config'

async function main() {
  const payload = await getPayload({ config })
  payload.logger.info('jobs:run starting')

  const result = await payload.jobs.run()

  payload.logger.info(
    {
      noJobsRemaining: (result as { noJobsRemaining?: boolean }).noJobsRemaining ?? null,
    },
    'jobs:run finished',
  )

  process.exit(0)
}

main().catch((err) => {
  console.error('jobs:run failed:', err)
  process.exit(1)
})
