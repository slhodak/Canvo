-- This file contains the initial schema for the database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    _id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invite_code TEXT UNIQUE NOT NULL,
    user_email TEXT NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_email TEXT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_expiration TIMESTAMP NOT NULL,
    FOREIGN KEY (user_email) REFERENCES users(email)
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    _id TEXT UNIQUE NOT NULL,
    author_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(_id),
    UNIQUE (author_id)
);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    _id TEXT UNIQUE NOT NULL,
    group_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(_id),
    FOREIGN KEY (group_id) REFERENCES groups(_id),
    UNIQUE (author_id, label)
);

-- Transformations table
CREATE TABLE IF NOT EXISTS transformations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    _id TEXT UNIQUE NOT NULL,
    group_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    input_block_id TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    prompt TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(_id),
    FOREIGN KEY (group_id) REFERENCES groups(_id),
    FOREIGN KEY (input_block_id) REFERENCES blocks(_id),
    UNIQUE (author_id, label)
);

-- Transformations output Blocks table
CREATE TABLE IF NOT EXISTS transformation_outputs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transformation_id TEXT NOT NULL,
    output_block_id TEXT NOT NULL,
    FOREIGN KEY (transformation_id) REFERENCES transformations(_id),
    FOREIGN KEY (output_block_id) REFERENCES blocks(_id)
);
