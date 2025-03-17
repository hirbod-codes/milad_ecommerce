import amqp from 'amqplib'
import { roleRepository } from 'src';

export class QueueManagement {
    static readonly QUEUE_NAMES: string[] = ['role_management']

    static async subscribeConsumers(url: string) {
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
