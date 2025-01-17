import { inject, injectable } from 'inversify'

import TYPES from '../../Bootstrap/Types'
import { DomainEventFactoryInterface } from '../../Domain/Event/DomainEventFactoryInterface'
import { User } from '../../Domain/User/User'
import { ClientServiceInterface } from '../../Domain/Client/ClientServiceInterface'
import { DomainEventPublisherInterface } from '@standardnotes/domain-events'
import { Logger } from 'winston'

@injectable()
export class WebSocketsClientService implements ClientServiceInterface {
  constructor(
    @inject(TYPES.Auth_DomainEventFactory) private domainEventFactory: DomainEventFactoryInterface,
    @inject(TYPES.Auth_DomainEventPublisher) private domainEventPublisher: DomainEventPublisherInterface,
    @inject(TYPES.Auth_Logger) private logger: Logger,
  ) {}

  async sendUserRolesChangedEvent(user: User): Promise<void> {
    const event = this.domainEventFactory.createUserRolesChangedEvent(
      user.uuid,
      user.email,
      (await user.roles).map((role) => role.name),
    )

    this.logger.info(`[WebSockets] Requesting message ${event.type} to user ${user.uuid}`)

    await this.domainEventPublisher.publish(
      this.domainEventFactory.createWebSocketMessageRequestedEvent({
        userUuid: user.uuid,
        message: JSON.stringify(event),
      }),
    )
  }
}
