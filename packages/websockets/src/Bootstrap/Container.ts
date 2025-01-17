import * as winston from 'winston'
import Redis from 'ioredis'
import { SQSClient, SQSClientConfig } from '@aws-sdk/client-sqs'
import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi'
import { Container } from 'inversify'
import {
  DomainEventHandlerInterface,
  DomainEventMessageHandlerInterface,
  DomainEventSubscriberInterface,
} from '@standardnotes/domain-events'
import { Env } from './Env'
import TYPES from './Types'
import { WebSocketsConnectionRepositoryInterface } from '../Domain/WebSockets/WebSocketsConnectionRepositoryInterface'
import { RedisWebSocketsConnectionRepository } from '../Infra/Redis/RedisWebSocketsConnectionRepository'
import { AddWebSocketsConnection } from '../Domain/UseCase/AddWebSocketsConnection/AddWebSocketsConnection'
import { RemoveWebSocketsConnection } from '../Domain/UseCase/RemoveWebSocketsConnection/RemoveWebSocketsConnection'
import { WebSocketsClientMessenger } from '../Infra/WebSockets/WebSocketsClientMessenger'
import { SQSDomainEventSubscriber, SQSEventMessageHandler } from '@standardnotes/domain-events-infra'
import { ApiGatewayAuthMiddleware } from '../Controller/ApiGatewayAuthMiddleware'

import {
  CrossServiceTokenData,
  TokenDecoder,
  TokenDecoderInterface,
  TokenEncoder,
  TokenEncoderInterface,
  WebSocketConnectionTokenData,
} from '@standardnotes/security'
import { CreateWebSocketConnectionToken } from '../Domain/UseCase/CreateWebSocketConnectionToken/CreateWebSocketConnectionToken'
import { WebSocketsController } from '../Controller/WebSocketsController'
import { WebSocketServerInterface } from '@standardnotes/api'
import { ClientMessengerInterface } from '../Client/ClientMessengerInterface'
import { WebSocketMessageRequestedEventHandler } from '../Domain/Handler/WebSocketMessageRequestedEventHandler'

export class ContainerConfigLoader {
  async load(): Promise<Container> {
    const env: Env = new Env()
    env.load()

    const container = new Container()

    const redisUrl = env.get('REDIS_URL')
    const isRedisInClusterMode = redisUrl.indexOf(',') > 0
    let redis
    if (isRedisInClusterMode) {
      redis = new Redis.Cluster(redisUrl.split(','))
    } else {
      redis = new Redis(redisUrl)
    }

    container.bind(TYPES.Redis).toConstantValue(redis)

    const winstonFormatters = [winston.format.splat(), winston.format.json()]

    const logger = winston.createLogger({
      level: env.get('LOG_LEVEL', true) || 'info',
      format: winston.format.combine(...winstonFormatters),
      transports: [new winston.transports.Console({ level: env.get('LOG_LEVEL', true) || 'info' })],
    })
    container.bind<winston.Logger>(TYPES.Logger).toConstantValue(logger)

    if (env.get('SQS_QUEUE_URL', true)) {
      const sqsConfig: SQSClientConfig = {
        region: env.get('SQS_AWS_REGION', true),
      }
      if (env.get('SQS_ENDPOINT', true)) {
        sqsConfig.endpoint = env.get('SQS_ENDPOINT', true)
      }
      if (env.get('SQS_ACCESS_KEY_ID', true) && env.get('SQS_SECRET_ACCESS_KEY', true)) {
        sqsConfig.credentials = {
          accessKeyId: env.get('SQS_ACCESS_KEY_ID', true),
          secretAccessKey: env.get('SQS_SECRET_ACCESS_KEY', true),
        }
      }
      container.bind<SQSClient>(TYPES.SQS).toConstantValue(new SQSClient(sqsConfig))
    }

    container.bind(TYPES.WEBSOCKETS_API_URL).toConstantValue(env.get('WEBSOCKETS_API_URL', true))

    container.bind<ApiGatewayManagementApiClient>(TYPES.WebSockets_ApiGatewayManagementApiClient).toConstantValue(
      new ApiGatewayManagementApiClient({
        endpoint: container.get(TYPES.WEBSOCKETS_API_URL),
        region: env.get('API_GATEWAY_AWS_REGION', true) ?? 'us-east-1',
      }),
    )

    // Controller
    container.bind<WebSocketServerInterface>(TYPES.WebSocketsController).to(WebSocketsController)

    // Repositories
    container
      .bind<WebSocketsConnectionRepositoryInterface>(TYPES.WebSocketsConnectionRepository)
      .to(RedisWebSocketsConnectionRepository)

    // Middleware
    container.bind<ApiGatewayAuthMiddleware>(TYPES.ApiGatewayAuthMiddleware).to(ApiGatewayAuthMiddleware)

    // env vars
    container.bind(TYPES.AUTH_JWT_SECRET).toConstantValue(env.get('AUTH_JWT_SECRET'))
    container
      .bind(TYPES.WEB_SOCKET_CONNECTION_TOKEN_SECRET)
      .toConstantValue(env.get('WEB_SOCKET_CONNECTION_TOKEN_SECRET', true))
    container
      .bind(TYPES.WEB_SOCKET_CONNECTION_TOKEN_TTL)
      .toConstantValue(+env.get('WEB_SOCKET_CONNECTION_TOKEN_TTL', true))
    container.bind(TYPES.REDIS_URL).toConstantValue(env.get('REDIS_URL'))
    container.bind(TYPES.SQS_QUEUE_URL).toConstantValue(env.get('SQS_QUEUE_URL'))
    container.bind(TYPES.VERSION).toConstantValue(env.get('VERSION'))

    // use cases
    container.bind<AddWebSocketsConnection>(TYPES.AddWebSocketsConnection).to(AddWebSocketsConnection)
    container.bind<RemoveWebSocketsConnection>(TYPES.RemoveWebSocketsConnection).to(RemoveWebSocketsConnection)
    container
      .bind<CreateWebSocketConnectionToken>(TYPES.CreateWebSocketConnectionToken)
      .to(CreateWebSocketConnectionToken)

    // Handlers
    container
      .bind<WebSocketMessageRequestedEventHandler>(TYPES.WebSocketMessageRequestedEventHandler)
      .to(WebSocketMessageRequestedEventHandler)

    // Services
    container
      .bind<TokenDecoderInterface<CrossServiceTokenData>>(TYPES.CrossServiceTokenDecoder)
      .toConstantValue(new TokenDecoder<CrossServiceTokenData>(container.get(TYPES.AUTH_JWT_SECRET)))
    container
      .bind<TokenEncoderInterface<WebSocketConnectionTokenData>>(TYPES.WebSocketConnectionTokenEncoder)
      .toConstantValue(
        new TokenEncoder<WebSocketConnectionTokenData>(container.get(TYPES.WEB_SOCKET_CONNECTION_TOKEN_SECRET)),
      )
    container.bind<ClientMessengerInterface>(TYPES.WebSocketsClientMessenger).to(WebSocketsClientMessenger)

    const eventHandlers: Map<string, DomainEventHandlerInterface> = new Map([
      ['WEB_SOCKET_MESSAGE_REQUESTED', container.get(TYPES.WebSocketMessageRequestedEventHandler)],
    ])

    container
      .bind<DomainEventMessageHandlerInterface>(TYPES.DomainEventMessageHandler)
      .toConstantValue(new SQSEventMessageHandler(eventHandlers, container.get(TYPES.Logger)))
    container
      .bind<DomainEventSubscriberInterface>(TYPES.DomainEventSubscriber)
      .toConstantValue(
        new SQSDomainEventSubscriber(
          container.get<SQSClient>(TYPES.SQS),
          container.get<string>(TYPES.SQS_QUEUE_URL),
          container.get<DomainEventMessageHandlerInterface>(TYPES.DomainEventMessageHandler),
          container.get<winston.Logger>(TYPES.Logger),
        ),
      )

    return container
  }
}
