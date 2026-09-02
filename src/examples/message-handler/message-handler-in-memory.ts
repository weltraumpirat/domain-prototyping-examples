import {CommandQueue} from '../../components/message-queue'
import {Eventbus} from '../../components/eventbus'

import {ShoppingCartRepository} from '../../domain/shopping-cart/repository'
import {createAddItemToCartHandler} from '../../domain/shopping-cart/command-handlers'

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
