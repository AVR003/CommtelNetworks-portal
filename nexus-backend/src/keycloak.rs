use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::errors::AppError;

fn kc_url()           -> String { std::env::var("KEYCLOAK_URL").unwrap() }
fn realm()            -> String { std::env::var("KEYCLOAK_REALM").unwrap() }
fn client_id()        -> String { std::env::var("KEYCLOAK_CLIENT_ID").unwrap() }
fn client_secret()    -> String { std::env::var("KEYCLOAK_CLIENT_SECRET").unwrap() }

#[derive(Deserialize, Serialize)]
pub struct TokenResponse {
    pub access_token:  String,
    pub refresh_token: String,
    pub expires_in:    u64,
    pub token_type:    String,
}

// ── Login ─────────────────────────────────────────────────────────────────────
pub async fn login(email: &str, password: &str) -> Result<TokenResponse, AppError> {
    let url = format!("{}/realms/{}/protocol/openid-connect/token", kc_url(), realm());

    let res = Client::new()
        .post(&url)
        .form(&[
            ("grant_type",    "password"),
            ("client_id",     &client_id()),
            ("client_secret", &client_secret()),
            ("username",      email),
            ("password",      password),
            ("scope",         "openid profile email"),
        ])
        .send().await.map_err(|_| AppError::Internal)?;

    if res.status() == 401 { return Err(AppError::Unauthorized); }

    res.json::<TokenResponse>().await.map_err(|_| AppError::Internal)
}

// ── Refresh ───────────────────────────────────────────────────────────────────
pub async fn refresh(refresh_token: &str) -> Result<TokenResponse, AppError> {
    let url = format!("{}/realms/{}/protocol/openid-connect/token", kc_url(), realm());

    let res = Client::new()
        .post(&url)
        .form(&[
            ("grant_type",    "refresh_token"),
            ("client_id",     &client_id()),
            ("client_secret", &client_secret()),
            ("refresh_token", refresh_token),
        ])
        .send().await.map_err(|_| AppError::Internal)?;

    if !res.status().is_success() { return Err(AppError::Unauthorized); }

    res.json::<TokenResponse>().await.map_err(|_| AppError::Internal)
}

// ── Logout ────────────────────────────────────────────────────────────────────
pub async fn logout(refresh_token: &str) -> Result<(), AppError> {
    let url = format!("{}/realms/{}/protocol/openid-connect/logout", kc_url(), realm());

    // Keycloak's logout endpoint invalidates the session server-side
    Client::new()
        .post(&url)
        .form(&[
            ("client_id",     &client_id()),
            ("client_secret", &client_secret()),
            ("refresh_token", &refresh_token.to_string()),
        ])
        .send().await.map_err(|_| AppError::Internal)?;

    Ok(())
}

// ── Admin token (internal) ────────────────────────────────────────────────────
async fn admin_token() -> Result<String, AppError> {
    let url = format!("{}/realms/{}/protocol/openid-connect/token", kc_url(), realm());

    println!("Admin token URL: {}", url);

    #[derive(Deserialize)]
    struct Tok { access_token: String }

    let res = Client::new()
        .post(&url)
        .form(&[
            ("grant_type",    "client_credentials"),
            ("client_id",     &client_id()),
            ("client_secret", &client_secret()),
        ])
        .send().await.map_err(|_| AppError::Internal)?;

    res.json::<Tok>().await.map(|t| t.access_token).map_err(|_| AppError::Internal)
}

// ── Register ──────────────────────────────────────────────────────────────────
pub async fn register(
    username:   &str,
    first_name: &str,
    last_name:  &str,
    email:      &str,
    password:   &str,
) -> Result<(), AppError> {
    let token = admin_token().await?;

    let url = format!("{}/admin/realms/{}/users", kc_url(), realm());

    println!(">>> register URL: {}", url);

    let body = json!({
        "username":  username,   // ← now a separate field, not email
        "email":     email,
        "firstName": first_name,
        "lastName":  last_name,
        "enabled":   true,
        "credentials": [{
            "type":      "password",
            "value":     password,
            "temporary": false
        }]
    });

    let res = Client::new()
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send().await.map_err(|_| AppError::Internal)?;

    match res.status().as_u16() {
        201 => Ok(()),
        409 => Err(AppError::Conflict),
        _   => Err(AppError::Keycloak(format!("Keycloak returned {}", res.status()))),
    }
}


#[derive(Deserialize, Serialize)]
pub struct KeycloakUser {
    pub id:                String,
    pub username:          String,
    pub email:             Option<String>,
    #[serde(rename = "firstName")]
    pub first_name:        Option<String>,
    #[serde(rename = "lastName")]
    pub last_name:         Option<String>,
    #[serde(rename = "createdTimestamp")]
    pub created_timestamp: Option<i64>,
}

pub async fn get_user(user_id: &str) -> Result<KeycloakUser, AppError> {
    let token = admin_token().await?;
    let url = format!("{}/admin/realms/{}/users/{}", kc_url(), realm(), user_id);

    let res = Client::new()
        .get(&url)
        .bearer_auth(&token)
        .send().await.map_err(|_| AppError::Internal)?;

    if !res.status().is_success() {
        return Err(AppError::Internal);
    }

    res.json::<KeycloakUser>().await.map_err(|_| AppError::Internal)
}
