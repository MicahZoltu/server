import { DomainEventHandlerInterface, SubscriptionCancelledEvent } from '@standardnotes/domain-events'
import { inject, injectable } from 'inversify'
import {
  AnalyticsActivity,
  AnalyticsStoreInterface,
  Period,
  StatisticsMeasure,
  StatisticsStoreInterface,
} from '@standardnotes/analytics'

import TYPES from '../../Bootstrap/Types'
import { UserSubscriptionRepositoryInterface } from '../Subscription/UserSubscriptionRepositoryInterface'
import { OfflineUserSubscriptionRepositoryInterface } from '../Subscription/OfflineUserSubscriptionRepositoryInterface'
import { UserRepositoryInterface } from '../User/UserRepositoryInterface'
import { GetUserAnalyticsId } from '../UseCase/GetUserAnalyticsId/GetUserAnalyticsId'
import { UserSubscription } from '../Subscription/UserSubscription'

@injectable()
export class SubscriptionCancelledEventHandler implements DomainEventHandlerInterface {
  constructor(
    @inject(TYPES.UserSubscriptionRepository) private userSubscriptionRepository: UserSubscriptionRepositoryInterface,
    @inject(TYPES.OfflineUserSubscriptionRepository)
    private offlineUserSubscriptionRepository: OfflineUserSubscriptionRepositoryInterface,
    @inject(TYPES.UserRepository) private userRepository: UserRepositoryInterface,
    @inject(TYPES.GetUserAnalyticsId) private getUserAnalyticsId: GetUserAnalyticsId,
    @inject(TYPES.AnalyticsStore) private analyticsStore: AnalyticsStoreInterface,
    @inject(TYPES.StatisticsStore) private statisticsStore: StatisticsStoreInterface,
  ) {}
  async handle(event: SubscriptionCancelledEvent): Promise<void> {
    const user = await this.userRepository.findOneByEmail(event.payload.userEmail)
    if (user !== null) {
      const { analyticsId } = await this.getUserAnalyticsId.execute({ userUuid: user.uuid })
      await this.analyticsStore.markActivity([AnalyticsActivity.SubscriptionCancelled], analyticsId, [
        Period.Today,
        Period.ThisWeek,
        Period.ThisMonth,
      ])
    }

    await this.trackSubscriptionStatistics(event)

    if (event.payload.offline) {
      await this.updateOfflineSubscriptionCancelled(event.payload.subscriptionId, event.payload.timestamp)

      return
    }

    await this.updateSubscriptionCancelled(event.payload.subscriptionId, event.payload.timestamp)
  }

  private async updateSubscriptionCancelled(subscriptionId: number, timestamp: number): Promise<void> {
    await this.userSubscriptionRepository.updateCancelled(subscriptionId, true, timestamp)
  }

  private async updateOfflineSubscriptionCancelled(subscriptionId: number, timestamp: number): Promise<void> {
    await this.offlineUserSubscriptionRepository.updateCancelled(subscriptionId, true, timestamp)
  }

  private async trackSubscriptionStatistics(event: SubscriptionCancelledEvent) {
    const subscriptions = await this.userSubscriptionRepository.findBySubscriptionId(event.payload.subscriptionId)
    if (subscriptions.length !== 0) {
      const lastSubscription = subscriptions.shift() as UserSubscription
      if (this.isLegacy5yearSubscriptionPlan(lastSubscription)) {
        return
      }

      const subscriptionLength = event.payload.timestamp - lastSubscription.createdAt
      await this.statisticsStore.incrementMeasure(StatisticsMeasure.SubscriptionLength, subscriptionLength, [
        Period.Today,
        Period.ThisWeek,
        Period.ThisMonth,
      ])

      const lastPurchaseTime = lastSubscription.renewedAt ?? lastSubscription.updatedAt
      const remainingSubscriptionTime = lastSubscription.endsAt - event.payload.timestamp
      const totalSubscriptionTime = lastSubscription.endsAt - lastPurchaseTime

      const remainingSubscriptionPercentage = Math.floor((remainingSubscriptionTime / totalSubscriptionTime) * 100)

      await this.statisticsStore.incrementMeasure(
        StatisticsMeasure.RemainingSubscriptionTimePercentage,
        remainingSubscriptionPercentage,
        [Period.Today, Period.ThisWeek, Period.ThisMonth],
      )
    }
  }

  private isLegacy5yearSubscriptionPlan(subscription: UserSubscription) {
    const fourYearsInMicroseconds = 126_230_400_000_000

    return subscription.endsAt - subscription.createdAt > fourYearsInMicroseconds
  }
}
