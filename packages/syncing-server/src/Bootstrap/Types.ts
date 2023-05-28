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
  VaultRepository: Symbol.for('VaultRepository'),
  VaultUserRepository: Symbol.for('VaultUserRepository'),
  ContactRepository: Symbol.for('ContactRepository'),
  VaultInviteRepository: Symbol.for('VaultInviteRepository'),

  // ORM
  ORMItemRepository: Symbol.for('ORMItemRepository'),
  ORMVaultRepository: Symbol.for('ORMVaultRepository'),
  ORMVaultUserRepository: Symbol.for('ORMVaultUserRepository'),
  ORMContactRepository: Symbol.for('ORMContactRepository'),
  ORMVaultInviteRepository: Symbol.for('ORMVaultInviteRepository'),

  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),

  // Projectors
  ItemProjector: Symbol.for('ItemProjector'),
  SavedItemProjector: Symbol.for('SavedItemProjector'),
  ItemConflictProjector: Symbol.for('ItemConflictProjector'),
  VaultProjector: Symbol.for('VaultProjector'),
  VaultUserProjector: Symbol.for('VaultUserProjector'),
  ContactProjector: Symbol.for('ContactProjector'),
  VaultInviteProjector: Symbol.for('VaultInviteProjector'),

  // Services
  VaultService: Symbol.for('VaultService'),
  VaultUserService: Symbol.for('VaultUserService'),
  ContactService: Symbol.for('ContactService'),
  VaultInviteService: Symbol.for('VaultInviteService'),

  // Factories
  ItemFactory: Symbol.for('ItemFactory'),
  VaultFactory: Symbol.for('VaultFactory'),
  VaultUserFactory: Symbol.for('VaultUserFactory'),
  ContactFactory: Symbol.for('ContactFactory'),
  VaultInviteFactory: Symbol.for('VaultInviteFactory'),

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
  GetGlobalItem: Symbol.for('GetGlobalItem'),
  CreateVaultFileReadValetToken: Symbol.for('CreateVaultFileReadValetToken'),
  // Handlers
  UserCredentialsChangedEventHandler: Symbol.for('UserCredentialsChangedEventHandler'),
  AccountDeletionRequestedEventHandler: Symbol.for('AccountDeletionRequestedEventHandler'),
  DuplicateItemSyncedEventHandler: Symbol.for('DuplicateItemSyncedEventHandler'),
  EmailBackupRequestedEventHandler: Symbol.for('EmailBackupRequestedEventHandler'),
  ItemRevisionCreationRequestedEventHandler: Symbol.for('ItemRevisionCreationRequestedEventHandler'),

  ContentDecoder: Symbol.for('ContentDecoder'),
  DomainEventPublisher: Symbol.for('DomainEventPublisher'),
  DomainEventSubscriberFactory: Symbol.for('DomainEventSubscriberFactory'),
  DomainEventFactory: Symbol.for('DomainEventFactory'),
  DomainEventMessageHandler: Symbol.for('DomainEventMessageHandler'),
  HTTPClient: Symbol.for('HTTPClient'),
  ItemService: Symbol.for('ItemService'),
  Timer: Symbol.for('Timer'),
  SyncResponseFactory20161215: Symbol.for('SyncResponseFactory20161215'),
  SyncResponseFactory20200115: Symbol.for('SyncResponseFactory20200115'),
  SyncResponseFactoryResolver: Symbol.for('SyncResponseFactoryResolver'),
  AuthHttpService: Symbol.for('AuthHttpService'),
  ExtensionsHttpService: Symbol.for('ExtensionsHttpService'),
  ItemBackupService: Symbol.for('ItemBackupService'),
  ItemSaveValidator: Symbol.for('ItemSaveValidator'),
  OwnershipFilter: Symbol.for('OwnershipFilter'),
  SnjsVersionFilter: Symbol.for('SnjsVersionFilter'),
  TimeDifferenceFilter: Symbol.for('TimeDifferenceFilter'),
  UuidFilter: Symbol.for('UuidFilter'),
  ContentTypeFilter: Symbol.for('ContentTypeFilter'),
  ContentFilter: Symbol.for('ContentFilter'),
  ItemTransferCalculator: Symbol.for('ItemTransferCalculator'),
  ValetTokenEncoder: Symbol.for('ValetTokenEncoder'),
}

export default TYPES
