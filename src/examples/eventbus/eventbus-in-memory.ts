// Wire this up in the composition root.
// Inject appropriate implementations.
import {EventbusInMemory} from '../../components/eventbus-in-memory'
import {Eventbus} from '../../components/eventbus'
import {
  ShoppingCartCommandHandlersEventbus,
  ShoppingCartRepository
} from '../../domain/shopping-cart'
import {OrderPolicy} from '../../domain/notification'

declare const repository: ShoppingCartRepository
const eventbus: Eventbus = new EventbusInMemory()

// Global subscription for logging
eventbus.subscribe('*', async (event) => {
  console.log('Audit log:', event)
})

// Handlers are subscribed in the constructor
new ShoppingCartCommandHandlersEventbus(repository, eventbus)
new OrderPolicy(eventbus)
