import { schedule } from "node-cron";

export function runCronJobs() {
    schedule(
        '* 4 * * *',
        async () => {
            console.log('running cron job: "products views calculations"...')

            console.log('done')
        },
        { name: 'products views calculations', runOnInit: true })
}
