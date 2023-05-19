import { ContactProjection } from '../../../Projection/ContactProjection'
import { GroupUserProjection } from '../../../Projection/GroupUserProjection'
import { ItemConflictProjection } from '../../../Projection/ItemConflictProjection'
import { ItemProjection } from '../../../Projection/ItemProjection'
import { SavedItemProjection } from '../../../Projection/SavedItemProjection'

export type SyncResponse20200115 = {
  retrieved_items: Array<ItemProjection>
  saved_items: Array<SavedItemProjection>
  conflicts: Array<ItemConflictProjection>
  sync_token: string
  cursor_token?: string
  group_keys: Array<GroupUserProjection>
  contacts: Array<ContactProjection>
}
