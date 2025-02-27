export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled_active',
  DELINQUENT = 'delinquent'
}

// Subscription will have an end date one month in the future when it's created
// If a subscription is active, it will be billed one day after the end date
// If billing succeeds, the end date will be extended by the length of the billing cycle.
// If the billing fails, the user will be sent an email that asks them to update their payment method, and the status will be change to delinquent
// Billing and paid services will not cease until a user cancels their subscription, which will change its status to cancelled_active
// If a subscription is cancelled_active, paid services will continue until the end date
// Once a cancelled_active subscription reaches the end date, paid services will cease

// Let the code decide how many tokens to award per period for each subscription
// Every user object is created with a subscription,
// Depending on how they onboarded, it will be either the free plan or the paid plan

export class SubscriptionModel {
  constructor(
    public id: number,
    public subscriptionId: string,
    public userId: number,
    public planId: number,
    public startDate: Date,
    public endDate: Date,
    public status: SubscriptionStatus,
    public createdAt: Date,
    public updatedAt: Date,
  ) { }
}

export class PlanModel {
  constructor(
    public id: number,
    public planId: string,
    public name: string,
    public description: string,
    public price: number,
    public createdAt: Date,
    public updatedAt: Date,
  ) { }
}

export class BillingTransactionModel {
  constructor(
    public id: number,
    public subscriptionId: string,
    public createdAt: Date,
    public amount: number,
    public success: boolean,
    public memo: string,
  ) { }
}
