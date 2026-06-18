mod auth;
mod keycloak;
mod errors;
mod profile;          // ← add this

use axum::Router;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use sqlx::PgPool;     // ← add this

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    // ── DB pool ───────────────────────────────────────────────────────────────
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL not set");
    let pool = PgPool::connect(&database_url).await.expect("DB connection failed");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .nest("/api/auth",    auth::router())
        .nest("/api/user",    profile::router(pool))   // ← add this
        .layer(cors);

    let port = std::env::var("SERVER_PORT").unwrap_or("8080".into());
    let addr = format!("0.0.0.0:{}", port);

    println!("Server running on http://{}", addr);

    let listener = TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}