use axum::{Router, routing::post, Json};
use serde::Deserialize;
use crate::{keycloak, errors::AppError};

pub fn router() -> Router {
    Router::new()
        .route("/login",   post(login))
        .route("/register", post(register))
        .route("/refresh", post(refresh))
        .route("/logout",  post(logout))
}

// ── Login ─────────────────────────────────────────────────────────────────────
#[derive(Deserialize)]
struct LoginReq {
    email:    String,
    password: String,
}

async fn login(Json(body): Json<LoginReq>) -> Result<Json<serde_json::Value>, AppError> {
    let tokens = keycloak::login(&body.email, &body.password).await?;
    Ok(Json(serde_json::json!({
        "access_token":  tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "expires_in":    tokens.expires_in,
    })))
}

// ── Refresh ───────────────────────────────────────────────────────────────────
#[derive(Deserialize)]
struct RefreshReq {
    refresh_token: String,
}

async fn refresh(Json(body): Json<RefreshReq>) -> Result<Json<serde_json::Value>, AppError> {
    let tokens = keycloak::refresh(&body.refresh_token).await?;
    Ok(Json(serde_json::json!({
        "access_token":  tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "expires_in":    tokens.expires_in,
    })))
}

// ── Logout ────────────────────────────────────────────────────────────────────
#[derive(Deserialize)]
struct LogoutReq {
    refresh_token: String,
}

async fn logout(Json(body): Json<LogoutReq>) -> Result<Json<serde_json::Value>, AppError> {
    keycloak::logout(&body.refresh_token).await?;
    Ok(Json(serde_json::json!({ "message": "Logged out successfully" })))
}

// ── Register ──────────────────────────────────────────────────────────────────
#[derive(Deserialize)]
struct RegisterReq {
    username:   String,
    #[serde(rename = "firstName")]
    first_name: String,
    #[serde(rename = "lastName")]
    last_name:  String,
    email:      String,
    password:   String,
    org:        Option<String>,
}

async fn register(Json(body): Json<RegisterReq>) -> Result<Json<serde_json::Value>, AppError> {
    println!("REGISTER REQUEST RECEIVED");

    keycloak::register(
        &body.username,
        &body.first_name,
        &body.last_name,
        &body.email,
        &body.password,
    ).await?;

    println!("KEYCLOAK REGISTER SUCCESS");

    Ok(Json(serde_json::json!({ "message": "User created successfully" })))
}
