import { Request, Response } from 'express'
import { inject } from 'inversify'
import { BaseHttpController, controller, httpGet, httpPost, results } from 'inversify-express-utils'
import TYPES from '../../Bootstrap/Types'
import { WorkspacesController } from '../../Controller/WorkspacesController'

@controller('/workspaces', TYPES.ApiGatewayAuthMiddleware)
export class InversifyExpressWorkspacesController extends BaseHttpController {
  constructor(@inject(TYPES.WorkspacesController) private workspacesController: WorkspacesController) {
    super()
  }

  @httpPost('/')
  async create(request: Request, response: Response): Promise<results.JsonResult> {
    const result = await this.workspacesController.createWorkspace({
      ...request.body,
      ownerUuid: response.locals.user.uuid,
    })

    return this.json(result.data, result.status)
  }

  @httpGet('/')
  async listWorkspaces(response: Response): Promise<results.JsonResult> {
    const result = await this.workspacesController.listWorkspaces({
      userUuid: response.locals.user.uuid,
    })

    return this.json(result.data, result.status)
  }

  @httpGet('/:workspaceUuid/users')
  async listWorkspaceUsers(request: Request, response: Response): Promise<results.JsonResult> {
    const result = await this.workspacesController.listWorkspaceUsers({
      userUuid: response.locals.user.uuid,
      workspaceUuid: request.params.workspaceUuid,
    })

    return this.json(result.data, result.status)
  }

  @httpPost('/:workspaceUuid/invites')
  async inviteToWorkspace(request: Request, response: Response): Promise<results.JsonResult> {
    if (request.params.workspaceUuid !== request.body.workspaceUuid) {
      return this.json(
        {
          error: {
            message: 'Invalid workspace uuid.',
          },
        },
        400,
      )
    }

    const result = await this.workspacesController.inviteToWorkspace({
      ...request.body,
      inviterUuid: response.locals.user.uuid,
    })

    return this.json(result.data, result.status)
  }
}
