import { runLearningAnalysis } from './handlers/learning-analysis'
import { computeWeeklyStats } from './handlers/stats-computation'

export interface Env {
  NEON_DATABASE_URL: string
  ANTHROPIC_API_KEY: string
  ENVIRONMENT: string
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default {
  // HTTP handler (health check only)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return json({ status: 'ok', service: 'tradgo-api-stats' }, 200)
    }

    return json({ error: 'Not found' }, 404)
  },

  // Cron trigger handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const hour = new Date(event.scheduledTime).getUTCHours()

    try {
      if (hour === 3) {
        // 03:00 UTC — Learning analysis + stats computation
        console.log('Running learning analysis...')
        await runLearningAnalysis(env)
        console.log('Learning analysis complete.')

        console.log('Computing weekly stats...')
        await computeWeeklyStats(env)
        console.log('Weekly stats complete.')
      }

      if (hour === 7) {
        // 07:00 UTC — Daily digest emails (built in later batch)
        console.log('Daily digest job placeholder — will be built in Batch 14')
      }
    } catch (err) {
      console.error('Scheduled job failed:', err)
    }
  },
}
