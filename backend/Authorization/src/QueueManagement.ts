import amqp from 'amqplib'

export class QueueManagement {
    static readonly QUEUE_NAME: string = 'role_management'

    static async subscribeConsumers(url: string) {
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
