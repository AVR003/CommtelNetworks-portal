use axum::{Router, routing::get, Json, extract::State};
use axum::{extract::FromRequestParts, http::{request::Parts, StatusCode}};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use crate::{errors::AppError, keycloak};

pub fn router(pool: PgPool) -> Router {
    Router::new()
        .route("/me", get(get_me).patch(update_me))
        .with_state(pool)
}

// ── JWT extractor ─────────────────────────────────────────────────────────────
pub struct AuthUser {
    pub sub: String,
}

#[axum::async_trait]
impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let token = parts.headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or((StatusCode::UNAUTHORIZED, "Missing token"))?;

        let sub = extract_sub(token)
            .ok_or((StatusCode::UNAUTHORIZED, "Invalid token"))?;

        Ok(AuthUser { sub })
    }
}

fn extract_sub(token: &str) -> Option<String> {
    let payload = token.split('.').nth(1)?;

    let decoded = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        payload,
    ).ok()?;

    let json: serde_json::Value = serde_json::from_slice(&decoded).ok()?;
    json.get("sub")?.as_str().map(|s| s.to_string())
}

// ── DB types ──────────────────────────────────────────────────────────────────
#[derive(Serialize, sqlx::FromRow)]
struct DbProfile {
    id:         String,
    sub:        String,
    bio:        Option<String>,
    avatar_url: Option<String>,
}

// ── GET /api/me ───────────────────────────────────────────────────────────────
#[derive(Serialize)]
struct MeResponse {
    id:                String,
    sub:               String,
    username:          String,
    email:             Option<String>,
    first_name:        Option<String>,
    last_name:         Option<String>,
    created_timestamp: Option<i64>,
    bio:               Option<String>,
    avatar_url:        Option<String>,
}

async fn get_me(
    State(pool): State<PgPool>,
    user: AuthUser,
) -> Result<Json<MeResponse>, AppError> {
    let kc_user = keycloak::get_user(&user.sub).await?;

    // Step 1: insert if not exists (separate query — sqlx doesn't allow multiple statements)
    sqlx::query!(
        "INSERT INTO user_profiles (sub) VALUES ($1) ON CONFLICT (sub) DO NOTHING",
        user.sub
    )
    .execute(&pool)
    .await
    .map_err(|_| AppError::Internal)?;

    // Step 2: fetch the row
    let db = sqlx::query_as!(
        DbProfile,
        r#"SELECT id::text as "id!", sub, bio, avatar_url FROM user_profiles WHERE sub = $1"#,
        user.sub
    )
    .fetch_one(&pool)
    .await
    .map_err(|_| AppError::Internal)?;

    Ok(Json(MeResponse {
        id:                db.id,
        sub:               db.sub,
        username:          kc_user.username,
        email:             kc_user.email,
        first_name:        kc_user.first_name,
        last_name:         kc_user.last_name,
        created_timestamp: kc_user.created_timestamp,
        bio:               db.bio,
        avatar_url:        db.avatar_url,
    }))
}

// ── PATCH /api/me ─────────────────────────────────────────────────────────────
#[derive(Deserialize)]
struct UpdateReq {
    bio:        Option<String>,
    avatar_url: Option<String>,
}

async fn update_me(
    State(pool): State<PgPool>,
    user: AuthUser,
    Json(body): Json<UpdateReq>,
) -> Result<Json<DbProfile>, AppError> {
    let updated = sqlx::query_as!(
        DbProfile,
        r#"
        UPDATE user_profiles
        SET
            bio        = COALESCE($2, bio),
            avatar_url = COALESCE($3, avatar_url),
            updated_at = NOW()
        WHERE sub = $1
        RETURNING id::text as "id!", sub, bio, avatar_url
        "#,
        user.sub,
        body.bio,
        body.avatar_url
    )
    .fetch_one(&pool)
    .await
    .map_err(|_| AppError::Internal)?;

    Ok(Json(updated))
}