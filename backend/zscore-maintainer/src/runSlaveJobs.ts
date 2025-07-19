import { DateTime } from "luxon";
import { schedule } from "node-cron";
import { httpRequest } from "../../API/src/helpers";

export async function runSlaveJobs(masterHost: string, masterPort: number, host: string, port: number) {
    schedule('* 1 * * *', async () => {
        console.time()
        console.log(`running cron job: "subscription" at ${DateTime.utc().toISO()}...`)

        try {
            const r = await httpRequest({ host: masterHost, port: masterPort, path: '/subscribe', method: 'POST' }, JSON.stringify({ host, port }))
            if (!r.response.statusCode || r.response.statusCode < 200)
                console.warn('Failed to subscribe to master.')
        } catch (e) {
            console.error(e)
        }

        console.log('done')
        console.timeEnd()
    }, { name: 'subscription', runOnInit: true, timezone: 'UTC' })
}

export async function handleRange(doc: { range: { min: string, max: string }, count: number }) {
}
