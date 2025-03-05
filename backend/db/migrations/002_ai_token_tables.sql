-- Create table to store user token balances
CREATE TABLE IF NOT EXISTS user_token_balance (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_balance INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create table to log token transactions
CREATE TABLE IF NOT EXISTS token_transactions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id TEXT NOT NULL,
    transaction_id TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL, -- negative for spending, positive for adding tokens
    transaction_type VARCHAR(50) NOT NULL, -- e.g., 'purchase', 'spend', 'bonus'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
