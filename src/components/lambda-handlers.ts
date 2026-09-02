import {
  EventBridgeEvent,
  SQSBatchResponse,
  SQSEvent
} from 'aws-lambda'

import {
  CommandQueueSQS,
  EventQueueSQS
} from './message-queue-sqs'
import {
  EventHandler,
  MessageHandler
} from './message-handler'
import {
  DomainCommand,
  DomainEvent,
  DomainMessage
} from './messages'
import {EventbusEventBridge} from './eventbus-eventbridge'

// The Lambda only does AWS specific tasks: unwrap the command, pass it on,
// report what could not be processed.
export const createCommandSqsLambdaHandler = (queue: CommandQueueSQS, handler: MessageHandler<DomainCommand>) =>
    async (event: SQSEvent): Promise<SQSBatchResponse> => {
      const records = event.Records

      // Consuming a queue in batches can significantly speed up delivery and
      // reduce cost (AWS Lambda is billed per invocation).
      // To take advantage of this, we must prepare to
      // handle multiple incoming messages, not just one.
      // The queue is FIFO, so we work through the batch in the order it arrived.
      for (let i = 0; i < records.length; i++) {
        try {
          const command: DomainCommand = JSON.parse(records[i].body)
          await queue.receive(command)
          // No timeout here. Polling takes place where the lambda is triggered, so we
          // can simply call consume() and invoke the command handler.
          await queue.consume(handler)
        } catch (e: unknown) {
          console.error(e)

          // Whatever we do not report, SQS deletes when the Lambda returns:
          // Therefore, records queued behind a failed one have to fail along
          // with it, or else they are lost. We do that by returning their ids.
          // Downside: A batch of ten can hold several carts, so this also re-delivers
          // messages that never actually failed. The bigger the batch, the more
          // messages we re-deliver. Experiment with batch sizes and measure
          // averages to determine the best configuration.
          return {
            batchItemFailures: records
                .slice(i)
                .map((record) => ({itemIdentifier: record.messageId}))
          }
        }
      }
      return {batchItemFailures: []}
    }

// An EventBridge Rule delivers an event into the SQS Queue, and the Queue invokes us.
export const createPolicySqsLambdaHandler = (queue: EventQueueSQS, handler: EventHandler<DomainEvent>) =>
    async (event: SQSEvent): Promise<SQSBatchResponse | undefined> => {
      const records = event.Records

      for (let i = 0; i < records.length; i++) {
        try {
          // EventBridge wraps what it delivers, and its event is forwarded through the queue unchanged.
          // So what we received is a DomainEvent wrapped in an EventBridgeEvent wrapped in an SQSEvent,
          // and we need to complete the unwrapping: Our DomainEvent is the detail.
          const event: DomainEvent = JSON.parse(records[i].body).detail
          await queue.add(event)
          await queue.consume(handler)
        } catch (e: unknown) {
          console.error(e)
          // Same reasoning as on the command side: the records behind the failed
          // one have to fail with it, or SQS deletes events we never handled.
          return {
            batchItemFailures: records
                .slice(i)
                .map((record) => ({itemIdentifier: record.messageId}))
          }
        }
      }
      return {batchItemFailures: []}
    }

export const createEventBridgeLambdaHandler = (eventbus: EventbusEventBridge) =>
    async (event: EventBridgeEvent<any, any>): Promise<void> => {
      const msg = event.detail as DomainMessage
      try {
        await eventbus.receive(msg)
      } catch (error) {
        console.error({msg: 'Relay of incoming message failed with error.', error: JSON.stringify(error)})
      }
    }

