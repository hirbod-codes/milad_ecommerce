import amqp from 'amqplib'
import { roleRepository } from 'src';

export class QueueManagement {
    static readonly QUEUE_NAME: string = 'role_management'

    static async subscribeConsumers(url: string) {
        try {
            const connection = await amqp.connect(url);

            const channel = await connection.createChannel();

            await channel.assertQueue(this.QUEUE_NAME, { durable: false });

            channel.consume(this.QUEUE_NAME, async (message) => {
                if (message) {
                    channel.ack(message)

                    if (message.content.toString().includes('update')) {
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
        } catch (e) {
            console.error(e)
            throw e
        }
    }

    static async send(url: string, message: string) {
        try {
            const connection = await amqp.connect(url);

            const channel = await connection.createChannel();

            await channel.assertQueue(this.QUEUE_NAME, { durable: false });

            channel.sendToQueue(this.QUEUE_NAME, Buffer.from(message))
        } catch (e) {
            console.error(e)
            throw e
        }
    }
}
