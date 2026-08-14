import {MessageQueueInMemory} from '../../components/message-queue-in-memory'
import {Eventbus} from '../../components/eventbus'
import {
  createAddItemToCartHandler,
  ShoppingCartRepository
} from '../../domain/shopping-cart'

declare const eventbus: Eventbus
declare const shoppingCartRepository: ShoppingCartRepository

const queue = new MessageQueueInMemory()
const addItemHandler: any = createAddItemToCartHandler(shoppingCartRepository, eventbus)

const consumer = async () => {
  await queue.consume(addItemHandler)
  setTimeout(consumer, 100)
}

consumer()
