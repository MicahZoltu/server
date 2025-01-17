import { ControllerContainerInterface, MapperInterface } from '@standardnotes/domain-core'
import { BaseHttpController, results } from 'inversify-express-utils'
import { ErrorTag } from '@standardnotes/responses'
import { Request, Response } from 'express'
import { Logger } from 'winston'

import { DeleteSetting } from '../../../Domain/UseCase/DeleteSetting/DeleteSetting'
import { GetSetting } from '../../../Domain/UseCase/GetSetting/GetSetting'
import { GetAllSettingsForUser } from '../../../Domain/UseCase/GetAllSettingsForUser/GetAllSettingsForUser'
import { SetSettingValue } from '../../../Domain/UseCase/SetSettingValue/SetSettingValue'
import { Setting } from '../../../Domain/Setting/Setting'
import { SubscriptionSetting } from '../../../Domain/Setting/SubscriptionSetting'
import { SubscriptionSettingHttpRepresentation } from '../../../Mapping/Http/SubscriptionSettingHttpRepresentation'
import { SettingHttpRepresentation } from '../../../Mapping/Http/SettingHttpRepresentation'
import { TriggerPostSettingUpdateActions } from '../../../Domain/UseCase/TriggerPostSettingUpdateActions/TriggerPostSettingUpdateActions'

export class BaseSettingsController extends BaseHttpController {
  constructor(
    protected doGetSettings: GetAllSettingsForUser,
    protected doGetSetting: GetSetting,
    protected setSettingValue: SetSettingValue,
    protected triggerPostSettingUpdateActions: TriggerPostSettingUpdateActions,
    protected doDeleteSetting: DeleteSetting,
    protected settingHttMapper: MapperInterface<Setting, SettingHttpRepresentation>,
    protected subscriptionSettingHttpMapper: MapperInterface<
      SubscriptionSetting,
      SubscriptionSettingHttpRepresentation
    >,
    protected logger: Logger,
    private controllerContainer?: ControllerContainerInterface,
  ) {
    super()

    if (this.controllerContainer !== undefined) {
      this.controllerContainer.register('auth.users.getSettings', this.getSettings.bind(this))
      this.controllerContainer.register('auth.users.getSetting', this.getSetting.bind(this))
      this.controllerContainer.register('auth.users.updateSetting', this.updateSetting.bind(this))
      this.controllerContainer.register('auth.users.deleteSetting', this.deleteSetting.bind(this))
    }
  }

  async getSettings(request: Request, response: Response): Promise<results.JsonResult> {
    if (request.params.userUuid !== response.locals.user.uuid) {
      return this.json(
        {
          error: {
            message: 'Operation not allowed.',
          },
        },
        401,
      )
    }

    const { userUuid } = request.params
    const result = await this.doGetSettings.execute({ userUuid })
    if (result.isFailed()) {
      return this.json(
        {
          error: {
            message: result.getError(),
          },
        },
        400,
      )
    }
    const settingsAndSubscriptionSettings = result.getValue()

    const settingsHttpRepresentation = settingsAndSubscriptionSettings.settings.map((settingAndValue) => ({
      ...this.settingHttMapper.toProjection(settingAndValue.setting),
      value: settingAndValue.decryptedValue,
    }))

    const subscriptionSettingsHttpRepresentation = settingsAndSubscriptionSettings.subscriptionSettings.map(
      (settingAndValue) => ({
        ...this.subscriptionSettingHttpMapper.toProjection(settingAndValue.setting),
        value: settingAndValue.decryptedValue,
      }),
    )

    const httpRepresentation = settingsHttpRepresentation.concat(subscriptionSettingsHttpRepresentation)

    return this.json({
      success: true,
      settings: httpRepresentation,
    })
  }

  async getSetting(request: Request, response: Response): Promise<results.JsonResult> {
    if (request.params.userUuid !== response.locals.user.uuid) {
      return this.json(
        {
          error: {
            message: 'Operation not allowed.',
          },
        },
        401,
      )
    }

    const { userUuid, settingName } = request.params
    const resultOrError = await this.doGetSetting.execute({
      allowSensitiveRetrieval: true,
      userUuid,
      decrypted: true,
      settingName: settingName.toUpperCase(),
    })
    if (resultOrError.isFailed()) {
      return this.json(
        {
          error: {
            message: resultOrError.getError(),
          },
        },
        400,
      )
    }

    const settingAndValue = resultOrError.getValue()

    if (settingAndValue.setting.props.sensitive) {
      return this.json({
        success: true,
      })
    }

    const settingHttpReprepesentation = {
      ...this.settingHttMapper.toProjection(settingAndValue.setting),
      value: settingAndValue.decryptedValue,
    }

    return this.json({
      success: true,
      setting: settingHttpReprepesentation,
    })
  }

  async updateSetting(request: Request, response: Response): Promise<results.JsonResult | results.StatusCodeResult> {
    if (response.locals.readOnlyAccess) {
      return this.json(
        {
          error: {
            tag: ErrorTag.ReadOnlyAccess,
            message: 'Session has read-only access.',
          },
        },
        401,
      )
    }

    if (request.params.userUuid !== response.locals.user.uuid) {
      return this.json(
        {
          error: {
            message: 'Operation not allowed.',
          },
        },
        401,
      )
    }

    const { name, value } = request.body

    const result = await this.setSettingValue.execute({
      settingName: name,
      value,
      userUuid: response.locals.user.uuid,
      checkUserPermissions: true,
    })

    if (result.isFailed()) {
      return this.json(
        {
          error: {
            message: result.getError(),
          },
        },
        400,
      )
    }
    const setting = result.getValue()

    const triggerResult = await this.triggerPostSettingUpdateActions.execute({
      updatedSettingName: setting.props.name,
      userUuid: response.locals.user.uuid,
      userEmail: response.locals.user.email,
      unencryptedValue: value,
    })
    if (triggerResult.isFailed()) {
      this.logger.error(`Failed to trigger post setting update actions: ${triggerResult.getError()}`)
    }

    return this.json({
      success: true,
      setting: setting.props.sensitive ? undefined : this.settingHttMapper.toProjection(setting),
    })
  }

  async deleteSetting(request: Request, response: Response): Promise<results.JsonResult> {
    if (response.locals.readOnlyAccess) {
      return this.json(
        {
          error: {
            tag: ErrorTag.ReadOnlyAccess,
            message: 'Session has read-only access.',
          },
        },
        401,
      )
    }

    if (request.params.userUuid !== response.locals.user.uuid) {
      return this.json(
        {
          error: {
            message: 'Operation not allowed.',
          },
        },
        401,
      )
    }

    const { userUuid, settingName } = request.params

    const result = await this.doDeleteSetting.execute({
      userUuid,
      settingName,
    })

    if (result.success) {
      return this.json(result)
    }

    return this.json(result, 400)
  }
}
