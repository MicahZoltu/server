import { Uuid } from '@standardnotes/domain-core'

import { Revision } from './Revision'
import { RevisionMetadata } from './RevisionMetadata'

export interface RevisionRepositoryInterface {
  countByUserUuid(userUuid: Uuid): Promise<number>
  removeByUserUuid(userUuid: Uuid): Promise<void>
  removeOneByUuid(revisionUuid: Uuid, userUuid: Uuid): Promise<void>
  findOneByUuid(revisionUuid: Uuid, userUuid: Uuid, sharedVaultUuids: Uuid[]): Promise<Revision | null>
  findByItemUuid(itemUuid: Uuid): Promise<Array<Revision>>
  findMetadataByItemId(itemUuid: Uuid, userUuid: Uuid, sharedVaultUuids: Uuid[]): Promise<Array<RevisionMetadata>>
  updateUserUuid(itemUuid: Uuid, userUuid: Uuid): Promise<void>
  findByUserUuid(dto: { userUuid: Uuid; offset?: number; limit?: number }): Promise<Array<Revision>>
  insert(revision: Revision): Promise<boolean>
  update(revision: Revision): Promise<boolean>
  clearSharedVaultAndKeySystemAssociations(dto: { itemUuid?: Uuid; sharedVaultUuid: Uuid }): Promise<void>
}
