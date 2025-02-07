-- This file contains the initial schema for the database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    _id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_email TEXT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_expiration TIMESTAMP NOT NULL,

    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    _id TEXT UNIQUE NOT NULL,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,

    FOREIGN KEY (author_id) REFERENCES users(_id) ON DELETE CASCADE
);

-- Nodes table
CREATE TYPE state_value AS (
    string_value TEXT,
    number_value DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    coordinates point NOT NULL,
    author_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    _id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    inputs INTEGER NOT NULL,
    outputs INTEGER NOT NULL,
    runs_automatically BOOLEAN NOT NULL,
    properties JSONB NOT NULL,
    input_state state_value[] NOT NULL DEFAULT '{}',
    output_state state_value[] NOT NULL DEFAULT '{}',
    is_dirty BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY (author_id) REFERENCES users(_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(_id) ON DELETE CASCADE,

    CONSTRAINT valid_input_number CHECK (inputs >= 0),
    CONSTRAINT valid_output_number CHECK (outputs >= 0)
);

-- Connections table
CREATE TABLE IF NOT EXISTS connections (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    author_id TEXT NOT NULL,
    project_id INTEGER NOT NULL,
    from_node TEXT NOT NULL,
    from_output INTEGER NOT NULL,
    to_node TEXT NOT NULL,
    to_input INTEGER NOT NULL,

    FOREIGN KEY (author_id) REFERENCES users(_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (from_node) REFERENCES nodes(_id) ON DELETE CASCADE,
    FOREIGN KEY (to_node) REFERENCES nodes(_id) ON DELETE CASCADE,

    CONSTRAINT valid_output_number CHECK (from_output >= 0),
    CONSTRAINT valid_input_number CHECK (to_input >= 0)
);
