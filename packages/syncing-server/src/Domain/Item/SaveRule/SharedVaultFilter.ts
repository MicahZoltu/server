import { ItemSaveValidationDTO } from '../SaveValidator/ItemSaveValidationDTO'
import { ItemSaveRuleResult } from './ItemSaveRuleResult'
import { ItemSaveRuleInterface } from './ItemSaveRuleInterface'
import { SharedVaultUserServiceInterface } from '../../SharedVaultUser/Service/SharedVaultUserServiceInterface'
import { SharedVaultUserPermission } from '../../SharedVaultUser/Model/SharedVaultUserPermission'
import { ContentType } from '@standardnotes/common'
import { ConflictType } from '../../../Tmp/ConflictType'
import {
  SharedVaultSaveOperation,
  AddToSharedVaultSaveOperation,
  RemoveFromSharedVaultSaveOperation,
  MoveToOtherSharedVaultSaveOperation,
  SaveToSharedVaultSaveOperation,
  CreateToSharedVaultSaveOperation,
} from './SharedVaultSaveOperation'
import { GetSharedVaultSaveOperation } from './GetSharedVaultSaveOperation'

export class SharedVaultFilter implements ItemSaveRuleInterface {
  constructor(private sharedVaultUserService: SharedVaultUserServiceInterface) {}

  async check(dto: ItemSaveValidationDTO): Promise<ItemSaveRuleResult> {
    const operation = GetSharedVaultSaveOperation(dto)
    if (!operation) {
      return {
        passed: true,
      }
    }

    if (dto.itemHash.shared_vault_uuid && !dto.itemHash.key_system_identifier) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInvalidState)
    }

    return this.getResultForOperation(operation)
  }

  private async getResultForOperation(operation: SharedVaultSaveOperation): Promise<ItemSaveRuleResult> {
    if (operation.type === 'add-to-shared-vault') {
      return this.handleAddToSharedVaultOperation(operation)
    } else if (operation.type === 'remove-from-shared-vault') {
      return this.handleRemoveFromSharedVaultOperation(operation)
    } else if (operation.type === 'move-to-other-shared-vault') {
      return this.handleMoveToOtherSharedVaultOperation(operation)
    } else if (operation.type === 'save-to-shared-vault') {
      return this.handleSaveToSharedVaultOperation(operation)
    } else if (operation.type === 'create-to-shared-vault') {
      return this.handleCreateToSharedVaultOperation(operation)
    }

    throw new Error(`Unsupported sharedVault operation: ${operation}`)
  }

  private isAuthorizedToSaveContentType(contentType: ContentType, permissions: SharedVaultUserPermission): boolean {
    if (contentType === ContentType.KeySystemItemsKey) {
      return permissions === 'admin'
    }

    return true
  }

  private buildFailResult(operation: SharedVaultSaveOperation, type: ConflictType) {
    const includeServerItem = [
      ConflictType.SharedVaultInvalidState,
      ConflictType.SharedVaultInsufficientPermissionsError,
    ].includes(type)

    return {
      passed: false,
      conflict: {
        unsavedItem: operation.incomingItem,
        serverItem: includeServerItem ? operation.existingItem : undefined,
        type,
      },
    }
  }

  private buildSuccessValue(): ItemSaveRuleResult {
    return {
      passed: true,
    }
  }

  private async handleAddToSharedVaultOperation(operation: AddToSharedVaultSaveOperation): Promise<ItemSaveRuleResult> {
    const sharedVaultPermissions = await this.getSharedVaultPermissions(operation.userUuid, operation.sharedVaultUuid)
    if (!sharedVaultPermissions) {
      return this.buildFailResult(operation, ConflictType.SharedVaultNotMemberError)
    }

    if (operation.existingItem.deleted || operation.incomingItem.deleted) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInvalidState)
    }

    if (!this.isAuthorizedToSaveContentType(operation.incomingItem.content_type, sharedVaultPermissions)) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    if (sharedVaultPermissions === 'read') {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    if (operation.existingItem.userUuid !== operation.userUuid) {
      return this.buildFailResult(operation, ConflictType.UuidConflict)
    }

    return this.buildSuccessValue()
  }

  private async handleRemoveFromSharedVaultOperation(
    operation: RemoveFromSharedVaultSaveOperation,
  ): Promise<ItemSaveRuleResult> {
    const sharedVaultPermissions = await this.getSharedVaultPermissions(operation.userUuid, operation.sharedVaultUuid)
    if (!sharedVaultPermissions) {
      return this.buildFailResult(operation, ConflictType.SharedVaultNotMemberError)
    }

    if (operation.existingItem.deleted || operation.incomingItem.deleted) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInvalidState)
    }

    if (operation.existingItem.userUuid !== operation.userUuid) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    if (!this.isAuthorizedToSaveContentType(operation.incomingItem.content_type, sharedVaultPermissions)) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    if (sharedVaultPermissions === 'read') {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    return this.buildSuccessValue()
  }

  private async handleMoveToOtherSharedVaultOperation(
    operation: MoveToOtherSharedVaultSaveOperation,
  ): Promise<ItemSaveRuleResult> {
    const sourceSharedVaultPermissions = await this.getSharedVaultPermissions(
      operation.userUuid,
      operation.sharedVaultUuid,
    )
    const targetSharedVaultPermissions = await this.getSharedVaultPermissions(
      operation.userUuid,
      operation.targetSharedVaultUuid,
    )

    if (!sourceSharedVaultPermissions || !targetSharedVaultPermissions) {
      return this.buildFailResult(operation, ConflictType.SharedVaultNotMemberError)
    }

    if (operation.existingItem.deleted || operation.incomingItem.deleted) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInvalidState)
    }

    if (sourceSharedVaultPermissions === 'read' || targetSharedVaultPermissions === 'read') {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    if (
      !this.isAuthorizedToSaveContentType(operation.incomingItem.content_type, sourceSharedVaultPermissions) ||
      !this.isAuthorizedToSaveContentType(operation.incomingItem.content_type, targetSharedVaultPermissions)
    ) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    return this.buildSuccessValue()
  }

  private async handleSaveToSharedVaultOperation(
    operation: SaveToSharedVaultSaveOperation,
  ): Promise<ItemSaveRuleResult> {
    const sharedVaultPermissions = await this.getSharedVaultPermissions(operation.userUuid, operation.sharedVaultUuid)

    if (!sharedVaultPermissions) {
      return this.buildFailResult(operation, ConflictType.SharedVaultNotMemberError)
    }

    if (!this.isAuthorizedToSaveContentType(operation.incomingItem.content_type, sharedVaultPermissions)) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    if (sharedVaultPermissions === 'read') {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    return this.buildSuccessValue()
  }

  private async handleCreateToSharedVaultOperation(
    operation: CreateToSharedVaultSaveOperation,
  ): Promise<ItemSaveRuleResult> {
    const sharedVaultPermissions = await this.getSharedVaultPermissions(operation.userUuid, operation.sharedVaultUuid)

    if (!sharedVaultPermissions) {
      return this.buildFailResult(operation, ConflictType.SharedVaultNotMemberError)
    }

    if (!this.isAuthorizedToSaveContentType(operation.incomingItem.content_type, sharedVaultPermissions)) {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    if (sharedVaultPermissions === 'read') {
      return this.buildFailResult(operation, ConflictType.SharedVaultInsufficientPermissionsError)
    }

    return this.buildSuccessValue()
  }

  private async getSharedVaultPermissions(
    userUuid: string,
    sharedVaultUuid: string,
  ): Promise<SharedVaultUserPermission | undefined> {
    const sharedVaultUser = await this.sharedVaultUserService.getUserForSharedVault({
      userUuid,
      sharedVaultUuid: sharedVaultUuid,
    })

    if (sharedVaultUser) {
      return sharedVaultUser.permissions
    }

    return undefined
  }
}
