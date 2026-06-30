# Nexus Portal

A full-stack authentication and user profile system built with **Rust (Axum)**, **React**, **Keycloak (OpenID Connect)**, and **PostgreSQL**. Built during my internship as a mentor-assigned project to design a production-style identity and profile management flow from scratch.

## Overview

Nexus Portal separates identity management from application-specific data: Keycloak owns authentication and core identity (login, registration, tokens), while PostgreSQL stores custom profile data tied to each user. The backend bridges the two, exposing a clean API the React frontend consumes.

## Architecture

```
React (Vite) Frontend  →  Rust/Axum Backend  →  Keycloak (OIDC)
                                ↓
                          PostgreSQL (SQLx)
```

- **Frontend**: React 19 + Vite, with JWT-based session handling and automatic token refresh so users stay logged in without manual re-authentication.
- **Backend**: Rust with the Axum framework, using SQLx for type-safe PostgreSQL queries. Handles registration (via the Keycloak Admin API), login/logout, and a hybrid profile system that merges identity data from Keycloak with custom fields stored in Postgres.
- **Auth**: Keycloak running in Docker, configured as the OpenID Connect provider. The backend validates JWTs issued by Keycloak on every protected request.
- **Database**: PostgreSQL, storing application-specific user profile data not native to Keycloak's user model.

## Screenshots

| Login | Profile | Live Session / Token Status |
|---|---|---|
| ![Login Screen](./screenshots/login.png) | ![Profile Page](./screenshots/profile.png) | ![Session Dashboard](./screenshots/session.png) |

## Key Features

- User registration through the Keycloak Admin API (no manual realm console work needed per user)
- Login/logout with proper OIDC token lifecycle management
- Hybrid user profiles combining Keycloak identity data with custom Postgres fields
- Automatic JWT refresh on the frontend, so sessions don't silently expire mid-use
- CORS and JWT audience validation configured for a clean separation between frontend, backend, and auth server

## Tech Stack

`Rust` · `Axum` · `SQLx` · `PostgreSQL` · `React 19` · `Vite` · `Keycloak` · `OpenID Connect` · `Docker`

## Running Locally

### Prerequisites
- Docker
- Rust (with Cargo)
- Node.js + npm

### 1. Start Keycloak and PostgreSQL
```bash
docker compose up -d
```
Configure a realm and client in the Keycloak admin console (`http://localhost:8180`), or import an existing realm export if provided.

### 2. Configure environment variables
Create a `.env` file inside `nexus-backend/`:
```dotenv
KEYCLOAK_URL=http://localhost:8180
KEYCLOAK_REALM=your-realm-name
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
SERVER_PORT=8081
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/your_db_name
```

### 3. Run the backend
```bash
cd nexus-backend
cargo run
```

### 4. Run the frontend
```bash
cd nexus-portal
npm install
npm run dev
```

The app will be available at the local URL Vite outputs (typically `http://localhost:5173`).

## Notes

This project was built as part of a mentor-assigned internship task, focused on understanding production-style authentication patterns (OIDC, token lifecycle, identity vs. application data separation) rather than rolling custom auth logic.
