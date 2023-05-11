const TYPES = {
  DBConnection: Symbol.for('DBConnection'),
  Logger: Symbol.for('Logger'),
  Redis: Symbol.for('Redis'),
  SNS: Symbol.for('SNS'),
  SQS: Symbol.for('SQS'),
  S3: Symbol.for('S3'),
  Env: Symbol.for('Env'),
  // Repositories
  ItemRepository: Symbol.for('ItemRepository'),
  ItemShareRepository: Symbol.for('ItemShareRepository'),
  // ORM
  ORMItemRepository: Symbol.for('ORMItemRepository'),
  ORMItemShareRepository: Symbol.for('ORMItemShareRepository'),
  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),
  // Projectors
  ItemProjector: Symbol.for('ItemProjector'),
  SavedItemProjector: Symbol.for('SavedItemProjector'),
  ItemConflictProjector: Symbol.for('ItemConflictProjector'),
  // env vars
  REDIS_URL: Symbol.for('REDIS_URL'),
  SNS_TOPIC_ARN: Symbol.for('SNS_TOPIC_ARN'),
  SNS_AWS_REGION: Symbol.for('SNS_AWS_REGION'),
  SQS_QUEUE_URL: Symbol.for('SQS_QUEUE_URL'),
  SQS_AWS_REGION: Symbol.for('SQS_AWS_REGION'),
  AUTH_JWT_SECRET: Symbol.for('AUTH_JWT_SECRET'),
  EXTENSIONS_SERVER_URL: Symbol.for('EXTENSIONS_SERVER_URL'),
  AUTH_SERVER_URL: Symbol.for('AUTH_SERVER_URL'),
  S3_AWS_REGION: Symbol.for('S3_AWS_REGION'),
  S3_BACKUP_BUCKET_NAME: Symbol.for('S3_BACKUP_BUCKET_NAME'),
  EMAIL_ATTACHMENT_MAX_BYTE_SIZE: Symbol.for('EMAIL_ATTACHMENT_MAX_BYTE_SIZE'),
  REVISIONS_FREQUENCY: Symbol.for('REVISIONS_FREQUENCY'),
  NEW_RELIC_ENABLED: Symbol.for('NEW_RELIC_ENABLED'),
  VERSION: Symbol.for('VERSION'),
  CONTENT_SIZE_TRANSFER_LIMIT: Symbol.for('CONTENT_SIZE_TRANSFER_LIMIT'),
  MAX_ITEMS_LIMIT: Symbol.for('MAX_ITEMS_LIMIT'),
  FILE_UPLOAD_PATH: Symbol.for('FILE_UPLOAD_PATH'),
  VALET_TOKEN_SECRET: Symbol.for('VALET_TOKEN_SECRET'),
  VALET_TOKEN_TTL: Symbol.for('VALET_TOKEN_TTL'),
  // use cases
  SyncItems: Symbol.for('SyncItems'),
  CheckIntegrity: Symbol.for('CheckIntegrity'),
  GetItem: Symbol.for('GetItem'),
  ShareItem: Symbol.for('ShareItem'),
  GetSharedItem: Symbol.for('GetSharedItem'),
  UpdateSharedItem: Symbol.for('UpdateSharedItem'),
  GetUserItemShares: Symbol.for('GetUserItemShares'),
  CreateSharedFileValetToken: Symbol.for('CreateSharedFileValetToken'),
  // Handlers
  AccountDeletionRequestedEventHandler: Symbol.for('AccountDeletionRequestedEventHandler'),
  DuplicateItemSyncedEventHandler: Symbol.for('DuplicateItemSyncedEventHandler'),
  EmailBackupRequestedEventHandler: Symbol.for('EmailBackupRequestedEventHandler'),
  ItemRevisionCreationRequestedEventHandler: Symbol.for('ItemRevisionCreationRequestedEventHandler'),
  // Services
  ContentDecoder: Symbol.for('ContentDecoder'),
  DomainEventPublisher: Symbol.for('DomainEventPublisher'),
  DomainEventSubscriberFactory: Symbol.for('DomainEventSubscriberFactory'),
  DomainEventFactory: Symbol.for('DomainEventFactory'),
  DomainEventMessageHandler: Symbol.for('DomainEventMessageHandler'),
  HTTPClient: Symbol.for('HTTPClient'),
  ItemService: Symbol.for('ItemService'),
  ItemShareService: Symbol.for('ItemShareService'),
  Timer: Symbol.for('Timer'),
  SyncResponseFactory20161215: Symbol.for('SyncResponseFactory20161215'),
  SyncResponseFactory20200115: Symbol.for('SyncResponseFactory20200115'),
  SyncResponseFactoryResolver: Symbol.for('SyncResponseFactoryResolver'),
  AuthHttpService: Symbol.for('AuthHttpService'),
  ExtensionsHttpService: Symbol.for('ExtensionsHttpService'),
  ItemBackupService: Symbol.for('ItemBackupService'),
  ItemSaveValidator: Symbol.for('ItemSaveValidator'),
  OwnershipFilter: Symbol.for('OwnershipFilter'),
  TimeDifferenceFilter: Symbol.for('TimeDifferenceFilter'),
  UuidFilter: Symbol.for('UuidFilter'),
  ContentTypeFilter: Symbol.for('ContentTypeFilter'),
  ContentFilter: Symbol.for('ContentFilter'),
  ItemFactory: Symbol.for('ItemFactory'),
  ItemShareFactory: Symbol.for('ItemShareFactory'),
  ItemTransferCalculator: Symbol.for('ItemTransferCalculator'),
  ValetTokenEncoder: Symbol.for('ValetTokenEncoder'),
}

export default TYPES
