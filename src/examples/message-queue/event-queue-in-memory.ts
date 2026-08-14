import {
  CommandQueue,
  EventQueue
} from '../../components/message-queue'
import {
  CommandQueueInMemory,
  EventQueueInMemory
} from '../../components/message-queue-in-memory'
import {Eventbus} from '../../components/eventbus'
import {DomainEvent} from '../../components/messages'
import {
  CollectBonusPointsCommand,
  FundsWithdrawnEvent,
  SendEmailNotificationCommand,
  WithdrawalRejectedEvent
} from '../../domain/account'

// ----- Infrastructure setup

const eventQueue: EventQueue = new EventQueueInMemory()
declare const eventbus: Eventbus

const createForwarder = (queue: EventQueue) => async (evt: DomainEvent): Promise<void> => {
  await queue.add(evt)
}

const forwarder = createForwarder(eventQueue)
eventbus.subscribe(FundsWithdrawnEvent, forwarder)
eventbus.subscribe(WithdrawalRejectedEvent, forwarder)


const bonusPointsQueue: CommandQueue = new CommandQueueInMemory()
const notificationCommandQueue: CommandQueue = new CommandQueueInMemory()

// ----- Wiring everything together
export class WithdrawalPolicyHandlers {
  constructor(
      private readonly bonusPointsQueue: CommandQueue,
      private readonly notificationCommandQueue: CommandQueue,
  ) {
  }

  /** The forwarder subscribes to two event types, so one queue carries both. A consumer
   *  therefore has to accept DomainEvent and dispatch — a handler narrowed to a single
   *  concrete event would be handed the other one at runtime.
   *  We narrow with instanceof rather than switching on `type`: the concrete events declare
   *  `type: MessageType`, which widens to string and can't discriminate a union. */
  async handle(event: DomainEvent): Promise<void> {
    if (event instanceof FundsWithdrawnEvent) {
      await this.whenFundsAreWithdrawn_collectBonusPoints(event)
    } else if (event instanceof WithdrawalRejectedEvent) {
      await this.whenAWithdrawalIsRejected_sendAnEmailNotification(event)
    }
  }

  async whenFundsAreWithdrawn_collectBonusPoints(event: FundsWithdrawnEvent): Promise<void> {
    await this.bonusPointsQueue.add(
        new CollectBonusPointsCommand(
            event.account,
            'WITHDRAWAL',
            event.amount,
            event.currency
        )
    )
  }

  async whenAWithdrawalIsRejected_sendAnEmailNotification(event: WithdrawalRejectedEvent): Promise<void> {
    await this.notificationCommandQueue.add(
        new SendEmailNotificationCommand(
            event.account,
            'URGENT: Withdrawal rejected.',
            'Unfortunately, we were unable to process your withdrawal request. ' + event.reason
        )
    )
  }
}

const withdrawalPolicy = new WithdrawalPolicyHandlers(bonusPointsQueue, notificationCommandQueue)

const consumer = async () => {
  await eventQueue.consume(withdrawalPolicy.handle.bind(withdrawalPolicy))
  setTimeout(consumer, 100)
}
consumer()
