use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Invalid credentials")]
    Unauthorized,
    #[error("Email already exists")]
    Conflict,
    #[error("Keycloak error: {0}")]
    Keycloak(String),
    #[error("Internal error")]
    Internal,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED,   self.to_string()),
            AppError::Conflict     => (StatusCode::CONFLICT,       self.to_string()),
            AppError::Keycloak(m)  => (StatusCode::BAD_GATEWAY,    m.clone()),
            AppError::Internal     => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}