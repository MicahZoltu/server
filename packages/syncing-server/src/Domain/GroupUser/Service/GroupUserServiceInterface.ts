import { GroupUser } from '../Model/GroupUser'
import { GroupUserPermission } from '../Model/GroupUserPermission'
import { GetGroupUsersDTO } from './GetGroupUsersDTO'

export interface GroupUserServiceInterface {
  addGroupUser(dto: { groupUuid: string; userUuid: string; permissions: GroupUserPermission }): Promise<GroupUser>

  getAllGroupUsersForUser(dto: GetGroupUsersDTO): Promise<GroupUser[]>

  getUserForGroup(dto: { userUuid: string; groupUuid: string }): Promise<GroupUser | null>

  getGroupUsersForGroup(dto: {
    groupUuid: string
    originatorUuid: string
  }): Promise<{ users: GroupUser[]; isAdmin: boolean } | undefined>

  deleteGroupUser(dto: { originatorUuid: string; groupUuid: string; userUuid: string }): Promise<boolean>

  deleteAllGroupUsersForGroup(dto: { originatorUuid: string; groupUuid: string }): Promise<boolean>
}
