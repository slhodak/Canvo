-- This file contains the initial schema for the database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(user_id),
    UNIQUE (author_id, title)
);

-- Transformations table
CREATE TABLE IF NOT EXISTS transformations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    author_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(user_id),
    UNIQUE (author_id, title)
);

-- Relationships table for blocks to each other
CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_block_id INTEGER NOT NULL,
    child_block_id INTEGER NOT NULL,
    transformation_id INTEGER NOT NULL,
    FOREIGN KEY (parent_block_id) REFERENCES blocks(id),
    FOREIGN KEY (child_block_id) REFERENCES blocks(id),
    FOREIGN KEY (transformation_id) REFERENCES transformations(id)
);
