import * as winston from 'winston'
import Redis from 'ioredis'
import * as AWS from 'aws-sdk'
import { Container } from 'inversify'
import {
  DomainEventHandlerInterface,
  DomainEventMessageHandlerInterface,
  DomainEventSubscriberFactoryInterface,
} from '@standardnotes/domain-events'
import { Env } from './Env'
import TYPES from './Types'
import { AppDataSource } from './DataSource'
import {
  RedisDomainEventPublisher,
  RedisDomainEventSubscriberFactory,
  RedisEventMessageHandler,
  SNSDomainEventPublisher,
  SQSDomainEventSubscriberFactory,
  SQSEventMessageHandler,
  SQSNewRelicEventMessageHandler,
} from '@standardnotes/domain-events-infra'
import { ApiGatewayAuthMiddleware } from '../Controller/ApiGatewayAuthMiddleware'
import { CrossServiceTokenData, TokenDecoder, TokenDecoderInterface } from '@standardnotes/security'
import { WorkspaceRepositoryInterface } from '../Domain/Workspace/WorkspaceRepositoryInterface'
import { MySQLWorkspaceRepository } from '../Infra/MySQL/MySQLWorkspaceRepository'
import { WorkspaceUserRepositoryInterface } from '../Domain/Workspace/WorkspaceUserRepositoryInterface'
import { MySQLWorkspaceUserRepository } from '../Infra/MySQL/MySQLWorkspaceUserRepository'
import { Repository } from 'typeorm'
import { Workspace } from '../Domain/Workspace/Workspace'
import { WorkspaceUser } from '../Domain/Workspace/WorkspaceUser'
import { CreateWorkspace } from '../Domain/UseCase/CreateWorkspace/CreateWorkspace'
import { WorkspacesController } from '../Controller/WorkspacesController'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const newrelicFormatter = require('@newrelic/winston-enricher')

export class ContainerConfigLoader {
  async load(): Promise<Container> {
    const env: Env = new Env()
    env.load()

    const container = new Container()

    await AppDataSource.initialize()

    const redisUrl = env.get('REDIS_URL')
    const isRedisInClusterMode = redisUrl.indexOf(',') > 0
    let redis
    if (isRedisInClusterMode) {
      redis = new Redis.Cluster(redisUrl.split(','))
    } else {
      redis = new Redis(redisUrl)
    }

    container.bind(TYPES.Redis).toConstantValue(redis)

    const newrelicWinstonFormatter = newrelicFormatter(winston)
    const winstonFormatters = [winston.format.splat(), winston.format.json()]
    if (env.get('NEW_RELIC_ENABLED', true) === 'true') {
      winstonFormatters.push(newrelicWinstonFormatter())
    }

    const logger = winston.createLogger({
      level: env.get('LOG_LEVEL') || 'info',
      format: winston.format.combine(...winstonFormatters),
      transports: [new winston.transports.Console({ level: env.get('LOG_LEVEL') || 'info' })],
    })
    container.bind<winston.Logger>(TYPES.Logger).toConstantValue(logger)

    if (env.get('SNS_AWS_REGION', true)) {
      container.bind<AWS.SNS>(TYPES.SNS).toConstantValue(
        new AWS.SNS({
          apiVersion: 'latest',
          region: env.get('SNS_AWS_REGION', true),
        }),
      )
    }

    if (env.get('SQS_QUEUE_URL', true)) {
      const sqsConfig: AWS.SQS.Types.ClientConfiguration = {
        apiVersion: 'latest',
        region: env.get('SQS_AWS_REGION', true),
      }
      if (env.get('SQS_ACCESS_KEY_ID', true) && env.get('SQS_SECRET_ACCESS_KEY', true)) {
        sqsConfig.credentials = {
          accessKeyId: env.get('SQS_ACCESS_KEY_ID', true),
          secretAccessKey: env.get('SQS_SECRET_ACCESS_KEY', true),
        }
      }
      container.bind<AWS.SQS>(TYPES.SQS).toConstantValue(new AWS.SQS(sqsConfig))
    }

    // Controller
    container.bind<WorkspacesController>(TYPES.WorkspacesController).to(WorkspacesController)
    // Repositories
    container.bind<WorkspaceRepositoryInterface>(TYPES.WorkspaceRepository).to(MySQLWorkspaceRepository)
    container.bind<WorkspaceUserRepositoryInterface>(TYPES.WorkspaceUserRepository).to(MySQLWorkspaceUserRepository)
    // ORM
    container
      .bind<Repository<Workspace>>(TYPES.ORMWorkspaceRepository)
      .toConstantValue(AppDataSource.getRepository(Workspace))
    container
      .bind<Repository<WorkspaceUser>>(TYPES.ORMWorkspaceUserRepository)
      .toConstantValue(AppDataSource.getRepository(WorkspaceUser))
    // Middleware
    container.bind<ApiGatewayAuthMiddleware>(TYPES.ApiGatewayAuthMiddleware).to(ApiGatewayAuthMiddleware)
    // env vars
    container.bind(TYPES.AUTH_JWT_SECRET).toConstantValue(env.get('AUTH_JWT_SECRET'))
    container.bind(TYPES.REDIS_URL).toConstantValue(env.get('REDIS_URL'))
    container.bind(TYPES.SNS_TOPIC_ARN).toConstantValue(env.get('SNS_TOPIC_ARN', true))
    container.bind(TYPES.SNS_AWS_REGION).toConstantValue(env.get('SNS_AWS_REGION', true))
    container.bind(TYPES.SQS_QUEUE_URL).toConstantValue(env.get('SQS_QUEUE_URL', true))
    container.bind(TYPES.REDIS_EVENTS_CHANNEL).toConstantValue(env.get('REDIS_EVENTS_CHANNEL'))
    container.bind(TYPES.NEW_RELIC_ENABLED).toConstantValue(env.get('NEW_RELIC_ENABLED', true))
    container.bind(TYPES.VERSION).toConstantValue(env.get('VERSION'))

    // use cases
    container.bind(TYPES.CreateWorkspace).to(CreateWorkspace)
    // Handlers
    // Services
    container
      .bind<TokenDecoderInterface<CrossServiceTokenData>>(TYPES.CrossServiceTokenDecoder)
      .toConstantValue(new TokenDecoder<CrossServiceTokenData>(container.get(TYPES.AUTH_JWT_SECRET)))

    if (env.get('SNS_TOPIC_ARN', true)) {
      container
        .bind<SNSDomainEventPublisher>(TYPES.DomainEventPublisher)
        .toConstantValue(new SNSDomainEventPublisher(container.get(TYPES.SNS), container.get(TYPES.SNS_TOPIC_ARN)))
    } else {
      container
        .bind<RedisDomainEventPublisher>(TYPES.DomainEventPublisher)
        .toConstantValue(
          new RedisDomainEventPublisher(container.get(TYPES.Redis), container.get(TYPES.REDIS_EVENTS_CHANNEL)),
        )
    }

    const eventHandlers: Map<string, DomainEventHandlerInterface> = new Map([])

    if (env.get('SQS_QUEUE_URL', true)) {
      container
        .bind<DomainEventMessageHandlerInterface>(TYPES.DomainEventMessageHandler)
        .toConstantValue(
          env.get('NEW_RELIC_ENABLED', true) === 'true'
            ? new SQSNewRelicEventMessageHandler(eventHandlers, container.get(TYPES.Logger))
            : new SQSEventMessageHandler(eventHandlers, container.get(TYPES.Logger)),
        )
      container
        .bind<DomainEventSubscriberFactoryInterface>(TYPES.DomainEventSubscriberFactory)
        .toConstantValue(
          new SQSDomainEventSubscriberFactory(
            container.get(TYPES.SQS),
            container.get(TYPES.SQS_QUEUE_URL),
            container.get(TYPES.DomainEventMessageHandler),
          ),
        )
    } else {
      container
        .bind<DomainEventMessageHandlerInterface>(TYPES.DomainEventMessageHandler)
        .toConstantValue(new RedisEventMessageHandler(eventHandlers, container.get(TYPES.Logger)))
      container
        .bind<DomainEventSubscriberFactoryInterface>(TYPES.DomainEventSubscriberFactory)
        .toConstantValue(
          new RedisDomainEventSubscriberFactory(
            container.get(TYPES.Redis),
            container.get(TYPES.DomainEventMessageHandler),
            container.get(TYPES.REDIS_EVENTS_CHANNEL),
          ),
        )
    }

    return container
  }
}
