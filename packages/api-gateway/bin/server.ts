import 'reflect-metadata'

import '../src/Controller/LegacyController'
import '../src/Controller/HealthCheckController'

import '../src/Controller/v1/SessionsController'
import '../src/Controller/v1/UsersController'
import '../src/Controller/v1/ActionsController'
import '../src/Controller/v1/InvoicesController'
import '../src/Controller/v1/RevisionsController'
import '../src/Controller/v1/ItemsController'
import '../src/Controller/v1/PaymentsController'
import '../src/Controller/v1/WebSocketsController'
import '../src/Controller/v1/TokensController'
import '../src/Controller/v1/OfflineController'
import '../src/Controller/v1/FilesController'
import '../src/Controller/v1/SubscriptionInvitesController'
import '../src/Controller/v1/AuthenticatorsController'
import '../src/Controller/v1/MessagesController'
import '../src/Controller/v1/SharedVaultsController'
import '../src/Controller/v1/SharedVaultInvitesController'
import '../src/Controller/v1/SharedVaultUsersController'

import '../src/Controller/v2/PaymentsControllerV2'
import '../src/Controller/v2/ActionsControllerV2'
import '../src/Controller/v2/RevisionsControllerV2'

import helmet from 'helmet'
import * as cors from 'cors'
import { text, json, Request, Response, NextFunction } from 'express'
import * as winston from 'winston'
import * as AWSXRay from 'aws-xray-sdk'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const robots = require('express-robots-txt')

import { InversifyExpressServer } from 'inversify-express-utils'
import { ContainerConfigLoader } from '../src/Bootstrap/Container'
import { TYPES } from '../src/Bootstrap/Types'
import { Env } from '../src/Bootstrap/Env'
import { ServiceIdentifier } from '@standardnotes/domain-core'

const container = new ContainerConfigLoader()
void container.load().then((container) => {
  const env: Env = new Env()
  env.load()

  const isConfiguredForAWSProduction =
    env.get('MODE', true) !== 'home-server' && env.get('MODE', true) !== 'self-hosted'

  if (isConfiguredForAWSProduction) {
    AWSXRay.config([AWSXRay.plugins.ECSPlugin])
  }

  const server = new InversifyExpressServer(container)

  server.setConfig((app) => {
    if (isConfiguredForAWSProduction) {
      app.use(AWSXRay.express.openSegment(ServiceIdentifier.NAMES.ApiGateway))
    }

    app.use((_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('X-API-Gateway-Version', container.get(TYPES.ApiGateway_VERSION))
      next()
    })
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["https: 'self'"],
            baseUri: ["'self'"],
            childSrc: ['*', 'blob:'],
            connectSrc: ['*'],
            fontSrc: ['*', "'self'"],
            formAction: ["'self'"],
            frameAncestors: ['*', '*.standardnotes.org', '*.standardnotes.com'],
            frameSrc: ['*', 'blob:'],
            imgSrc: ["'self'", '*', 'data:'],
            manifestSrc: ["'self'"],
            mediaSrc: ["'self'"],
            objectSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
          },
        },
      }),
    )

    app.use(json({ limit: '50mb' }))
    app.use(
      text({
        type: ['text/plain', 'application/x-www-form-urlencoded', 'application/x-www-form-urlencoded; charset=utf-8'],
      }),
    )
    app.use(cors())
    app.use(
      robots({
        UserAgent: '*',
        Disallow: '/',
      }),
    )
  })

  const logger: winston.Logger = container.get(TYPES.ApiGateway_Logger)

  server.setErrorConfig((app) => {
    app.use((error: Record<string, unknown>, _request: Request, response: Response, _next: NextFunction) => {
      logger.error(error.stack)

      response.status(500).send({
        error: {
          message:
            "Unfortunately, we couldn't handle your request. Please try again or contact our support if the error persists.",
        },
      })
    })
  })

  const serverInstance = server.build()

  if (isConfiguredForAWSProduction) {
    serverInstance.use(AWSXRay.express.closeSegment())
  }

  serverInstance.listen(env.get('PORT'))

  logger.info(`Server started on port ${process.env.PORT}`)
})
