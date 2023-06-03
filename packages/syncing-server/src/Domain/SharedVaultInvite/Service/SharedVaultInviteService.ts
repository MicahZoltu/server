import { TimerInterface } from '@standardnotes/time'
import { SharedVaultInvite } from '../Model/SharedVaultInvite'
import { SharedVaultInviteFactoryInterface } from '../Factory/SharedVaultInviteFactoryInterface'
import { v4 as uuidv4 } from 'uuid'
import { SharedVaultInviteRepositoryInterface } from '../Repository/SharedVaultInviteRepositoryInterface'
import { SharedVaultInviteServiceInterface } from './SharedVaultInviteServiceInterface'
import { GetUserSharedVaultInvitesDTO } from './GetUserSharedVaultInvitesDTO'
import { SharedVaultsRepositoryInterface } from '../../SharedVault/Repository/SharedVaultRepositoryInterface'
import { SharedVaultUserServiceInterface } from '../../SharedVaultUser/Service/SharedVaultUserServiceInterface'
import { SharedVaultInviteType } from '../Model/SharedVaultInviteType'
import { CreateInviteDTO } from './CreateInviteDTO'
import { UpdateInviteDTO } from './UpdateInviteDTO'

export class SharedVaultInviteService implements SharedVaultInviteServiceInterface {
  constructor(
    private sharedVaultRepository: SharedVaultsRepositoryInterface,
    private sharedVaultInviteRepository: SharedVaultInviteRepositoryInterface,
    private sharedVaultInviteFactory: SharedVaultInviteFactoryInterface,
    private sharedVaultUserService: SharedVaultUserServiceInterface,
    private timer: TimerInterface,
  ) {}

  async createInvite(dto: CreateInviteDTO): Promise<SharedVaultInvite | null> {
    const sharedVault = await this.sharedVaultRepository.findByUuid(dto.sharedVaultUuid)
    if (!sharedVault || sharedVault.userUuid !== dto.originatorUuid) {
      return null
    }

    const timestamp = this.timer.getTimestampInMicroseconds()

    const sharedVaultInvite = this.sharedVaultInviteFactory.create({
      uuid: uuidv4(),
      user_uuid: dto.userUuid,
      shared_vault_uuid: dto.sharedVaultUuid,
      inviter_uuid: dto.originatorUuid,
      inviter_public_key: dto.inviterPublicKey,
      encrypted_vault_key_content: dto.encryptedVaultKeyContent,
      invite_type: dto.inviteType,
      permissions: dto.permissions,
      created_at_timestamp: timestamp,
      updated_at_timestamp: timestamp,
    })

    return this.sharedVaultInviteRepository.create(sharedVaultInvite)
  }

  async updateInvite(dto: UpdateInviteDTO): Promise<SharedVaultInvite | null> {
    const sharedVaultInvite = await this.sharedVaultInviteRepository.findByUuid(dto.inviteUuid)
    if (!sharedVaultInvite || sharedVaultInvite.inviterUuid !== dto.originatorUuid) {
      return null
    }

    sharedVaultInvite.inviterPublicKey = dto.inviterPublicKey
    sharedVaultInvite.encryptedVaultKeyContent = dto.encryptedVaultKeyContent
    if (dto.permissions) {
      sharedVaultInvite.permissions = dto.permissions
    }
    sharedVaultInvite.updatedAtTimestamp = this.timer.getTimestampInMicroseconds()

    return this.sharedVaultInviteRepository.save(sharedVaultInvite)
  }

  getInvitesForUser(dto: GetUserSharedVaultInvitesDTO): Promise<SharedVaultInvite[]> {
    return this.sharedVaultInviteRepository.findAll(dto)
  }

  getOutboundInvitesForUser(dto: { userUuid: string }): Promise<SharedVaultInvite[]> {
    return this.sharedVaultInviteRepository.findAll({
      inviterUuid: dto.userUuid,
    })
  }

  async deleteAllInboundInvites(dto: { userUuid: string }): Promise<void> {
    const inboundInvites = await this.sharedVaultInviteRepository.findAll({
      userUuid: dto.userUuid,
    })

    for (const invite of inboundInvites) {
      await this.sharedVaultInviteRepository.remove(invite)
    }
  }

  async getInvitesForSharedVault(dto: {
    sharedVaultUuid: string
    originatorUuid: string
  }): Promise<SharedVaultInvite[] | undefined> {
    const sharedVault = await this.sharedVaultRepository.findByUuid(dto.sharedVaultUuid)
    if (!sharedVault) {
      return undefined
    }

    const isUserSharedVaultAdmin = sharedVault && sharedVault.userUuid === dto.originatorUuid
    if (!isUserSharedVaultAdmin) {
      return undefined
    }

    const users = await this.sharedVaultInviteRepository.findAllForSharedVault({ sharedVaultUuid: dto.sharedVaultUuid })

    return users
  }

  async acceptInvite(dto: { originatorUuid: string; inviteUuid: string }): Promise<boolean> {
    const invite = await this.sharedVaultInviteRepository.findByUuid(dto.inviteUuid)
    if (!invite) {
      return false
    }

    const isAuthorized = invite.userUuid === dto.originatorUuid
    if (!isAuthorized) {
      return false
    }

    if (invite.inviteType === SharedVaultInviteType.Join) {
      const addedUser = await this.sharedVaultUserService.addSharedVaultUser({
        userUuid: dto.originatorUuid,
        sharedVaultUuid: invite.sharedVaultUuid,
        permissions: invite.permissions,
      })

      if (!addedUser) {
        return false
      }
    }

    await this.sharedVaultInviteRepository.remove(invite)

    return true
  }

  async declineInvite(dto: { originatorUuid: string; inviteUuid: string }): Promise<boolean> {
    const invite = await this.sharedVaultInviteRepository.findByUuid(dto.inviteUuid)
    if (!invite) {
      return false
    }

    const isAuthorized = invite.userUuid === dto.originatorUuid
    if (!isAuthorized) {
      return false
    }

    await this.sharedVaultInviteRepository.remove(invite)

    return true
  }

  async deleteInvite(dto: { originatorUuid: string; inviteUuid: string }): Promise<boolean> {
    const invite = await this.sharedVaultInviteRepository.findByUuid(dto.inviteUuid)
    if (!invite) {
      return false
    }

    const isAuthorized = invite.inviterUuid === dto.originatorUuid || invite.userUuid === dto.originatorUuid
    if (!isAuthorized) {
      return false
    }

    await this.sharedVaultInviteRepository.remove(invite)

    return true
  }

  async deleteAllInvitesForSharedVault(dto: { originatorUuid: string; sharedVaultUuid: string }): Promise<boolean> {
    const sharedVault = await this.sharedVaultRepository.findByUuid(dto.sharedVaultUuid)
    if (!sharedVault || sharedVault.userUuid !== dto.originatorUuid) {
      return false
    }

    const sharedVaultInvites = await this.sharedVaultInviteRepository.findAllForSharedVault({
      sharedVaultUuid: dto.sharedVaultUuid,
    })
    for (const sharedVaultInvite of sharedVaultInvites) {
      await this.sharedVaultInviteRepository.remove(sharedVaultInvite)
    }

    return true
  }
}
