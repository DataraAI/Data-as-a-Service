import React from 'react';

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  body {
    font-family: 'Inter', sans-serif;
    --teal: #0d9488;
    --teal-bright: #1de9b6;
    --blue: #1d4ed8;
    --purple: #7c3aed;
    --amber: #b45309;
    --bg: #ffffff;
    --bg-alt: #f8fafc;
    --bg-alt2: #f1f5f9;
    --bg-card: #ffffff;
    --border: #e5e7eb;
    --muted: #6b7280;
    --text: #0f172a;
    --text-2: #374151;
    background: var(--bg);
    color: var(--text);
  }

  /* ── NAV ── */
  .nav-d {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: stretch; height: 88px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .nav-d-logo {
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 0 32px; border-right: 1px solid var(--border);
    min-width: 220px; flex-shrink: 0; text-align: center;
    text-decoration: none; transition: background .2s;
  }
  .nav-d-logo:hover { background: rgba(13,148,136,0.04); }
  .nav-d-logo .d-logo-name { font-size: 18px; font-weight: 800; letter-spacing: .04em; color: var(--teal); }
  .nav-d-logo .d-logo-sub { font-size: 11px; font-weight: 500; color: var(--muted); margin-top: 2px; }

  .nav-d-tabs { display: flex; align-items: stretch; flex: 1; }
  .nav-d-tab {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; text-decoration: none; color: var(--muted);
    border-right: 1px solid var(--border);
    position: relative; transition: color .2s, background .2s;
  }
  .nav-d-tab:last-child { border-right: none; }
  .nav-d-tab:hover { color: var(--text); background: var(--bg-alt); }
  .nav-d-tab .tab-label { font-size: 15px; font-weight: 700; }
  .nav-d-tab .tab-sub { font-size: 10px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; opacity: .6; }
  .nav-d-tab::after { content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 2px; border-radius: 2px 2px 0 0; background: transparent; transition: background .2s; }
  .nav-d-tab.active { color: var(--teal); background: rgba(13,148,136,0.04); }
  .nav-d-tab.active::after { background: var(--teal); }
  .nav-d-tab.active .tab-sub { opacity: .8; }

  /* ── SIDEBAR ── */
  .sidebar {
    width: 220px; flex-shrink: 0;
    background: var(--bg-alt);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    min-height: calc(100vh - 88px);
  }
  .sidebar-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 9px;
    text-decoration: none; margin-bottom: 4px;
    transition: background .15s; color: var(--text-2);
  }
  .sidebar-item:hover { background: rgba(13,148,136,0.06); }
  .sidebar-item.active { background: rgba(13,148,136,0.1); border: 1px solid rgba(13,148,136,0.2); }

  /* ── Transform card ── */
  .xform-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
    padding: 20px 24px 20px 27px;
    transition: box-shadow .25s, border-color .25s;
    position: relative;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .xform-card::before {
    content: ''; position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px; border-radius: 14px 0 0 14px;
  }
  .card-dc::before { background: linear-gradient(to bottom, #1d4ed8 0%, rgba(29,78,216,0.15) 100%); }
  .card-dc:hover { box-shadow: 0 6px 28px rgba(29,78,216,0.10); border-color: rgba(29,78,216,0.2); }
  .card-hu::before { background: linear-gradient(to bottom, #0d9488 0%, rgba(13,148,136,0.15) 100%); }
  .card-hu:hover { box-shadow: 0 6px 28px rgba(13,148,136,0.10); border-color: rgba(13,148,136,0.2); }
  .card-au::before { background: linear-gradient(to bottom, #7c3aed 0%, rgba(124,58,237,0.15) 100%); }
  .card-au:hover { box-shadow: 0 6px 28px rgba(124,58,237,0.10); border-color: rgba(124,58,237,0.2); }

  /* ── EXO image box ── */
  .exo-box {
    position: relative; border-radius: 10px; overflow: hidden;
    border: 1.5px solid rgba(29,78,216,0.4); height: 160px;
    box-shadow: 0 2px 8px rgba(29,78,216,0.08);
  }
  .exo-label { position: absolute; top: 8px; left: 8px; font-size: 9px; font-weight: 800; letter-spacing: .12em; color: #fff; background: #1d4ed8; padding: 3px 8px; border-radius: 4px; }

  /* ── EGO image box ── */
  .ego-box {
    position: relative; border-radius: 8px; overflow: hidden;
    border: 1.5px solid rgba(13,148,136,0.4); height: 160px;
    box-shadow: 0 2px 8px rgba(13,148,136,0.08);
  }
  .ego-label { position: absolute; top: 6px; left: 6px; font-size: 8px; font-weight: 800; letter-spacing: .08em; color: #fff; background: var(--teal); padding: 2px 6px; border-radius: 3px; }

  /* ── 2×2 EGO grid ── */
  .ego-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

  /* ── Arrow pipe ── */
  .pipe { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 0 16px; flex-shrink: 0; }
  .pipe-line { width: 2px; height: 24px; background: linear-gradient(to bottom, rgba(13,148,136,0.1), rgba(13,148,136,0.4), rgba(13,148,136,0.1)); }
  .pipe-badge {
    background: rgba(13,148,136,0.05);
    border: 1.5px solid rgba(13,148,136,0.3);
    border-radius: 16px; padding: 16px 14px; text-align: center; white-space: nowrap;
  }

  /* ── Stats strip ── */
  .stat-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .stat-tile { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; text-align: center; transition: border-color .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .stat-tile:hover { border-color: rgba(13,148,136,0.25); }
  .stat-num { font-size: 26px; font-weight: 900; color: var(--teal); letter-spacing: -1px; margin: 0; }
  .stat-lbl { font-size: 10px; font-weight: 600; color: var(--muted); margin: 3px 0 0; letter-spacing: .1em; text-transform: uppercase; }

  /* ── Section heading ── */
  .section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .section-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 8px; flex-shrink: 0; }
  .section-pill-dc { background: rgba(29,78,216,0.07); border: 1px solid rgba(29,78,216,0.18); }
  .section-pill-hu { background: rgba(13,148,136,0.07); border: 1px solid rgba(13,148,136,0.18); }
  .section-pill-au { background: rgba(124,58,237,0.07); border: 1px solid rgba(124,58,237,0.18); }

  /* ── Tags ── */
  .tag { display: inline-block; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 3px; }
  .tag-teal   { background: rgba(13,148,136,0.08);  color: #0d9488; border: 1px solid rgba(13,148,136,0.2); }
  .tag-blue   { background: rgba(29,78,216,0.08);   color: #1d4ed8; border: 1px solid rgba(29,78,216,0.2); }
  .tag-orange { background: rgba(234,88,12,0.08);   color: #ea580c; border: 1px solid rgba(234,88,12,0.2); }
  .tag-purple { background: rgba(124,58,237,0.08);  color: #7c3aed; border: 1px solid rgba(124,58,237,0.2); }

  /* ── Availability ── */
  .avail-lib { font-size: 10px; font-weight: 700; color: #16a34a; background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.2); padding: 3px 10px; border-radius: 10px; white-space: nowrap; }
  .avail-od  { font-size: 10px; font-weight: 700; color: #b45309; background: rgba(180,83,9,0.08);  border: 1px solid rgba(180,83,9,0.2);  padding: 3px 10px; border-radius: 10px; white-space: nowrap; }

  /* scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
`;

export default function RoboEyeViewLight() {
  return (
    <>
      <style>{styles}</style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Top nav ── */}
      <nav className="nav-d">
        <a href="homepage_light.html" className="nav-d-logo">
          <span className="d-logo-name">DataraAI</span>
          <span className="d-logo-sub">← Back to Home</span>
        </a>
        <div className="nav-d-tabs">
          <a href="robodatahub_light.html" className="nav-d-tab">
            <span className="tab-label">RoboDataHub</span>
            <span className="tab-sub">Dataset Catalog</span>
          </a>
          <a href="#" className="nav-d-tab active">
            <span className="tab-label">RoboEyeView</span>
            <span className="tab-sub">Visual Intelligence</span>
          </a>
          <a href="robohandmotion_light.html" className="nav-d-tab">
            <span className="tab-label">RoboHandMotion</span>
            <span className="tab-sub">Humanoid Data</span>
          </a>
          <a href="robotaskmanipulator_light.html" className="nav-d-tab">
            <span className="tab-label">RoboTaskManipulator</span>
            <span className="tab-sub">Task Execution</span>
          </a>
        </div>
      </nav>

      {/* ── Sidebar + Main ── */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 88px)' }}>

        {/* Sidebar */}
        <div className="sidebar">
          <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '.04em', color: 'var(--teal)', margin: '0 0 4px' }}>DataraAI</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Visual Intelligence</p>
          </div>
          <div style={{ padding: '16px 12px', flex: 1 }}>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', padding: '0 8px', margin: '0 0 12px' }}>Verticals</p>
            <a href="#dc" className="sidebar-item active">
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#1d4ed8', flexShrink: 0 }}></span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Data Center</span>
            </a>
            <a href="#hu" className="sidebar-item">
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0d9488', flexShrink: 0 }}></span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-2)' }}>Humanoid</span>
            </a>
            <a href="#au" className="sidebar-item">
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#7c3aed', flexShrink: 0 }}></span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-2)' }}>Automotive</span>
            </a>
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <button
              style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .2s' }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '.88'; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >Get Access</button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '36px 44px', overflow: 'auto', background: 'var(--bg)' }}>

          {/* Page header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
              </div>
              <h1 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text)', margin: 0, lineHeight: 1, letterSpacing: '-.5px' }}>RoboEyeView</h1>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--teal)', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.22)', padding: '3px 9px', borderRadius: '20px', letterSpacing: '.08em' }}>PATENTED</span>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.8, maxWidth: '640px' }}>Patented pipeline that converts <span style={{ color: 'var(--blue)', fontWeight: 600 }}>EXO</span> footage into <span style={{ color: 'var(--teal)', fontWeight: 600 }}>EGO</span> datasets — labeled and ready for robot model training.</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', background: 'rgba(29,78,216,0.07)', border: '1px solid rgba(29,78,216,0.18)', padding: '5px 13px', borderRadius: '6px' }}><strong>EXO</strong> — Exocentric: external fixed-camera view of the workspace</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--teal)', background: 'rgba(13,148,136,0.07)', border: '1px solid rgba(13,148,136,0.18)', padding: '5px 13px', borderRadius: '6px' }}><strong>EGO</strong> — Egocentric: synthesized robot's-eye perspective for training</span>
            </div>
          </div>

          {/* Stats strip */}
          <div className="stat-strip">
            <div className="stat-tile"><p className="stat-num">6</p><p className="stat-lbl">Datasets</p></div>
            <div className="stat-tile"><p className="stat-num">5,570+</p><p className="stat-lbl">EGO Hours</p></div>
            <div className="stat-tile"><p className="stat-num">3</p><p className="stat-lbl">Verticals</p></div>
            <div className="stat-tile" style={{ borderColor: 'rgba(13,148,136,0.2)', background: 'rgba(13,148,136,0.04)' }}>
              <p className="stat-num" style={{ fontSize: '18px', letterSpacing: 0 }}>Patented</p>
              <p className="stat-lbl">EXO → EGO Pipeline</p>
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px 32px', marginBottom: '40px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#9ca3af', margin: '0 0 24px', letterSpacing: '.14em', textTransform: 'uppercase' }}>HOW IT WORKS</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>

              {/* EXO block */}
              <div style={{ flex: 1, background: 'rgba(29,78,216,0.05)', border: '1px solid rgba(29,78,216,0.18)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 4px' }}>Step 01 · Capture</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Exocentric Footage</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>External, third-person footage from any fixed camera — overhead, wall-mounted, or stationary.</p>
              </div>

              {/* Arrow 1 */}
              <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '2px', background: 'linear-gradient(to right,#1d4ed8,#0d9488)', borderRadius: '2px' }}></div>
                  <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '11px solid #0d9488' }}></div>
                </div>
              </div>

              {/* Engine block */}
              <div style={{ flex: 1, background: 'rgba(13,148,136,0.07)', border: '1.5px solid rgba(13,148,136,0.35)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--teal)', margin: '0 0 4px' }}>Step 02</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>RoboEyeView Engine</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>Scene reconstruction &amp; view synthesis.</p>
              </div>

              {/* Arrow 2 */}
              <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '2px', background: 'linear-gradient(to right,#0d9488,#b45309)', borderRadius: '2px' }}></div>
                  <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '11px solid #b45309' }}></div>
                </div>
              </div>

              {/* EGO block */}
              <div style={{ flex: 1, background: 'rgba(180,83,9,0.05)', border: '1px solid rgba(180,83,9,0.18)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(180,83,9,0.1)', border: '1px solid rgba(180,83,9,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                </div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 4px' }}>Step 03 · Training Data</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Egocentric Datasets</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>Robot's-eye perspective — labeled, multi-angle, ready for model training.</p>
              </div>

            </div>
          </div>

          {/* Transformation showcase */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* ── Data Center ── */}
            <div id="dc">
              <div className="section-head">
                <div className="section-pill section-pill-dc">
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#1d4ed8', flexShrink: 0 }}></span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Data Center</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>2 datasets · 2,040 hrs</span>
                </div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right,rgba(29,78,216,0.2),transparent)', marginLeft: '4px' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Dataset 1 */}
                <div className="xform-card card-dc">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Server Rack Hardware Swap</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Two-technician swap — external surveillance capture → 3 synthesized EGO views</p>
                    </div>
                    <span className="avail-lib">In Library</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/data1_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', margin: '0 0 2px' }}>RoboEyeView</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>View Synthesis</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 6px' }}>Generated EGO Views</p>
                      <div className="ego-grid">
                        <div className="ego-box"><img src="images/rev/data1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Front</span></div>
                        <div className="ego-box"><img src="images/rev/data1_ego2.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Overhead</span></div>
                        <div className="ego-box"><img src="images/rev/data1_ego3.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Side</span></div>
                        <div className="ego-box"><img src="images/rev/data1_ego3.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Low Angle</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-teal">Scene Reconstruction</span>
                    <span className="tag tag-teal">Depth Estimation</span>
                    <span className="tag tag-blue">Multi-angle Synthesis</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--teal)' }}>1,200 hrs EGO output</span>
                  </div>
                </div>

                {/* Dataset 2 */}
                <div className="xform-card card-dc">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Server Rack Inspection</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Single technician inspection — EXO Data → 3 synthesized robot viewpoints</p>
                    </div>
                    <span className="avail-lib">In Library</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/data2_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', margin: '0 0 2px' }}>RoboEyeView</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>View Synthesis</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 6px' }}>Generated EGO Views</p>
                      <div className="ego-grid">
                        <div className="ego-box"><img src="images/rev/data2_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Front</span></div>
                        <div className="ego-box"><img src="images/rev/data2_ego2.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Overhead</span></div>
                        <div className="ego-box"><img src="images/rev/data2_ego3.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Side</span></div>
                        <div className="ego-box"><img src="images/rev/data2_ego3.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Low Angle</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-teal">Scene Reconstruction</span>
                    <span className="tag tag-teal">Depth Estimation</span>
                    <span className="tag tag-blue">Multi-angle Synthesis</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--teal)' }}>840 hrs EGO output</span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Humanoid ── */}
            <div id="hu">
              <div className="section-head">
                <div className="section-pill section-pill-hu">
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#0d9488', flexShrink: 0 }}></span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Humanoid</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>3 datasets · 1,430 hrs</span>
                </div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right,rgba(13,148,136,0.2),transparent)', marginLeft: '4px' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Human 1 */}
                <div className="xform-card card-hu">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Kitchen Drawer Manipulation</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Full-body EXO of trash bag handling → synthesized robot hand-level EGO view</p>
                    </div>
                    <span className="avail-od">On-demand</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/human1_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', margin: '0 0 2px' }}>RoboEyeView</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>Hand Tracking</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 6px' }}>Generated EGO Views</p>
                      <div className="ego-grid">
                        <div className="ego-box"><img src="images/rev/human1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Robot Hand-level</span></div>
                        <div className="ego-box"><img src="images/rev/human1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Side</span></div>
                        <div className="ego-box"><img src="images/rev/human1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Overhead</span></div>
                        <div className="ego-box"><img src="images/rev/human1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Low Angle</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-teal">Hand Pose Tracking</span>
                    <span className="tag tag-teal">Wrist-level Synthesis</span>
                    <span className="tag tag-orange">Grasp Points</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--teal)' }}>380 hrs EGO output</span>
                  </div>
                </div>

                {/* Human 2 */}
                <div className="xform-card card-hu">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Surface Cleaning — Stovetop</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Full-body cleaning task EXO → 2 robot-perspective EGO views at different proximities</p>
                    </div>
                    <span className="avail-lib">In Library</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/human2_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', margin: '0 0 2px' }}>RoboEyeView</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>Motion Synthesis</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 6px' }}>Generated EGO Views</p>
                      <div className="ego-grid">
                        <div className="ego-box"><img src="images/rev/human2_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Mid-range</span></div>
                        <div className="ego-box"><img src="images/rev/human2_ego2.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Close-up</span></div>
                        <div className="ego-box"><img src="images/rev/human2_ego2.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Overhead</span></div>
                        <div className="ego-box"><img src="images/rev/human2_ego2.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Low Angle</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-teal">Hand Pose Tracking</span>
                    <span className="tag tag-teal">Surface Segmentation</span>
                    <span className="tag tag-blue">Multi-distance Views</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--teal)' }}>450 hrs EGO output</span>
                  </div>
                </div>

                {/* Human 3 */}
                <div className="xform-card card-hu">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Dishwashing — Sink Manipulation</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Wide kitchen scene EXO → synthesized close-up EGO at hand manipulation level</p>
                    </div>
                    <span className="avail-od">On-demand</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/human3_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', margin: '0 0 2px' }}>RoboEyeView</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>Grasp Synthesis</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 6px' }}>Generated EGO Views</p>
                      <div className="ego-grid">
                        <div className="ego-box"><img src="images/rev/human3_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Hand-level Grasp</span></div>
                        <div className="ego-box"><img src="images/rev/human3_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Side</span></div>
                        <div className="ego-box"><img src="images/rev/human3_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Overhead</span></div>
                        <div className="ego-box"><img src="images/rev/human3_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Low Angle</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-teal">Grasp Keypoints</span>
                    <span className="tag tag-teal">Wet Object Handling</span>
                    <span className="tag tag-orange">Edge Conditions</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--teal)' }}>600 hrs EGO output</span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Automotive ── */}
            <div id="au">
              <div className="section-head">
                <div className="section-pill section-pill-au">
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#7c3aed', flexShrink: 0 }}></span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Automotive</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>1 dataset · 2,100 hrs</span>
                </div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right,rgba(124,58,237,0.2),transparent)', marginLeft: '4px' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div className="xform-card card-au">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>BMW Grille Assembly — Production Line</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Side-view EXO of assembly worker → 4 synthesized robot viewpoints including rotation and low-angle</p>
                    </div>
                    <span className="avail-lib">In Library</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/auto1_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--teal)', margin: '0 0 2px' }}>RoboEyeView</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>4 Viewpoints</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 6px' }}>Generated EGO Views</p>
                      <div className="ego-grid">
                        <div className="ego-box"><img src="images/rev/auto1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Front</span></div>
                        <div className="ego-box"><img src="images/rev/auto1_ego2.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Rotate Left</span></div>
                        <div className="ego-box"><img src="images/rev/auto1_ego3.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Low Angle</span></div>
                        <div className="ego-box"><img src="images/rev/auto1_ego4.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="ego-label">Studio</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-teal">Scene Reconstruction</span>
                    <span className="tag tag-teal">Rotation Synthesis</span>
                    <span className="tag tag-purple">Low-angle Views</span>
                    <span className="tag tag-blue">4 Viewpoints</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--teal)' }}>2,100 hrs EGO output</span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Request section ── */}
            <div style={{ marginTop: '4px', padding: '28px 32px', background: 'linear-gradient(135deg,rgba(13,148,136,0.05) 0%,rgba(29,78,216,0.03) 100%)', border: '1.5px dashed rgba(13,148,136,0.25)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Run RoboEyeView on Your EXO Footage</p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.5, maxWidth: '480px' }}>Already have EXO footage? We'll synthesize robot-ready EGO datasets — egocentric robot-perspective viewpoints — across any task, environment, or robot form factor.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#1d4ed8', background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Data Center</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#0d9488', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Humanoid</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Automotive</span>
                </div>
                <button
                  style={{ width: '100%', fontSize: '13px', fontWeight: 700, color: '#fff', background: 'var(--teal)', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .2s', whiteSpace: 'nowrap' }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '.88'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >Submit Your Footage</button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '36px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--teal)', letterSpacing: '.04em' }}>DataraAI</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a
            href="homepage_light.html"
            style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color .2s' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
          >Home</a>
          <a
            href="#"
            style={{ color: '#9ca3af', textDecoration: 'none' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
          >Docs</a>
          <a
            href="company.html"
            style={{ color: '#9ca3af', textDecoration: 'none' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
          >Company</a>
          <a
            href="#"
            style={{ color: '#9ca3af', textDecoration: 'none' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
          >Contact</a>
        </div>
        <div>© 2025 DataraAI · NVIDIA Inception Member</div>
      </footer>
    </>
  );
}
