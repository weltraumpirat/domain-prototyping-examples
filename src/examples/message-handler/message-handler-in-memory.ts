import {CommandQueue} from '../../components/message-queue'
import {Eventbus} from '../../components/eventbus'

import {
  createAddItemToCartHandler,
  ShoppingCartRepository
} from '../../domain/shopping-cart'

declare const repository: ShoppingCartRepository
declare const eventbus: Eventbus
declare const commandQueue: CommandQueue

const addItemHandler = createAddItemToCartHandler(repository, eventbus)

// Somewhere else
const consumer = async () => {
  await commandQueue.consume(addItemHandler)
  setTimeout(consumer, 100)
}
setTimeout(consumer, 100)
