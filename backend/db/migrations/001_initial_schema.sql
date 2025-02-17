-- This file contains the initial schema for the database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id TEXT UNIQUE NOT NULL,
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

    project_id TEXT UNIQUE NOT NULL,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,

    FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Nodes table
CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    coordinates point NOT NULL,
    author_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    node_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    inputs INTEGER NOT NULL,
    outputs INTEGER NOT NULL,
    node_run_type TEXT NOT NULL,
    properties JSONB NOT NULL,
    output_state JSONB NOT NULL DEFAULT '{}',

    FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,

    CONSTRAINT valid_input_number CHECK (inputs >= 0),
    CONSTRAINT valid_output_number CHECK (outputs >= 0)
);

-- Connections table
CREATE TABLE IF NOT EXISTS connections (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    author_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    connection_id TEXT UNIQUE NOT NULL,
    from_node TEXT NOT NULL,
    from_output INTEGER NOT NULL,
    to_node TEXT NOT NULL,
    to_input INTEGER NOT NULL,

    FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (from_node) REFERENCES nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (to_node) REFERENCES nodes(node_id) ON DELETE CASCADE,

    CONSTRAINT valid_output_number CHECK (from_output >= 0),
    CONSTRAINT valid_input_number CHECK (to_input >= 0)
);
