import React, { useState } from 'react';

const styles = `
:root {
  --green:   #00e5a0;
  --green2:  #00b87a;
  --gglow:   rgba(0,229,160,0.09);
  --bg:      #ffffff;
  --surface: #f8fafc;
  --card:    #ffffff;
  --card2:   #f1f5f9;
  --border:  #e5e7eb;
  --border2: #d1d5db;
  --muted:   #9ca3af;
  --muted2:  #6b7280;
  --accent:  #7c3aed;
  --nav-h:   88px;
  --sub-h:   40px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', sans-serif; background: var(--bg); color: #0f172a; }

.d-hidden { display: none !important; }

/* ── Nav ── */
.nav-tab { flex:1; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; text-decoration:none; font-size:13px; font-weight:600; color:#6b7280; background:transparent; border-right:1px solid #e5e7eb; position:relative; transition:color .2s,background .2s; }
.nav-tab:hover { color:#0f172a; background:rgba(0,0,0,0.02); }
.nav-tab .tab-label { font-size:15px; font-weight:700; }
.nav-tab .tab-sub { font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; opacity:.6; }
.nav-tab::after { content:''; position:absolute; bottom:0; left:20%; right:20%; height:2px; border-radius:2px 2px 0 0; background:transparent; transition:background .2s; }
.nav-tab.active { color:#7c3aed; background:rgba(124,58,237,0.04); }
.nav-tab.active::after { background:#7c3aed; }

/* ── Subbar ── */
.d-subbar {
  position: sticky; top: var(--nav-h); z-index: 90;
  height: var(--sub-h);
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display:flex; align-items:center; padding:0 28px;
}
.d-bc { display:flex; align-items:center; gap:7px; flex:1; }
.d-bc a { font-size:12px; font-weight:600; color:#7c3aed; text-decoration:none; }
.d-bc a:hover { text-decoration:underline; }
.d-bc-sep { color:var(--muted); font-size:11px; }
.d-bc-cur { font-size:12px; font-weight:700; color:#0f172a; letter-spacing:.4px; }
.d-sbr { display:flex; align-items:center; gap:16px; }
.d-items-l { font-size:12px; color:var(--muted2); }
.d-items-l strong { color:#0f172a; font-weight:700; }
.d-live-p { display:flex; align-items:center; gap:5px; }
.d-live-d { width:6px; height:6px; background:#7c3aed; border-radius:50%; animation:dpulse 2s infinite; box-shadow:0 0 6px rgba(124,58,237,0.5); }
@keyframes dpulse { 0%,100%{opacity:1} 50%{opacity:.25} }
.d-live-l { font-size:11.5px; color:#7c3aed; font-weight:600; }
.d-btn-imp { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:#7c3aed; background:rgba(124,58,237,0.06); border:1px solid rgba(124,58,237,0.22); border-radius:8px; padding:4px 13px; cursor:pointer; font-family:inherit; transition:background .15s; }
.d-btn-imp:hover { background:rgba(124,58,237,0.12); }

/* ── Hero ── */
.d-hero-wrap { position:relative; overflow:hidden; }
.d-hero-wrap::before {
  content:'';
  position:absolute; inset:0;
  background:
    radial-gradient(ellipse 60% 50% at 72% 50%, rgba(124,58,237,0.05) 0%, transparent 70%),
    radial-gradient(ellipse 40% 60% at 20% 80%, rgba(124,58,237,0.03) 0%, transparent 65%);
  pointer-events:none;
}
.d-hero { display:grid; grid-template-columns:1fr 1fr; gap:52px; align-items:center; max-width:1360px; margin:0 auto; padding:60px 40px 0; }
.d-hero-tag { display:inline-flex; align-items:center; gap:7px; background:rgba(124,58,237,0.07); border:1px solid rgba(124,58,237,0.22); border-radius:20px; padding:5px 14px; margin-bottom:20px; }
.d-hero-tag-dot { width:5px; height:5px; background:#7c3aed; border-radius:50%; box-shadow:0 0 6px rgba(124,58,237,0.5); }
.d-hero-tag span { font-size:10px; font-weight:800; color:#7c3aed; letter-spacing:1.3px; text-transform:uppercase; }
.d-hero h1 { font-size:clamp(38px,4vw,60px); font-weight:900; letter-spacing:-2.5px; line-height:1.04; color:#0f172a; margin-bottom:18px; }
.d-hero-desc { font-size:15px; line-height:1.75; color:var(--muted2); max-width:440px; margin-bottom:34px; }
.d-hero-stats { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--border2); border-radius:14px; overflow:hidden; background:var(--border); gap:1px; }
.d-hs { background:var(--surface); padding:16px 14px; display:flex; flex-direction:column; gap:3px; }
.d-hs-val { font-size:22px; font-weight:800; color:#0f172a; letter-spacing:-.5px; }
.d-hs-val.g { color:#7c3aed; }
.d-hs-lbl { font-size:9px; font-weight:700; color:var(--muted); letter-spacing:.9px; text-transform:uppercase; }
.d-hero-img { position:relative; height:390px; border-radius:20px; overflow:hidden; border:1px solid var(--border2); box-shadow:0 32px 80px rgba(0,0,0,.08), 0 0 0 1px rgba(124,58,237,.04); }
.d-hero-img img { width:100%; height:100%; object-fit:cover; filter:brightness(0.97) saturate(1.05); transition:transform .6s ease; }
.d-hero-img:hover img { transform:scale(1.04); }
.d-hero-img-ov { position:absolute; inset:0; background:linear-gradient(160deg,rgba(255,255,255,.15) 0%,transparent 50%,rgba(124,58,237,.04) 100%); }
.d-hero-badge { position:absolute; bottom:18px; left:18px; background:rgba(255,255,255,.92); backdrop-filter:blur(16px); border:1px solid #e5e7eb; border-radius:12px; padding:10px 16px; }
.d-hb-b { font-size:8.5px; font-weight:800; color:#7c3aed; letter-spacing:1.3px; text-transform:uppercase; margin-bottom:3px; }
.d-hb-n { font-size:13px; font-weight:700; color:#0f172a; }
.d-hero-pill { position:absolute; top:16px; right:16px; background:rgba(255,255,255,.88); backdrop-filter:blur(12px); border:1px solid #e5e7eb; border-radius:8px; padding:5px 12px; font-size:11px; font-weight:600; color:var(--muted2); }
.d-hero-pill strong { color:#7c3aed; }

/* ── Stats band ── */
.d-stats-band { max-width:1360px; margin:44px auto 0; padding:0 40px; }
.d-stats-inner { display:grid; grid-template-columns:repeat(5,1fr); gap:1px; background:var(--border); border:1px solid var(--border2); border-radius:16px; overflow:hidden; }
.d-sb { background:#f8fafc; padding:20px 22px; display:flex; flex-direction:column; gap:4px; }
.d-sb-val { font-size:26px; font-weight:900; color:#0f172a; letter-spacing:-.8px; }
.d-sb-val sup { font-size:13px; font-weight:600; color:var(--muted2); vertical-align:super; }
.d-sb-lbl { font-size:9.5px; font-weight:700; color:var(--muted); letter-spacing:.8px; text-transform:uppercase; }

/* ── Body layout ── */
.d-body { display:flex; max-width:1360px; margin:40px auto 0; padding:0 40px 80px; gap:28px; }

/* ── Sidebar ── */
.d-sidebar {
  width:220px; flex-shrink:0;
  background:var(--surface); border:1px solid var(--border);
  border-radius:16px; padding:18px 12px;
  display:flex; flex-direction:column;
  position:sticky; top:calc(var(--nav-h) + var(--sub-h) + 16px);
  max-height:calc(100vh - var(--nav-h) - var(--sub-h) - 40px);
  overflow-y:auto; align-self:flex-start;
}
.d-sidebar::-webkit-scrollbar { width:3px; }
.d-sidebar::-webkit-scrollbar-thumb { background:var(--border2); border-radius:4px; }
.d-sidebar-section { margin-bottom:18px; }
.d-sidebar-label { font-size:10px; font-weight:700; color:var(--muted); letter-spacing:.14em; text-transform:uppercase; padding:0 8px; margin-bottom:8px; }
.d-sidebar-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:9px; text-decoration:none; margin-bottom:2px; transition:background .15s; cursor:pointer; width:100%; background:none; border:1px solid transparent; font-family:inherit; }
.d-sidebar-item:hover { background:rgba(0,0,0,0.04); }
.d-sidebar-item.active { background:rgba(124,58,237,0.07); border-color:rgba(124,58,237,0.18); }
.d-sidebar-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.d-sidebar-text { font-size:13px; font-weight:600; color:var(--muted2); text-align:left; flex:1; }
.d-sidebar-item.active .d-sidebar-text { color:#7c3aed; }
.d-sidebar-divider { height:1px; background:#e5e7eb; margin:14px 0; }
.d-sidebar-access { margin-top:auto; padding-top:14px; }
.d-sidebar-access button { width:100%; background:#7c3aed; color:#fff; border:none; padding:10px; border-radius:9px; font-size:12.5px; font-weight:800; cursor:pointer; font-family:inherit; letter-spacing:.01em; transition:box-shadow .2s,transform .15s; }
.d-sidebar-access button:hover { box-shadow:0 0 20px rgba(124,58,237,0.4); transform:translateY(-1px); }
.d-filter-badge { margin-left:auto; font-size:10px; font-weight:700; background:rgba(124,58,237,0.10); color:#7c3aed; border-radius:20px; padding:1px 7px; }

/* ── Main ── */
.d-main { flex:1; min-width:0; }

/* ── Section head ── */
.d-sec-head { display:flex; align-items:center; gap:10px; margin-bottom:16px; padding-left:4px; border-left:3px solid #7c3aed; }
.d-sec-dot { display:none; }
.d-sec-title { font-size:15px; font-weight:800; color:#0f172a; padding-left:6px; }
.d-sec-line { flex:1; height:1px; background:linear-gradient(90deg,rgba(124,58,237,0.15),transparent); }
.d-sec-count { font-size:11px; color:var(--muted); font-weight:600; }

/* ── Dataset grid ── */
.d-ds-grid { display:flex; flex-wrap:wrap; gap:16px; margin-bottom:44px; }

/* ── Cards ── */
.d-card {
  background:var(--card); border:1px solid var(--border);
  border-radius:16px; overflow:hidden;
  display:flex; flex-direction:column;
  transition:border-color .25s, transform .25s, box-shadow .25s;
  cursor:pointer;
  position:relative;
  flex: 0 0 calc(33.333% - 11px);
}
.d-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg,#7c3aed,transparent);
  opacity:0; transition:opacity .25s;
}
.d-card:hover::before { opacity:1; }
.d-card:hover { border-color:rgba(124,58,237,.28); transform:translateY(-5px); box-shadow:0 24px 64px rgba(0,0,0,.08), 0 0 0 1px rgba(124,58,237,.07), 0 0 40px rgba(124,58,237,.04); }
.d-card-head { padding:16px 16px 10px; display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.d-card-title { font-size:14px; font-weight:700; color:#0f172a; letter-spacing:-.3px; line-height:1.25; }
.d-badge    { background:#7c3aed; color:#fff; font-size:8px; font-weight:900; letter-spacing:.5px; padding:3px 9px; border-radius:20px; text-transform:uppercase; flex-shrink:0; white-space:nowrap; margin-top:2px; }
.d-badge-od { background:rgba(245,158,11,0.10); color:#b45309; border:1px solid rgba(245,158,11,0.3); font-size:8px; font-weight:900; letter-spacing:.5px; padding:3px 9px; border-radius:20px; text-transform:uppercase; flex-shrink:0; white-space:nowrap; margin-top:2px; }

/* ── Photos ── */
.d-photos { padding:0 16px; display:grid; grid-template-columns:1fr 86px; grid-template-rows:176px 84px; gap:6px; }
.d-ph-main { grid-row:1/3; border-radius:12px; overflow:hidden; background:var(--card2); position:relative; }
.d-ph-main img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .45s ease; filter:brightness(0.97) contrast(1.02) saturate(1.05); }
.d-card:hover .d-ph-main img { transform:scale(1.07); }
.d-ph-main::after { content:''; position:absolute; inset:0; border-radius:12px; background:linear-gradient(180deg,transparent 50%,rgba(0,0,0,.12)); pointer-events:none; }
.d-ph-thumbs { display:grid; grid-template-rows:1fr 1fr 1fr; gap:6px; grid-row:1/3; }
.d-ph-t { border-radius:8px; overflow:hidden; background:var(--card2); }
.d-ph-t img { width:100%; height:100%; object-fit:cover; display:block; filter:brightness(0.97) contrast(1.02) saturate(1.05); transition:transform .35s ease,filter .35s ease; }
.d-card:hover .d-ph-t img { transform:scale(1.1); filter:brightness(1) contrast(1.02) saturate(1.05); }

/* ── Tags & footer ── */
.d-tags { padding:10px 16px 0; display:flex; gap:5px; flex-wrap:wrap; }
.d-tag { background:#f1f5f9; border:1px solid #e5e7eb; border-radius:6px; padding:3px 9px; font-size:10px; font-weight:500; color:#6b7280; }
.d-card-foot { padding:11px 16px 15px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; margin-top:auto; }
.d-card-path { font-size:10px; color:var(--muted); font-family:'SF Mono','Fira Mono',monospace; }
.d-btn-open { display:flex; align-items:center; gap:4px; font-size:12px; font-weight:700; color:#7c3aed; background:none; border:none; cursor:pointer; transition:gap .15s; font-family:inherit; }
.d-btn-open:hover { gap:9px; }

/* ── CTA ── */
.d-cta-wrap { max-width:1360px; margin:0 auto; padding:0 40px 80px; }
.d-cta {
  background:linear-gradient(128deg,rgba(124,58,237,.07) 0%,rgba(124,58,237,.02) 45%,transparent 70%);
  border:1px solid rgba(124,58,237,.16); border-radius:20px;
  padding:52px 56px; display:flex; align-items:center; justify-content:space-between; gap:40px;
  position:relative; overflow:hidden;
}
.d-cta::after { content:''; position:absolute; right:-60px; top:-80px; width:300px; height:300px; background:radial-gradient(circle,rgba(124,58,237,.05),transparent 70%); pointer-events:none; }
.d-cta h2 { font-size:28px; font-weight:900; letter-spacing:-.6px; margin-bottom:10px; color:#0f172a; }
.d-cta p { font-size:14px; color:var(--muted2); line-height:1.7; max-width:480px; }
.d-cta-btns { display:flex; gap:12px; flex-shrink:0; }
.d-btn-primary { font-size:14px; font-weight:700; color:#fff; background:#7c3aed; border:none; border-radius:11px; padding:14px 28px; cursor:pointer; white-space:nowrap; font-family:inherit; transition:box-shadow .2s,transform .15s; }
.d-btn-primary:hover { box-shadow:0 0 28px rgba(124,58,237,.4); transform:translateY(-2px); }
.d-btn-outline { font-size:14px; font-weight:600; color:#0f172a; background:#f8fafc; border:1px solid #d1d5db; border-radius:11px; padding:14px 28px; cursor:pointer; white-space:nowrap; font-family:inherit; transition:background .15s; }
.d-btn-outline:hover { background:#f1f5f9; }

/* ── Empty state ── */
.d-empty { display:none; text-align:center; padding:60px 20px; color:var(--muted2); font-size:14px; }
.d-empty.visible { display:block; }
`;

export default function RoboDataHubAutoLight() {
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <>
      <style>{styles}</style>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.97)', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'stretch', height: '88px', backdropFilter: 'blur(12px)' }}>
        <a
          href="homepage_light.html"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', minWidth: '220px', flexShrink: 0, borderRight: '1px solid #e5e7eb', padding: '0 32px', transition: 'background .2s' }}
          onMouseOver={(e) => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(13,148,136,0.04)'}
          onMouseOut={(e) => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
        >
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '.04em', color: '#0d9488' }}>DataraAI</span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', marginTop: '2px' }}>← Back to Home</span>
        </a>
        <a href="robodatahub_light.html" className="nav-tab active">
          <span className="tab-label">RoboDataHub</span>
          <span className="tab-sub">Dataset Catalog</span>
        </a>
        <a href="roboeyeview_light.html" className="nav-tab">
          <span className="tab-label">RoboEyeView</span>
          <span className="tab-sub">Visual Intelligence</span>
        </a>
        <a href="robohandmotion_light.html" className="nav-tab">
          <span className="tab-label">RoboHandMotion</span>
          <span className="tab-sub">Humanoid Data</span>
        </a>
        <a href="robotaskmanipulator_light.html" className="nav-tab">
          <span className="tab-label">RoboTaskManipulator</span>
          <span className="tab-sub">Task Execution</span>
        </a>
      </div>

      {/* Subbar */}
      <div className="d-subbar">
        <div className="d-bc">
          <a href="robodatahub_light.html">RoboDataHub</a>
          <span className="d-bc-sep">›</span>
          <span className="d-bc-cur">CARAUTOMATION</span>
        </div>
        <div className="d-sbr">
          <span className="d-items-l">Showing: <strong>34</strong> datasets</span>
          <div className="d-live-p"><div className="d-live-d"></div><span className="d-live-l">Live Connection</span></div>
          <button className="d-btn-imp">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v7M3 6l3 3 3-3M1.5 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Import Data
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="d-hero-wrap">
        <div className="d-hero">
          <div>
            <div className="d-hero-tag"><div className="d-hero-tag-dot"></div><span>Automotive · Robotics AI</span></div>
            <h1>RoboDataHub<br />Automotive</h1>
            <p className="d-hero-desc">High-fidelity, fully-labelled manufacturing datasets captured from live OEM production floors — built for robotics automation training pipelines.</p>
            <div className="d-hero-stats">
              <div className="d-hs"><span className="d-hs-val">34</span><span className="d-hs-lbl">Datasets</span></div>
              <div className="d-hs"><span className="d-hs-val">6</span><span className="d-hs-lbl">OEM Brands</span></div>
              <div className="d-hs"><span className="d-hs-val g">Live</span><span className="d-hs-lbl">Status</span></div>
              <div className="d-hs"><span className="d-hs-val g">Public</span><span className="d-hs-lbl">Access</span></div>
            </div>
          </div>
          <div className="d-hero-img">
            <img src="images/frontGrille_012.png" alt="Automotive production line" />
            <div className="d-hero-img-ov"></div>
            <div className="d-hero-badge"><div className="d-hb-b">Featured · Robotics AI</div><div className="d-hb-n">Assembly Line — Live Capture</div></div>
            <div className="d-hero-pill"><strong>34</strong> datasets available</div>
          </div>
        </div>
      </div>

      {/* Stats Band */}
      <div className="d-stats-band">
        <div className="d-stats-inner">
          <div className="d-sb"><span className="d-sb-val">5,500<sup>+</sup></span><span className="d-sb-lbl">Total Hours</span></div>
          <div className="d-sb"><span className="d-sb-val">6<sup> OEMs</sup></span><span className="d-sb-lbl">Partner Brands</span></div>
          <div className="d-sb"><span className="d-sb-val">34<sup> ds</sup></span><span className="d-sb-lbl">Total Datasets</span></div>
          <div className="d-sb"><span className="d-sb-val">98.4<sup>%</sup></span><span className="d-sb-lbl">Label Accuracy</span></div>
          <div className="d-sb"><span className="d-sb-val">10<sup> types</sup></span><span className="d-sb-lbl">Operation Classes</span></div>
        </div>
      </div>

      {/* Body */}
      <div className="d-body">

        {/* Sidebar */}
        <div className="d-sidebar">
          <div className="d-sidebar-section">
            <div className="d-sidebar-label">Filter by Task</div>
            <a href="#d-assembly" className="d-sidebar-item active">
              <div className="d-sidebar-dot" style={{ background: '#7c3aed' }}></div>
              <span className="d-sidebar-text">Assembly Line</span>
            </a>
            <a href="#d-qc" className="d-sidebar-item">
              <div className="d-sidebar-dot" style={{ background: '#9ca3af' }}></div>
              <span className="d-sidebar-text">QC Inspection</span>
            </a>
            <a href="#d-paint" className="d-sidebar-item">
              <div className="d-sidebar-dot" style={{ background: '#9ca3af' }}></div>
              <span className="d-sidebar-text">Paint &amp; Body</span>
            </a>
            <a href="#d-wiring" className="d-sidebar-item">
              <div className="d-sidebar-dot" style={{ background: '#9ca3af' }}></div>
              <span className="d-sidebar-text">Wiring &amp; Sensors</span>
            </a>
            <a href="#d-cars" className="d-sidebar-item">
              <div className="d-sidebar-dot" style={{ background: '#9ca3af' }}></div>
              <span className="d-sidebar-text">Cars</span>
            </a>
          </div>

          <div className="d-sidebar-divider"></div>

          <div className="d-sidebar-section">
            <div className="d-sidebar-label">Filter by Brand</div>
            <button
              className={`d-sidebar-item${activeFilter === 'all' ? ' active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              <div className="d-sidebar-dot" style={{ background: '#7c3aed' }}></div>
              <span className="d-sidebar-text">All Brands</span>
            </button>
            <button
              className={`d-sidebar-item${activeFilter === 'bmw' ? ' active' : ''}`}
              onClick={() => setActiveFilter('bmw')}
            >
              <div className="d-sidebar-dot" style={{ background: '#60a5fa' }}></div>
              <span className="d-sidebar-text">BMW</span>
            </button>
            <button
              className={`d-sidebar-item${activeFilter === 'ford' ? ' active' : ''}`}
              onClick={() => setActiveFilter('ford')}
            >
              <div className="d-sidebar-dot" style={{ background: '#34d399' }}></div>
              <span className="d-sidebar-text">Ford</span>
            </button>
            <button
              className={`d-sidebar-item${activeFilter === 'toyota' ? ' active' : ''}`}
              onClick={() => setActiveFilter('toyota')}
            >
              <div className="d-sidebar-dot" style={{ background: '#fb923c' }}></div>
              <span className="d-sidebar-text">Toyota</span>
            </button>
            <button
              className={`d-sidebar-item${activeFilter === 'tesla' ? ' active' : ''}`}
              onClick={() => setActiveFilter('tesla')}
            >
              <div className="d-sidebar-dot" style={{ background: '#f87171' }}></div>
              <span className="d-sidebar-text">Tesla</span>
            </button>
            <button
              className={`d-sidebar-item${activeFilter === 'audi' ? ' active' : ''}`}
              onClick={() => setActiveFilter('audi')}
            >
              <div className="d-sidebar-dot" style={{ background: '#9ca3af' }}></div>
              <span className="d-sidebar-text">Audi</span>
            </button>
            <button
              className={`d-sidebar-item${activeFilter === 'multi' ? ' active' : ''}`}
              onClick={() => setActiveFilter('multi')}
            >
              <div className="d-sidebar-dot" style={{ background: '#7c3aed' }}></div>
              <span className="d-sidebar-text">Multi</span>
            </button>
          </div>

          <div className="d-sidebar-divider"></div>
          <div className="d-sidebar-access">
            <button>Get Access</button>
          </div>
        </div>

        {/* Main */}
        <div className="d-main">

          {/* Assembly Line */}
          <div id="d-assembly" style={{ marginBottom: '40px' }}>
            <div className="d-sec-head">
              <div className="d-sec-dot"></div>
              <span className="d-sec-title">Assembly Line</span>
              <div className="d-sec-line"></div>
              <span className="d-sec-count">9 datasets</span>
            </div>
            <div className="d-ds-grid">

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'bmw' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Front Grille Assembly</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Front grille assembly" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">2,100 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/BMW/frontGrille</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'ford' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Front Seat Installation</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontSeat_007.png" alt="Front seat installation" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">1,400 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Ford/frontSeat</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'toyota' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Rear Bumper Assembly</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Rear bumper assembly" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">1,100 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Toyota/rearBumper</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Windshield Installation</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Windshield installation" style={{ objectPosition: '30% center' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">960 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/windshield</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'ford' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Door Panel Trim Fitting</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Door panel trim" style={{ objectPosition: 'center 70%' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">820 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Ford/doorPanel</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Dashboard &amp; Console Fitment</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontSeat_007.png" alt="Dashboard fitment" style={{ objectPosition: 'center 20%' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">740 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/dashboard</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'audi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Audi Door Panel Assembly</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="Audi door panel assembly" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">950 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Audi/doorPanel</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'bmw' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Front Grille Assembly</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Front grille assembly" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">2,100 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/BMW/frontGrille</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'ford' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Front Seat Installation</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontSeat_007.png" alt="Front seat installation" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">1,400 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Ford/frontSeat</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

            </div>
          </div>

          {/* QC Inspection */}
          <div id="d-qc" style={{ marginBottom: '40px' }}>
            <div className="d-sec-head">
              <div className="d-sec-dot"></div>
              <span className="d-sec-title">QC Inspection</span>
              <div className="d-sec-line"></div>
              <span className="d-sec-count">9 datasets</span>
            </div>
            <div className="d-ds-grid">

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'bmw' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Passenger Seat QC Inspection</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="Passenger seat QC" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Seg Masks</div><div className="d-tag">900 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/BMW/passengerSeatQC</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'tesla' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Grille &amp; Fascia Gap Inspection</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Grille gap inspection" style={{ filter: 'brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Defect Labels</div><div className="d-tag">680 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Tesla/grilleFascia</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Underbody Structural Inspection</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Underbody inspection" style={{ filter: 'brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Seg Masks</div><div className="d-tag">540 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/underbody</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'toyota' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">End-of-Line Vehicle Audit</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="End-of-line audit" style={{ objectPosition: 'right center', filter: 'brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">1,050 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Toyota/eolAudit</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'bmw' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Paint Defect Detection</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Paint defect detection" style={{ filter: 'hue-rotate(10deg) brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Defect Labels</div><div className="d-tag">610 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/BMW/paintDefect</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Torque Verification Scan</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="Torque verification" style={{ filter: 'brightness(0.97) saturate(0.9)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Bbox</div><div className="d-tag">430 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/torqueScan</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'audi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Audi Paint Surface QC Scan</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Audi paint QC" style={{ filter: 'brightness(0.97) hue-rotate(10deg)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Defect Labels</div><div className="d-tag">520 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Audi/paintSurfaceQC</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'bmw' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Passenger Seat QC Inspection</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="Passenger seat QC" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Seg Masks</div><div className="d-tag">900 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/BMW/passengerSeatQC</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'tesla' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Grille &amp; Fascia Gap Inspection</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Grille gap inspection" style={{ filter: 'brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Defect Labels</div><div className="d-tag">680 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Tesla/grilleFascia</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

            </div>
          </div>

          {/* Paint & Body */}
          <div id="d-paint" style={{ marginBottom: '40px' }}>
            <div className="d-sec-head">
              <div className="d-sec-dot"></div>
              <span className="d-sec-title">Paint &amp; Body</span>
              <div className="d-sec-line"></div>
              <span className="d-sec-count">6 datasets</span>
            </div>
            <div className="d-ds-grid">

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'tesla' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Spray Paint Application</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Spray paint" style={{ filter: 'hue-rotate(20deg) brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Seg Masks</div><div className="d-tag">1,300 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Tesla/sprayPaint</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Surface Sanding &amp; Prep</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Surface sanding" style={{ filter: 'hue-rotate(200deg) brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">480 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/sanding</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Body Panel Seam Sealing</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontSeat_007.png" alt="Seam sealing" style={{ filter: 'hue-rotate(270deg) brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">620 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/seamSealing</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'audi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Audi Primer &amp; Base Coat</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Audi primer coat" style={{ filter: 'hue-rotate(180deg) brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">780 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Audi/primerCoat</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'tesla' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Spray Paint Application</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Spray paint" style={{ filter: 'hue-rotate(20deg) brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Seg Masks</div><div className="d-tag">1,300 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Tesla/sprayPaint</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Surface Sanding &amp; Prep</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Surface sanding" style={{ filter: 'hue-rotate(200deg) brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">480 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/sanding</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

            </div>
          </div>

          {/* Wiring & Sensors */}
          <div id="d-wiring" style={{ marginBottom: '40px' }}>
            <div className="d-sec-head">
              <div className="d-sec-dot"></div>
              <span className="d-sec-title">Wiring &amp; Sensors</span>
              <div className="d-sec-line"></div>
              <span className="d-sec-count">6 datasets</span>
            </div>
            <div className="d-ds-grid">

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Engine Harness Routing</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontSeat_007.png" alt="Engine harness" style={{ filter: 'brightness(0.97) saturate(0.7)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">860 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/engineHarness</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Sensor Module Installation</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Sensor module" style={{ filter: 'brightness(0.97) saturate(0.7)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Bbox</div><div className="d-tag">720 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/sensorModule</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Interior Connector Plug-In</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="Connector plug-in" style={{ filter: 'brightness(0.97) saturate(0.7)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Edge Cases</div><div className="d-tag">490 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/connectorPlugIn</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'audi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Audi Sensor Array Wiring</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontSeat_007.png" alt="Audi sensor wiring" style={{ filter: 'brightness(0.97) saturate(0.7)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">410 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Audi/sensorWiring</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Engine Harness Routing</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontSeat_007.png" alt="Engine harness" style={{ filter: 'brightness(0.97) saturate(0.7)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">860 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/engineHarness</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Sensor Module Installation</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Sensor module" style={{ filter: 'brightness(0.97) saturate(0.7)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Bbox</div><div className="d-tag">720 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/sensorModule</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

            </div>
          </div>

          {/* Cars */}
          <div id="d-cars" style={{ marginBottom: '40px' }}>
            <div className="d-sec-head">
              <div className="d-sec-dot"></div>
              <span className="d-sec-title">Cars</span>
              <div className="d-sec-line"></div>
              <span className="d-sec-count">6 datasets</span>
            </div>
            <div className="d-ds-grid">

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'bmw' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">BMW 3-Series Full Exterior</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="BMW 3-Series exterior" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">360° Capture</div><div className="d-tag">1,800 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/BMW/3series/exterior</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'ford' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Ford F-150 Cabin Interior</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontSeat_007.png" alt="Ford F-150 cabin" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Task Labels</div><div className="d-tag">1,450 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Ford/f150/cabin</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'toyota' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Toyota Camry Rear Assembly</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/rearBumper_021.png" alt="Toyota Camry rear" /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Bbox</div><div className="d-tag">1,120 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Toyota/camry/rear</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'tesla' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Tesla Model 3 Passenger Compartment</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="Tesla Model 3 passenger" style={{ objectPosition: 'center 20%' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Seg</div><div className="d-tag">980 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Tesla/model3/passenger</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'multi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Multi-Brand Door Fitment</div><span className="d-badge">In Library</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/frontGrille_012.png" alt="Door fitment multi-brand" style={{ objectPosition: 'center 70%', filter: 'brightness(0.97)' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EXO-Centric</div><div className="d-tag">Edge Cases</div><div className="d-tag">2,200 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/multi/doorFitment</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

              <div className="d-card" style={{ display: activeFilter === 'all' || activeFilter === 'audi' ? 'flex' : 'none' }}>
                <div className="d-card-head"><div className="d-card-title">Audi A4 Passenger Compartment</div><span className="d-badge-od">On-demand</span></div>
                <div className="d-photos">
                  <div className="d-ph-main"><img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" alt="Audi A4 passenger" style={{ objectPosition: 'center 20%' }} /></div>
                  <div className="d-ph-thumbs">
                    <div className="d-ph-t"><img src="images/frontSeat_007.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/rearBumper_021.png" alt="" /></div>
                    <div className="d-ph-t"><img src="images/frontGrille_012.png" alt="" /></div>
                  </div>
                </div>
                <div className="d-tags"><div className="d-tag">EGO-Centric</div><div className="d-tag">Seg</div><div className="d-tag">980 hrs</div></div>
                <div className="d-card-foot"><span className="d-card-path">carAuto/Audi/a4/passenger</span><button className="d-btn-open">Open folder <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              </div>

            </div>
          </div>

        </div>{/* /d-main */}
      </div>{/* /d-body */}

      {/* CTA */}
      <div className="d-cta-wrap">
        <div className="d-cta">
          <div>
            <h2>Ready to train smarter robots?</h2>
            <p>Structured, fully-labelled automotive datasets captured from live OEM production environments — plug directly into your robotics training pipeline today.</p>
          </div>
          <div className="d-cta-btns">
            <button className="d-btn-primary">Request Full Access</button>
            <button className="d-btn-outline">View Documentation</button>
          </div>
        </div>
      </div>

    </>
  );
}
