import {MessageQueueInMemory} from '../../components/message-queue-in-memory'
import {Eventbus} from '../../components/eventbus'

import {ShoppingCartRepository} from '../../domain/shopping-cart/repository'
import {createAddItemToCartHandler} from '../../domain/shopping-cart/command-handlers'

declare const eventbus: Eventbus
declare const shoppingCartRepository: ShoppingCartRepository

const queue = new MessageQueueInMemory()
const addItemHandler: any = createAddItemToCartHandler(shoppingCartRepository, eventbus)

const consumer = async () => {
  await queue.consume(addItemHandler)
  setTimeout(consumer, 100)
}

setTimeout(consumer, 100)
