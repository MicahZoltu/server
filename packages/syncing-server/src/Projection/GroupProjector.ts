import { Group } from './../Domain/Group/Model/Group'
import { ProjectorInterface } from './ProjectorInterface'
import { GroupProjection } from './GroupProjection'

export class GroupProjector implements ProjectorInterface<Group, GroupProjection> {
  projectSimple(_group: Group): GroupProjection {
    throw Error('not implemented')
  }

  projectCustom(_projectionType: string, group: Group): GroupProjection {
    const fullProjection = this.projectFull(group)

    return {
      ...fullProjection,
      user_uuid: group.userUuid,
    }
  }

  projectFull(group: Group): GroupProjection {
    return {
      uuid: group.uuid,
      user_uuid: group.userUuid,
      specified_items_key_uuid: group.specifiedItemsKeyUuid,
      group_key_timestamp: group.groupKeyTimestamp,
      created_at_timestamp: group.createdAtTimestamp,
      updated_at_timestamp: group.updatedAtTimestamp,
    }
  }
}
