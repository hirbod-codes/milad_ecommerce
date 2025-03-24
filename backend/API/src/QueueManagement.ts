import amqp from 'amqplib'
import { array, string } from 'yup';
import { RoleRepository } from './DB/Repositories/RoleRepository';

export class QueueManagement {
    private readonly QUEUE_NAMES: string[] = ['role_management']
    private url: string
    private username: string
    private password: string
    private mode: 'single' | 'cluster'

    constructor(url: string, username: string, password: string, mode: 'single' | 'cluster') {
        this.url = url
        this.username = username
        this.password = password
        this.mode = mode
    }

    async getChannel(): Promise<amqp.Channel> {
        if (this.mode === 'single') {
            const connection = await amqp.connect(this.url);
            return await connection.createChannel();
        } else {
            try {
                const res = await fetch(`${this.url}/api/nodes`, {
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
                    },
                })
                if (!res.ok)
                    throw new Error('system failed to fetch rabbitMQ cluster node list')

                const nodes = await res.json()
                if (!array().required().strict(true).min(1).of(string().required()).isValidSync(nodes))
                    throw new Error('system failed to fetch rabbitMQ cluster node list')

                const nodeUrls = nodes.map((node: any) => `amqp://${this.username}:${this.password}@${node.name}:5672`);
                for (const url of nodeUrls) {
                    let safety = 0
                    while (safety < 3) {
                        safety++
                        try {
                            const connection = await amqp.connect(url)
                            return await connection.createChannel()
                        } catch (e) { console.error(e) }
                    }
                }
            }
            catch (e) { console.error(e); throw new Error('system failed to fetch rabbitMQ cluster node list') }
        }

        throw new Error('system failed to connect to rabbitMQ')
    }

    async subscribeConsumers(url: string) {
        try {
            const connection = await amqp.connect(url);

            const channel = await connection.createChannel();

            for (const queueName of this.QUEUE_NAMES) {
                await channel.assertQueue(queueName, { durable: false });

                if (queueName === 'role_management')
                    channel.consume(queueName, async (data) => {
                        if (data) {
                            channel.ack(data)

                            let message = data.content.toString()
                            if (['update', 'delete', 'create'].includes(message)) {
                                let safety = 0
                                while (safety < 4) {
                                    safety++

                                    try {
                                        const roleRepository = await RoleRepository.getInstance()
                                        if (await roleRepository.fetchRolesWithPrivileges() !== false)
                                            break
                                    } catch (e) { console.error(e) }
                                }
                            }
                        }
                    });
            }
        } catch (e) {
            console.error(e)
            throw e
        }
    }
}
