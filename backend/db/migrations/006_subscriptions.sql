BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    plan_id TEXT UNIQUE NOT NULL,
    tier INTEGER UNIQUE NOT NULL,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    subscription_id TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 month',
    status VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (plan_id) REFERENCES plans(plan_id)
);

CREATE TABLE IF NOT EXISTS billing_transactions (
    id SERIAL PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    success BOOLEAN NOT NULL,
    memo TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id)
);

-- Create the default free plan
INSERT INTO plans (plan_id, tier, name, description, price)
SELECT uuid_generate_v4(), 0, 'Free', 'free for all users', 0
WHERE NOT EXISTS (
    SELECT 1 FROM plans WHERE plans.tier = 0
);

-- For every existing user without a plan, create a subscription with the free plan
INSERT INTO subscriptions (subscription_id, user_id, plan_id, start_date, end_date, status)
SELECT uuid_generate_v4(), user_id, (SELECT plan_id FROM plans WHERE tier = 0), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month', 'active'
FROM users
WHERE NOT EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE subscriptions.user_id = users.user_id
);

COMMIT;
