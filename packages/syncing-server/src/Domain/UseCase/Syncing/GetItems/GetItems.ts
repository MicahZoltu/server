import { Result, UseCaseInterface, Uuid } from '@standardnotes/domain-core'
import { Time, TimerInterface } from '@standardnotes/time'

import { Item } from '../../../Item/Item'
import { GetItemsResult } from './GetItemsResult'
import { ItemQuery } from '../../../Item/ItemQuery'
import { ItemTransferCalculatorInterface } from '../../../Item/ItemTransferCalculatorInterface'
import { GetItemsDTO } from './GetItemsDTO'
import { SharedVaultUserRepositoryInterface } from '../../../SharedVault/User/SharedVaultUserRepositoryInterface'
import { ItemRepositoryInterface } from '../../../Item/ItemRepositoryInterface'

export class GetItems implements UseCaseInterface<GetItemsResult> {
  private readonly DEFAULT_ITEMS_LIMIT = 150
  private readonly SYNC_TOKEN_VERSION = 2

  constructor(
    private itemRepository: ItemRepositoryInterface,
    private sharedVaultUserRepository: SharedVaultUserRepositoryInterface,
    private contentSizeTransferLimit: number,
    private itemTransferCalculator: ItemTransferCalculatorInterface,
    private timer: TimerInterface,
    private maxItemsSyncLimit: number,
  ) {}

  async execute(dto: GetItemsDTO): Promise<Result<GetItemsResult>> {
    const lastSyncTimeOrError = this.getLastSyncTime(dto)
    if (lastSyncTimeOrError.isFailed()) {
      return Result.fail(lastSyncTimeOrError.getError())
    }
    const lastSyncTime = lastSyncTimeOrError.getValue()

    const userUuidOrError = Uuid.create(dto.userUuid)
    if (userUuidOrError.isFailed()) {
      return Result.fail(`User uuid is invalid: ${userUuidOrError.getError()}`)
    }
    const userUuid = userUuidOrError.getValue()

    const syncTimeComparison = dto.cursorToken ? '>=' : '>'
    const limit = dto.limit === undefined || dto.limit < 1 ? this.DEFAULT_ITEMS_LIMIT : dto.limit
    const upperBoundLimit = limit < this.maxItemsSyncLimit ? limit : this.maxItemsSyncLimit

    const sharedVaultUsers = await this.sharedVaultUserRepository.findByUserUuid(userUuid)
    const userSharedVaultUuids = sharedVaultUsers.map((sharedVaultUser) => sharedVaultUser.props.sharedVaultUuid.value)

    const exclusiveSharedVaultUuids = dto.sharedVaultUuids
      ? dto.sharedVaultUuids.filter((sharedVaultUuid) => userSharedVaultUuids.includes(sharedVaultUuid))
      : undefined

    const itemQuery: ItemQuery = {
      userUuid: userUuid.value,
      lastSyncTime: lastSyncTime ?? undefined,
      syncTimeComparison,
      contentType: dto.contentType,
      deleted: lastSyncTime ? undefined : false,
      sortBy: 'updated_at_timestamp',
      sortOrder: 'ASC',
      limit: upperBoundLimit,
      includeSharedVaultUuids: !dto.sharedVaultUuids ? userSharedVaultUuids : undefined,
      exclusiveSharedVaultUuids,
    }

    const itemContentSizeDescriptors = await this.itemRepository.findContentSizeForComputingTransferLimit(itemQuery)
    const { uuids, transferLimitBreachedBeforeEndOfItems } = await this.itemTransferCalculator.computeItemUuidsToFetch(
      itemContentSizeDescriptors,
      this.contentSizeTransferLimit,
    )
    let items: Array<Item> = []
    if (uuids.length > 0) {
      items = await this.itemRepository.findAll({
        uuids,
        sortBy: 'updated_at_timestamp',
        sortOrder: 'ASC',
      })
    }

    let cursorToken = undefined
    const thereAreStillMoreItemsToFetch = await this.stillMoreItemsToFetch(itemQuery, upperBoundLimit)
    if (transferLimitBreachedBeforeEndOfItems || thereAreStillMoreItemsToFetch) {
      const lastSyncTime = items[items.length - 1].props.timestamps.updatedAt / Time.MicrosecondsInASecond
      cursorToken = Buffer.from(`${this.SYNC_TOKEN_VERSION}:${lastSyncTime}`, 'utf-8').toString('base64')
    }

    return Result.ok({
      items,
      cursorToken,
      lastSyncTime,
    })
  }

  private async stillMoreItemsToFetch(itemQuery: ItemQuery, upperBoundLimit: number): Promise<boolean> {
    const totalItemsCount = await this.itemRepository.countAll(itemQuery)

    return totalItemsCount > upperBoundLimit
  }

  private getLastSyncTime(dto: GetItemsDTO): Result<number | null> {
    let token = dto.syncToken
    if (dto.cursorToken !== undefined && dto.cursorToken !== null) {
      token = dto.cursorToken
    }

    if (!token) {
      return Result.ok(null)
    }

    const decodedToken = Buffer.from(token, 'base64').toString('utf-8')

    const tokenParts = decodedToken.split(':')
    const version = tokenParts.shift()

    switch (version) {
      case '1':
        return Result.ok(this.timer.convertStringDateToMicroseconds(tokenParts.join(':')))
      case '2':
        return Result.ok(+tokenParts[0] * Time.MicrosecondsInASecond)
      default:
        return Result.fail('Sync token is missing version part')
    }
  }
}
