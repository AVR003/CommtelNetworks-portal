import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8081";

// ─── Token helpers ────────────────────────────────────────────────────────────
function saveTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem("access_token",  access_token);
  localStorage.setItem("refresh_token", refresh_token);
  localStorage.setItem("token_expiry", Date.now() + (expires_in - 30) * 1000);
}
function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("token_expiry");
}
function isTokenValid() {
  const expiry = localStorage.getItem("token_expiry");
  return expiry && Date.now() < Number(expiry);
}
function timeUntilExpiry() {
  const expiry = localStorage.getItem("token_expiry");
  if (!expiry) return null;
  const secs = Math.floor((Number(expiry) - Date.now()) / 1000);
  if (secs <= 0) return "Expired";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}
function truncateToken(t) {
  if (!t) return "—";
  return t.slice(0, 24) + "…" + t.slice(-8);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #05060F; }

  .ar {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif;
    padding: 20px;
    background: #05060F;
    position: relative; overflow: hidden;
  }
  .orb { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
  .orb-1 { width:500px;height:500px;top:-120px;left:-100px;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%);animation:drift1 12s ease-in-out infinite alternate; }
  .orb-2 { width:420px;height:420px;bottom:-100px;right:-80px;background:radial-gradient(circle,rgba(0,212,255,.14) 0%,transparent 70%);animation:drift2 15s ease-in-out infinite alternate; }
  .orb-3 { width:300px;height:300px;top:50%;left:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(168,85,247,.07) 0%,transparent 70%);animation:drift3 9s ease-in-out infinite alternate; }
  @keyframes drift1{from{transform:translate(0,0) scale(1)}to{transform:translate(40px,60px) scale(1.1)}}
  @keyframes drift2{from{transform:translate(0,0) scale(1)}to{transform:translate(-50px,-40px) scale(1.08)}}
  @keyframes drift3{from{transform:translate(-50%,-50%) scale(1)}to{transform:translate(-45%,-55%) scale(1.15)}}
  .ar::before{content:'';position:fixed;inset:0;background-image:radial-gradient(rgba(255,255,255,.04) 1px,transparent 1px);background-size:28px 28px;pointer-events:none;z-index:0;}

  .card { position:relative;z-index:2;width:100%;max-width:468px;background:rgba(13,16,35,.75);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.07);border-radius:24px;overflow:hidden;box-shadow:0 0 0 1px rgba(99,102,241,.08),0 32px 80px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.05); }
  .card-bar { height:2px;background:linear-gradient(90deg,#6366F1,#06B6D4,#A855F7,#6366F1);background-size:300% 100%;animation:barflow 4s linear infinite; }
  @keyframes barflow{0%{background-position:0% 0}100%{background-position:300% 0}}
  .card-head { padding:32px 36px 24px;border-bottom:1px solid rgba(255,255,255,.05); }
  .brand { display:flex;align-items:center;gap:10px;margin-bottom:24px; }
  .brand-logo { width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#6366F1 0%,#06B6D4 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(99,102,241,.45); }
  .brand-logo svg{width:20px;height:20px;}
  .brand-text{font-size:16px;font-weight:700;color:#F1F5F9;letter-spacing:-.01em;}
  .brand-pill{margin-left:auto;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#06B6D4;background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);border-radius:20px;padding:3px 10px;}
  .tabs{display:flex;gap:2px;background:rgba(0,0,0,.3);border-radius:12px;padding:3px;}
  .tab{flex:1;padding:10px;border:none;background:transparent;color:#475569;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;transition:all .25s ease;}
  .tab.on{color:#F1F5F9;background:rgba(99,102,241,.15);box-shadow:0 0 0 1px rgba(99,102,241,.25),inset 0 1px 0 rgba(255,255,255,.06);}
  .tab:hover:not(.on){color:#94A3B8;}
  .card-body{padding:28px 36px 32px;}
  .form-head{margin-bottom:24px;}
  .form-heading{font-size:24px;font-weight:800;letter-spacing:-.03em;color:#F8FAFC;line-height:1.2;margin-bottom:6px;}
  .form-heading span{background:linear-gradient(90deg,#818CF8,#22D3EE);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .form-sub{font-size:13.5px;color:#475569;line-height:1.5;}
  .form-sub b{color:#818CF8;font-weight:500;cursor:pointer;}
  .form-sub b:hover{text-decoration:underline;}
  .fields{display:flex;flex-direction:column;gap:14px;}
  .frow{display:flex;gap:10px;}
  .frow .fw{flex:1;}
  .fw{display:flex;flex-direction:column;gap:5px;}
  .flabel{font-size:11.5px;font-weight:600;color:#475569;letter-spacing:.06em;text-transform:uppercase;}
  .finput-wrap{position:relative;}
  .finput-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#2A3456;pointer-events:none;display:flex;transition:color .2s;}
  .finput-wrap:focus-within .finput-icon{color:#6366F1;}
  .finput{width:100%;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:13px 13px 13px 40px;font-family:'Outfit',sans-serif;font-size:14px;color:#E2E8F0;outline:none;transition:border-color .2s,box-shadow .2s,background .2s;-webkit-appearance:none;}
  .finput::placeholder{color:#1E2D44;}
  .finput:focus{border-color:rgba(99,102,241,.5);background:rgba(0,0,0,.5);box-shadow:0 0 0 3px rgba(99,102,241,.1),inset 0 1px 0 rgba(255,255,255,.03);}
  .finput.pr{padding-right:40px;}
  .finput-right{position:absolute;right:13px;top:50%;transform:translateY(-50%);color:#2A3456;cursor:pointer;display:flex;transition:color .2s;}
  .finput-right:hover{color:#6366F1;}
  .forgot-row{display:flex;justify-content:flex-end;margin-top:-2px;}
  .forgot{font-size:12.5px;color:#334155;cursor:pointer;transition:color .2s;}
  .forgot:hover{color:#818CF8;}
  .ferr{font-size:12px;color:#F87171;display:flex;align-items:center;gap:4px;margin-top:2px;}
  .api-err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:12px 14px;font-size:13px;color:#FCA5A5;display:flex;align-items:flex-start;gap:8px;line-height:1.5;}
  .sbar-wrap{display:flex;gap:4px;margin-top:7px;}
  .sbar-wrap .seg{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.06);transition:background .3s;}
  .slabel{font-size:11px;margin-top:4px;color:#475569;}
  .cta{width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#6366F1 0%,#06B6D4 100%);color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;letter-spacing:-.01em;cursor:pointer;position:relative;overflow:hidden;transition:transform .15s,box-shadow .2s,opacity .2s;box-shadow:0 4px 24px rgba(99,102,241,.35),0 1px 0 rgba(255,255,255,.1) inset;}
  .cta::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.12),transparent 60%);opacity:0;transition:opacity .2s;}
  .cta:hover::before{opacity:1;}
  .cta:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(99,102,241,.45);}
  .cta:active{transform:translateY(0);}
  .cta:disabled{opacity:.55;cursor:not-allowed;transform:none!important;box-shadow:none!important;}
  .spinner{width:15px;height:15px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:8px;animation:spin .65s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .terms{font-size:11.5px;color:#1E2D44;text-align:center;line-height:1.7;}
  .terms a{color:#334155;text-decoration:underline;cursor:pointer;}
  .terms a:hover{color:#818CF8;}
  .card-foot{padding:14px 36px 18px;border-top:1px solid rgba(255,255,255,.04);display:flex;align-items:center;justify-content:space-between;}
  .foot-secure{display:flex;align-items:center;gap:7px;font-size:11px;color:#1E2D44;}
  .foot-dot{width:6px;height:6px;background:#22C55E;border-radius:50%;box-shadow:0 0 8px rgba(34,197,94,.7);animation:pulse 2.5s ease-in-out infinite;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .foot-ver{font-family:'JetBrains Mono',monospace;font-size:10px;color:#0F172A;letter-spacing:.08em;}

  /* ── Dashboard ── */
  .dash { min-height:100vh;font-family:'Outfit',sans-serif;background:#05060F;color:#E2E8F0;position:relative;overflow-x:hidden; }
  .dash-nav { position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:60px;background:rgba(5,6,15,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.05); }
  .dash-brand { display:flex;align-items:center;gap:10px; }
  .dash-brand-logo { width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#6366F1 0%,#06B6D4 100%);display:flex;align-items:center;justify-content:center; }
  .dash-brand-logo svg { width:16px;height:16px; }
  .dash-brand-name { font-size:15px;font-weight:700;color:#F1F5F9; }
  .dash-nav-right { display:flex;align-items:center;gap:12px; }
  .token-badge { display:flex;align-items:center;gap:6px;font-size:11px;font-family:'JetBrains Mono',monospace;color:#22C55E;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.15);border-radius:20px;padding:4px 12px; }
  .token-badge.expiring { color:#F59E0B;background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.2); }
  .token-badge-dot { width:6px;height:6px;border-radius:50%;background:currentColor;animation:pulse 2s infinite; }
  .logout-btn { display:flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid rgba(239,68,68,.2);border-radius:10px;background:rgba(239,68,68,.06);color:#F87171;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s; }
  .logout-btn:hover { background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.35); }
  .dash-main { max-width:1100px;margin:0 auto;padding:40px 32px; }
  .dash-welcome { margin-bottom:36px; }
  .dash-welcome h1 { font-size:28px;font-weight:800;letter-spacing:-.03em;color:#F8FAFC;margin-bottom:6px; }
  .dash-welcome h1 span { background:linear-gradient(90deg,#818CF8,#22D3EE);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .dash-welcome p { font-size:14px;color:#475569; }
  .stat-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:36px; }
  .stat-card { background:rgba(13,16,35,.75);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:22px 24px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s; }
  .stat-card:hover { border-color:rgba(99,102,241,.2);transform:translateY(-2px); }
  .stat-card::before { content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(99,102,241,.04) 0%,transparent 60%);pointer-events:none; }
  .stat-icon { width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:18px; }
  .stat-label { font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#475569;margin-bottom:6px; }
  .stat-value { font-size:26px;font-weight:800;letter-spacing:-.03em;color:#F8FAFC; }
  .stat-sub { font-size:12px;color:#334155;margin-top:4px; }
  .token-panel { background:rgba(13,16,35,.75);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:24px;margin-bottom:24px; }
  .token-panel h2 { font-size:14px;font-weight:700;color:#94A3B8;letter-spacing:.04em;text-transform:uppercase;margin-bottom:16px; }
  .token-row { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04); }
  .token-row:last-child { border-bottom:none; }
  .token-key { font-size:12px;color:#475569;font-family:'JetBrains Mono',monospace; }
  .token-val { font-size:12px;color:#E2E8F0;font-family:'JetBrains Mono',monospace;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .token-val.green { color:#22C55E; }
  .token-val.yellow { color:#F59E0B; }
  .refresh-btn { display:inline-flex;align-items:center;gap:6px;padding:8px 16px;margin-top:16px;border:1px solid rgba(99,102,241,.3);border-radius:10px;background:rgba(99,102,241,.08);color:#818CF8;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s; }
  .refresh-btn:hover { background:rgba(99,102,241,.15); }
  .refresh-btn:disabled { opacity:.4;cursor:not-allowed; }
  .refresh-spin { animation:spin .65s linear infinite;display:inline-block; }

  /* ── Nav profile button ── */
  .nav-profile-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 14px 6px 6px;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 10px;
    background: rgba(255,255,255,.04);
    color: #94A3B8;
    font-family: 'Outfit', sans-serif;
    font-size: 13px; font-weight: 500;
    cursor: pointer;
    transition: all .2s;
  }
  .nav-profile-btn:hover { background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.25);color:#E2E8F0; }
  .nav-avatar {
    width: 26px; height: 26px; border-radius: 8px;
    background: linear-gradient(135deg,#6366F1,#06B6D4);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: #fff;
  }

  /* ── Profile page ── */
  .profile-page { max-width: 700px; margin: 0 auto; padding: 40px 32px; }

  .profile-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; color: #475569; cursor: pointer;
    margin-bottom: 28px; transition: color .2s;
    background: none; border: none; font-family: 'Outfit', sans-serif;
  }
  .profile-back:hover { color: #818CF8; }

  .profile-header {
    display: flex; align-items: center; gap: 20px;
    background: rgba(13,16,35,.75);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 20px;
    padding: 28px;
    margin-bottom: 20px;
  }
  .profile-avatar-lg {
    width: 72px; height: 72px; border-radius: 18px;
    background: linear-gradient(135deg,#6366F1,#06B6D4);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; font-weight: 800; color: #fff;
    flex-shrink: 0;
    overflow: hidden;
  }
  .profile-avatar-lg img { width: 100%; height: 100%; object-fit: cover; }
  .profile-header-info { flex: 1; min-width: 0; }
  .profile-name { font-size: 22px; font-weight: 800; color: #F8FAFC; letter-spacing: -.02em; margin-bottom: 3px; }
  .profile-username { font-size: 13px; color: #475569; font-family: 'JetBrains Mono', monospace; margin-bottom: 6px; }
  .profile-email { font-size: 13px; color: #64748B; }
  .profile-joined { font-size: 11px; color: #334155; margin-top: 8px; font-family: 'JetBrains Mono', monospace; }

  .profile-section {
    background: rgba(13,16,35,.75);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 16px;
  }
  .profile-section h3 {
    font-size: 11px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: #475569; margin-bottom: 16px;
  }

  .profile-field { margin-bottom: 16px; }
  .profile-field:last-child { margin-bottom: 0; }
  .profile-field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: #475569; letter-spacing: .06em; text-transform: uppercase;
    margin-bottom: 6px;
  }
  .profile-input {
    width: 100%; background: rgba(0,0,0,.35);
    border: 1px solid rgba(255,255,255,.06); border-radius: 12px;
    padding: 12px 14px; font-family: 'Outfit', sans-serif;
    font-size: 14px; color: #E2E8F0; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .profile-input:focus {
    border-color: rgba(99,102,241,.5);
    box-shadow: 0 0 0 3px rgba(99,102,241,.1);
  }
  .profile-input::placeholder { color: #1E2D44; }
  .profile-textarea {
    width: 100%; background: rgba(0,0,0,.35);
    border: 1px solid rgba(255,255,255,.06); border-radius: 12px;
    padding: 12px 14px; font-family: 'Outfit', sans-serif;
    font-size: 14px; color: #E2E8F0; outline: none;
    resize: vertical; min-height: 90px;
    transition: border-color .2s, box-shadow .2s;
  }
  .profile-textarea:focus {
    border-color: rgba(99,102,241,.5);
    box-shadow: 0 0 0 3px rgba(99,102,241,.1);
  }
  .profile-textarea::placeholder { color: #1E2D44; }

  .profile-save-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
  .profile-save-btn {
    padding: 11px 24px; border: none; border-radius: 12px;
    background: linear-gradient(135deg,#6366F1 0%,#06B6D4 100%);
    color: #fff; font-family: 'Outfit', sans-serif;
    font-size: 14px; font-weight: 700; cursor: pointer;
    transition: transform .15s, box-shadow .2s, opacity .2s;
    box-shadow: 0 4px 16px rgba(99,102,241,.3);
  }
  .profile-save-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,.4); }
  .profile-save-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
  .profile-save-msg { font-size: 13px; color: #22C55E; }
  .profile-save-msg.err { color: #F87171; }

  .profile-kv-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .profile-kv {
    background: rgba(0,0,0,.2); border-radius: 10px; padding: 12px 14px;
  }
  .profile-kv-key { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #334155; margin-bottom: 4px; }
  .profile-kv-val { font-size: 13px; color: #94A3B8; font-family: 'JetBrains Mono', monospace; }

  .profile-loading {
    display: flex; align-items: center; justify-content: center;
    padding: 80px; color: #475569; font-size: 14px; gap: 10px;
  }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
const MailIcon   = () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>;
const UserIcon   = () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const LockIcon   = () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const BriefIcon  = () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const LogoutIcon = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const RefreshIcon= () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const BackIcon   = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;
const BrandLogo  = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pwdScore(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
const sColors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];
const sLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

// ─── Profile Page ─────────────────────────────────────────────────────────────
function ProfilePage({ onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bio, setBio]         = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_BASE}/api/user/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: bio || null, avatar_url: avatarUrl || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(p => ({ ...p, bio: updated.bio, avatar_url: updated.avatar_url }));
        setSaveMsg("Changes saved.");
      } else {
        setSaveMsg("Save failed. Try again.");
      }
    } catch {
      setSaveMsg("Network error.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  const joined = profile?.created_timestamp
    ? new Date(profile.created_timestamp).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })
    : "—";

  const initials = profile
    ? ((profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")).toUpperCase() || profile.username?.[0]?.toUpperCase() || "?"
    : "?";

  return (
    <div className="dash">
      <style>{styles}</style>
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

      {/* Nav */}
      <nav className="dash-nav">
        <div className="dash-brand">
          <div className="dash-brand-logo"><BrandLogo /></div>
          <span className="dash-brand-name">Commtel Networks</span>
        </div>
        <div className="dash-nav-right">
          <button className="logout-btn" onClick={onBack}>
            <BackIcon /> Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="profile-page">
        {loading ? (
          <div className="profile-loading">
            <span className="spinner" style={{borderColor:"rgba(99,102,241,.3)",borderTopColor:"#6366F1"}} />
            Loading profile…
          </div>
        ) : !profile ? (
          <div className="profile-loading" style={{color:"#F87171"}}>Failed to load profile.</div>
        ) : (
          <>
            {/* Header card */}
            <div className="profile-header">
              <div className="profile-avatar-lg">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" onError={e => { e.target.style.display="none"; }} />
                  : initials}
              </div>
              <div className="profile-header-info">
                <div className="profile-name">
                  {profile.first_name || ""} {profile.last_name || ""}
                </div>
                <div className="profile-username">@{profile.username}</div>
                <div className="profile-email">{profile.email || "No email"}</div>
                {profile.bio && (
                  <div style={{fontSize:13,color:"#64748B",marginTop:6}}>{profile.bio}</div>
                )}
                <div className="profile-joined">Joined {joined}</div>
              </div>
            </div>

            {/* Account info (read-only from Keycloak) */}
            <div className="profile-section">
              <h3>Account Info</h3>
              <div className="profile-kv-grid">
                <div className="profile-kv">
                  <div className="profile-kv-key">Username</div>
                  <div className="profile-kv-val">{profile.username}</div>
                </div>
                <div className="profile-kv">
                  <div className="profile-kv-key">Email</div>
                  <div className="profile-kv-val">{profile.email || "—"}</div>
                </div>
                <div className="profile-kv">
                  <div className="profile-kv-key">User ID</div>
                  <div className="profile-kv-val" style={{fontSize:10}}>{profile.sub?.slice(0,16)}…</div>
                </div>
                <div className="profile-kv">
                  <div className="profile-kv-key">Member Since</div>
                  <div className="profile-kv-val" style={{fontSize:11}}>{joined}</div>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="profile-section">
              <h3>Edit Profile</h3>

              <div className="profile-field">
                <label>Avatar URL</label>
                <input
                  className="profile-input"
                  type="text"
                  placeholder="https://example.com/photo.jpg"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label>Bio</label>
                <textarea
                  className="profile-textarea"
                  placeholder="Tell your team a little about yourself…"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                />
              </div>

              <div className="profile-save-row">
                <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner" />Saving…</> : "Save Changes"}
                </button>
                {saveMsg && (
                  <span className={`profile-save-msg ${saveMsg.includes("fail") || saveMsg.includes("error") ? "err" : ""}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ onLogout, onProfile }) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  const [timeLeft, setTimeLeft]     = useState(timeUntilExpiry());
  const [isExpiring, setIsExpiring] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
  timerRef.current = setInterval(async () => {
    const expiry = localStorage.getItem("token_expiry");
    if (!expiry) return;
    const secsLeft = Math.floor((Number(expiry) - Date.now()) / 1000);
    setTimeLeft(timeUntilExpiry());
    setIsExpiring(secsLeft < 60);

    // auto-refresh at 45s
    if (secsLeft === 45) {
      const rt = localStorage.getItem("refresh_token");
      if (!rt) { onLogout(); return; }
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (!res.ok) { onLogout(); return; }
        const data = await res.json();
        saveTokens(data);
        setTimeLeft(timeUntilExpiry());
        setIsExpiring(false);
      } catch { /* silent fail */ }
    }
  }, 1000);
  return () => clearInterval(timerRef.current);
}, []);``

  async function doRefresh(silent = false) {
    const rt = localStorage.getItem("refresh_token");
    if (!rt) { onLogout(); return; }
    if (!silent) setRefreshing(true);
    try {
      const res  = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) { onLogout(); return; }
      const data = await res.json();
      saveTokens(data);
      setTimeLeft(timeUntilExpiry());
      setIsExpiring(false);
      if (!silent) { setRefreshMsg("Token refreshed."); setTimeout(() => setRefreshMsg(""), 3000); }
    } catch {
      if (!silent) setRefreshMsg("Refresh failed.");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  async function doLogout() {
    const rt = localStorage.getItem("refresh_token");
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
    } catch { /* ignore */ }
    clearTokens();
    onLogout();
  }

  const at = localStorage.getItem("access_token");

  return (
    <>
      <style>{styles}</style>
      <div className="dash">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

        <nav className="dash-nav">
          <div className="dash-brand">
            <div className="dash-brand-logo"><BrandLogo /></div>
            <span className="dash-brand-name">Commtel Networks</span>
          </div>
          <div className="dash-nav-right">
            <div className={`token-badge ${isExpiring ? "expiring" : ""}`}>
              <span className="token-badge-dot" />
              {isExpiring ? `Expires in ${timeLeft}` : `Valid · ${timeLeft}`}
            </div>
            <button className="nav-profile-btn" onClick={onProfile}>
              <div className="nav-avatar">U</div>
              My Profile
            </button>
            <button className="logout-btn" onClick={doLogout}>
              <LogoutIcon /> Sign out
            </button>
          </div>
        </nav>

        <main className="dash-main">
          <div className="dash-welcome">
            <h1>Welcome to your <span>workspace.</span></h1>
            <p>You're authenticated via Keycloak. Your session is active and secure.</p>
          </div>

          <div className="stat-grid">
            {[
              { icon:"🔐", label:"Auth Status",  value:"Active",  sub:"Keycloak session live",       color:"rgba(34,197,94,.15)" },
              { icon:"⏱",  label:"Token Expiry", value:timeLeft,  sub:isExpiring?"Refresh soon":"Auto-refresh enabled", color:isExpiring?"rgba(245,158,11,.15)":"rgba(99,102,241,.15)" },
              { icon:"🌐", label:"Realm",         value:"CommTel", sub:"commtel-networks",            color:"rgba(6,182,212,.15)" },
              { icon:"🛡",  label:"Token Type",   value:"Bearer",  sub:"OpenID Connect",              color:"rgba(168,85,247,.15)" },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="token-panel">
            <h2>Session Tokens</h2>
            <div className="token-row">
              <span className="token-key">access_token</span>
              <span className="token-val">{truncateToken(at)}</span>
            </div>
            <div className="token-row">
              <span className="token-key">expires_in</span>
              <span className={`token-val ${isExpiring ? "yellow" : "green"}`}>{timeLeft}</span>
            </div>
            <div className="token-row">
              <span className="token-key">refresh_token</span>
              <span className="token-val">{truncateToken(localStorage.getItem("refresh_token"))}</span>
            </div>
            <button className="refresh-btn" onClick={() => doRefresh(false)} disabled={refreshing}>
              <span className={refreshing ? "refresh-spin" : ""}><RefreshIcon /></span>
              {refreshing ? "Refreshing…" : "Refresh token now"}
            </button>
            {refreshMsg && (
              <p style={{ fontSize:12, marginTop:10, color: refreshMsg.includes("fail") ? "#F87171" : "#22C55E" }}>
                {refreshMsg}
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [tab, setTab]           = useState("login");
  const [showPwd, setShowPwd]   = useState(false);
  const [showCfm, setShowCfm]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState("");

  const [lf, setLf] = useState({ email: "", password: "" });
  const [rf, setRf] = useState({ firstName:"", lastName:"", username:"", email:"", org:"", password:"", confirm:"" });

  const score = pwdScore(rf.password);

  function vLogin() {
    const e = {};
    if (!lf.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(lf.email)) e.email = "Enter a valid email";
    if (!lf.password) e.password = "Password is required";
    return e;
  }
  function vReg() {
    const e = {};
    if (!rf.username.trim()) e.username = "Required";
    if (!rf.firstName.trim()) e.firstName = "Required";
    if (!rf.lastName.trim()) e.lastName = "Required";
    if (!rf.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(rf.email)) e.email = "Enter a valid email";
    if (!rf.password) e.password = "Password is required";
    else if (rf.password.length < 8) e.password = "Min. 8 characters";
    if (rf.password !== rf.confirm) e.confirm = "Passwords do not match";
    return e;
  }

  async function doLogin() {
    const e = vLogin(); setErrors(e); setApiError("");
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lf.email, password: lf.password }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data?.error || "Invalid email or password."); return; }
      saveTokens(data);
      onAuth();
    } catch { setApiError("Unable to reach the server."); }
    finally { setLoading(false); }
  }

  async function doRegister() {
    const e = vReg(); setErrors(e); setApiError("");
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username:rf.username, firstName:rf.firstName, lastName:rf.lastName, email:rf.email, org:rf.org, password:rf.password }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data?.error || "Registration failed."); return; }
      switchTab("login");
    } catch { setApiError("Unable to reach the server."); }
    finally { setLoading(false); }
  }

  function switchTab(t) { setTab(t); setErrors({}); setApiError(""); setShowPwd(false); setShowCfm(false); }

  const BG = <><div className="orb orb-1"/><div className="orb orb-2"/><div className="orb orb-3"/></>;

  return (
    <>
      <style>{styles}</style>
      <div className="ar">{BG}
        <div className="card">
          <div className="card-bar" />
          <div className="card-head">
            <div className="brand">
              <div className="brand-logo"><BrandLogo /></div>
              <span className="brand-text">Commtel Networks</span>
              <span className="brand-pill">Enterprise</span>
            </div>
            <div className="tabs">
              <button className={`tab ${tab==="login"?"on":""}`} onClick={() => switchTab("login")}>Sign In</button>
              <button className={`tab ${tab==="register"?"on":""}`} onClick={() => switchTab("register")}>Create Account</button>
            </div>
          </div>

          <div className="card-body">
            {tab === "login" ? (
              <>
                <div className="form-head">
                  <div className="form-heading">Welcome <span>back.</span></div>
                  <div className="form-sub">No account? <b onClick={() => switchTab("register")}>Create one free</b></div>
                </div>
                <div className="fields">
                  <div className="fw">
                    <span className="flabel">Work Email</span>
                    <div className="finput-wrap">
                      <input className="finput" type="email" placeholder="you@company.com"
                        value={lf.email} onChange={e => setLf(p => ({...p, email:e.target.value}))} />
                      <span className="finput-icon"><MailIcon /></span>
                    </div>
                    {errors.email && <div className="ferr">⚠ {errors.email}</div>}
                  </div>
                  <div className="fw">
                    <span className="flabel">Password</span>
                    <div className="finput-wrap">
                      <input className="finput pr" type={showPwd?"text":"password"} placeholder="Enter your password"
                        value={lf.password} onChange={e => setLf(p => ({...p, password:e.target.value}))} />
                      <span className="finput-icon"><LockIcon /></span>
                      <span className="finput-right" onClick={() => setShowPwd(v => !v)}><EyeIcon open={showPwd} /></span>
                    </div>
                    {errors.password && <div className="ferr">⚠ {errors.password}</div>}
                  </div>
                  <div className="forgot-row"><span className="forgot">Forgot password?</span></div>
                  {apiError && <div className="api-err"><span>⚠</span><span>{apiError}</span></div>}
                  <button className="cta" onClick={doLogin} disabled={loading}>
                    {loading ? <><span className="spinner"/>Signing in…</> : "Sign In →"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="form-head">
                  <div className="form-heading">Create your <span>account.</span></div>
                  <div className="form-sub">Already have one? <b onClick={() => switchTab("login")}>Sign in instead</b></div>
                </div>
                <div className="fields">
                  <div className="fw">
                    <span className="flabel">Username</span>
                    <div className="finput-wrap">
                      <input className="finput" type="text" placeholder="john_doe"
                        value={rf.username} onChange={e => setRf(p => ({...p, username:e.target.value}))} />
                      <span className="finput-icon"><UserIcon /></span>
                    </div>
                    {errors.username && <div className="ferr">⚠ {errors.username}</div>}
                  </div>
                  <div className="frow">
                    <div className="fw">
                      <span className="flabel">First Name</span>
                      <div className="finput-wrap">
                        <input className="finput" type="text" placeholder="John"
                          value={rf.firstName} onChange={e => setRf(p => ({...p, firstName:e.target.value}))} />
                        <span className="finput-icon"><UserIcon /></span>
                      </div>
                      {errors.firstName && <div className="ferr">⚠ {errors.firstName}</div>}
                    </div>
                    <div className="fw">
                      <span className="flabel">Last Name</span>
                      <div className="finput-wrap">
                        <input className="finput" type="text" placeholder="Doe"
                          value={rf.lastName} onChange={e => setRf(p => ({...p, lastName:e.target.value}))} />
                        <span className="finput-icon"><UserIcon /></span>
                      </div>
                      {errors.lastName && <div className="ferr">⚠ {errors.lastName}</div>}
                    </div>
                  </div>
                  <div className="fw">
                    <span className="flabel">Work Email</span>
                    <div className="finput-wrap">
                      <input className="finput" type="email" placeholder="you@company.com"
                        value={rf.email} onChange={e => setRf(p => ({...p, email:e.target.value}))} />
                      <span className="finput-icon"><MailIcon /></span>
                    </div>
                    {errors.email && <div className="ferr">⚠ {errors.email}</div>}
                  </div>
                  <div className="fw">
                    <span className="flabel">Organization <span style={{textTransform:"none",letterSpacing:0,color:"#1E2D44",fontWeight:400}}>(optional)</span></span>
                    <div className="finput-wrap">
                      <input className="finput" type="text" placeholder="Acme Corp"
                        value={rf.org} onChange={e => setRf(p => ({...p, org:e.target.value}))} />
                      <span className="finput-icon"><BriefIcon /></span>
                    </div>
                  </div>
                  <div className="fw">
                    <span className="flabel">Password</span>
                    <div className="finput-wrap">
                      <input className="finput pr" type={showPwd?"text":"password"} placeholder="Min. 8 characters"
                        value={rf.password} onChange={e => setRf(p => ({...p, password:e.target.value}))} />
                      <span className="finput-icon"><LockIcon /></span>
                      <span className="finput-right" onClick={() => setShowPwd(v => !v)}><EyeIcon open={showPwd} /></span>
                    </div>
                    {rf.password.length > 0 && (
                      <>
                        <div className="sbar-wrap">
                          {[1,2,3,4].map(i => <div key={i} className="seg" style={{background:i<=score?sColors[score]:undefined}}/>)}
                        </div>
                        <div className="slabel" style={{color:sColors[score]}}>{sLabels[score]}</div>
                      </>
                    )}
                    {errors.password && <div className="ferr">⚠ {errors.password}</div>}
                  </div>
                  <div className="fw">
                    <span className="flabel">Confirm Password</span>
                    <div className="finput-wrap">
                      <input className="finput pr" type={showCfm?"text":"password"} placeholder="Re-enter password"
                        value={rf.confirm} onChange={e => setRf(p => ({...p, confirm:e.target.value}))} />
                      <span className="finput-icon"><LockIcon /></span>
                      <span className="finput-right" onClick={() => setShowCfm(v => !v)}><EyeIcon open={showCfm} /></span>
                    </div>
                    {errors.confirm && <div className="ferr">⚠ {errors.confirm}</div>}
                  </div>
                  {apiError && <div className="api-err"><span>⚠</span><span>{apiError}</span></div>}
                  <button className="cta" onClick={doRegister} disabled={loading}>
                    {loading ? <><span className="spinner"/>Creating account…</> : "Create Account →"}
                  </button>
                  <div className="terms">
                    By registering you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card-foot">
            <span className="foot-secure"><span className="foot-dot"/>Secured by Keycloak</span>
            <span className="foot-ver">v2.4.1</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState(() => isTokenValid() ? "dashboard" : "auth");

  if (view === "auth")      return <AuthPage  onAuth={() => setView("dashboard")} />;
  if (view === "profile")   return <ProfilePage onBack={() => setView("dashboard")} />;
  return <Dashboard
    onLogout={() => { clearTokens(); setView("auth"); }}
    onProfile={() => setView("profile")}
  />;
}