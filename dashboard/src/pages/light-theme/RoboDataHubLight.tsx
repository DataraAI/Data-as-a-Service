import React, { useState } from 'react';

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
  .sidebar-item.active {
    background: rgba(13,148,136,0.1);
    border: 1px solid rgba(13,148,136,0.2);
  }

  /* ── DATASET CARD ── */
  .ds-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px; overflow: hidden;
    transition: border-color .2s, transform .2s, box-shadow .2s;
    display: flex; flex-direction: column;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .ds-card:hover {
    border-color: #5eead4;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(13,148,136,0.10);
  }
  .card-body { flex: 1; display: flex; flex-direction: column; padding: 12px; }
  .card-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; }

  /* ── TAGS ── */
  .tag { display: inline-block; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 3px; }
  .tag-teal { background: rgba(13,148,136,0.08); color: #0d9488; border: 1px solid rgba(13,148,136,0.2); }
  .tag-blue { background: rgba(29,78,216,0.08); color: #1d4ed8; border: 1px solid rgba(29,78,216,0.2); }
  .tag-orange { background: rgba(251,146,60,0.1); color: #ea580c; border: 1px solid rgba(251,146,60,0.2); }
  .tag-purple { background: rgba(124,58,237,0.08); color: #7c3aed; border: 1px solid rgba(124,58,237,0.2); }

  /* ── EXO / EGO badges ── */
  .badge-exo {
    font-size: 9px; font-weight: 800; letter-spacing: .08em;
    color: #1d4ed8; background: rgba(29,78,216,0.08);
    border: 1px solid rgba(29,78,216,0.3);
    padding: 2px 6px; border-radius: 3px;
  }
  .badge-ego {
    font-size: 9px; font-weight: 800; letter-spacing: .08em;
    color: #0d9488; background: rgba(13,148,136,0.08);
    border: 1px solid rgba(13,148,136,0.3);
    padding: 2px 6px; border-radius: 3px;
  }

  /* ── Availability badges ── */
  .avail-lib { font-size: 10px; font-weight: 600; color: #16a34a; background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.2); padding: 2px 8px; border-radius: 10px; }
  .avail-od  { font-size: 10px; font-weight: 600; color: #b45309; background: rgba(180,83,9,0.08);  border: 1px solid rgba(180,83,9,0.2);  padding: 2px 8px; border-radius: 10px; }

  /* ── Search input ── */
  .search-wrap { position: relative; }
  .search-wrap svg.icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }
  .search-input {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 8px; padding: 8px 12px 8px 34px;
    font-size: 13px; color: var(--text); outline: none;
    font-family: Inter, sans-serif; width: 260px;
    transition: border-color .2s;
  }
  .search-input::placeholder { color: #9ca3af; }
  .search-input:focus { border-color: rgba(13,148,136,0.4); }

  /* ── Section heading ── */
  .section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }

  /* ── Card grid ── */
  .card-grid { grid-template-columns: repeat(4,1fr); }
  .card-grid.two-panel { grid-template-columns: repeat(2,1fr); }

  /* ── Card image overlay ── */
  .card-img-overlay { background: linear-gradient(to top, #ffffff 0%, transparent 55%); }

  /* scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
`;

export default function RoboDataHubLight() {
  const [layout, setLayout] = useState<4 | 2>(4);

  return (
    <>
      <style>{styles}</style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Top nav bar ── */}
      <nav className="nav-d">
        <a href="homepage_light.html" className="nav-d-logo">
          <span className="d-logo-name">DataraAI</span>
          <span className="d-logo-sub">← Back to Home</span>
        </a>
        <div className="nav-d-tabs">
          <a href="#" className="nav-d-tab active">
            <span className="tab-label">RoboDataHub</span>
            <span className="tab-sub">Dataset Catalog</span>
          </a>
          <a href="roboeyeview_light.html" className="nav-d-tab">
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
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Physical AI Data</p>
          </div>
          <div style={{ padding: '16px 12px', flex: 1 }}>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', padding: '0 8px', margin: '0 0 12px' }}>Verticals</p>
            <a href="#dc" className="sidebar-item active">
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#1d4ed8', flexShrink: 0 }}></span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Data Center</span>
            </a>
            <a href="#wh" className="sidebar-item">
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ea580c', flexShrink: 0 }}></span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-2)' }}>Warehouse</span>
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
        <div style={{ flex: 1, padding: '32px 40px', overflow: 'auto', background: 'var(--bg)' }}>

          {/* Header row: title + search + layout toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>RoboDataHub</h1>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>100+ datasets · Physical AI training data</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="search-wrap">
                <svg className="icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="search-input" type="text" placeholder="Search datasets…" />
              </div>
              <button
                style={{ background: 'var(--teal)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .2s' }}
                onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '.88'; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >Search</button>
              {/* layout toggle */}
              <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-alt2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '3px' }}>
                <button
                  onClick={() => setLayout(4)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: layout === 4 ? 'var(--teal)' : 'transparent', color: layout === 4 ? '#fff' : 'var(--muted)', transition: 'all .15s' }}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1" /><rect x="9" y="0" width="6" height="6" rx="1" /><rect x="0" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
                  4
                </button>
                <button
                  onClick={() => setLayout(2)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: layout === 2 ? 'var(--teal)' : 'transparent', color: layout === 2 ? '#fff' : 'var(--muted)', transition: 'all .15s' }}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="6" height="16" rx="1" /><rect x="9" y="0" width="6" height="16" rx="1" /></svg>
                  2
                </button>
              </div>
            </div>
          </div>

          {/* Dataset sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* ── Data Center ── */}
            <div id="dc" onClick={() => { window.location.href = 'robodatahubadc.html'; }} style={{ cursor: 'pointer' }}>
              <div className="section-head">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#1d4ed8', flexShrink: 0 }}></span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Data Center</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(29,78,216,0.15)' }}></div>
              </div>
              <div className={`card-grid${layout === 2 ? ' two-panel' : ''}`} style={{ display: 'grid', gap: '12px' }}>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/dc_Screenshot_2026-01-13_at_2.06.33_PM.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Rack Cabling &amp; Patch Panel</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Full patch panel workflow — cable insertion, loop management, labeling on live data center floor.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-teal">Bbox</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>1,200 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/dc_Screenshot_2026-01-13_at_4.38.50_PM.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Loop Cable Installation</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Hands-on cable loop management — routing, fastening, and dress-out in live server room environment.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>600 hrs</p>
                      <span className="avail-od">On-demand</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/dc_Screenshot_2026-01-13_at_4.38.12_PM.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-ego">EGO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Server Rack Inspection</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>EGO-centric inspection — slot identification, LED status reading, and hardware swap sequences.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-teal">EGO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-blue">Bbox</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>840 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/dc_Screenshot_2026-01-13_at_4.38.43_PM.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Hardware Swap &amp; Replacement</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Drive, NIC, and PSU replacement workflows across multiple server generations.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-purple">Seg</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>720 hrs</p>
                      <span className="avail-od">On-demand</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Warehouse ── */}
            <div id="wh" onClick={() => { window.location.href = 'robodatahubawarehouse.html'; }} style={{ cursor: 'pointer' }}>
              <div className="section-head">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ea580c', flexShrink: 0 }}></span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Warehouse</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(234,88,12,0.15)' }}></div>
              </div>
              <div className={`card-grid${layout === 2 ? ' two-panel' : ''}`} style={{ display: 'grid', gap: '12px' }}>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/wh_pexels-goldcircuits-8377802.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-ego">EGO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Pick &amp; Place — Shelf Interaction</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Robot-eye-view of shelf pick operations. Mixed SKUs, glare conditions, and dynamic obstacles.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-teal">EGO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-orange">Edge Cases</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>1,200 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/wh_pexels-endura-tiles-370085044-14554082.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Pallet Stacking &amp; Transport</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Overhead EXO capture of pallet build, wrap, and forklift handoff. Mixed-weight loads and aisle navigation.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-teal">Bbox</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>980 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/wh_pexels-ihsanaditya-10834810.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-ego">EGO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Inventory Scanning &amp; Audit</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Mobile robot scanning of barcodes and QR codes. Low-light and motion-blur edge cases included.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-teal">EGO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-orange">Edge Cases</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>650 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/wh_pexels-tiger-lily-4483772.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Conveyor Loading &amp; Sortation</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Package induction, divert, and sortation across high-speed conveyor lines. Multi-SKU parcels included.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-purple">Seg</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>780 hrs</p>
                      <span className="avail-od">On-demand</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Humanoid ── */}
            <div id="hu" onClick={() => { window.location.href = 'robodatahubahumanoid.html'; }} style={{ cursor: 'pointer' }}>
              <div className="section-head">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0d9488', flexShrink: 0 }}></span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Humanoid</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(13,148,136,0.15)' }}></div>
              </div>
              <div className={`card-grid${layout === 2 ? ' two-panel' : ''}`} style={{ display: 'grid', gap: '12px' }}>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/WebDishWashing.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Dishwashing — Hand Manipulation</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Fine-grained hand and object manipulation in wet, soapy conditions. Ideal for humanoid dexterity training.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Hand Pose</span>
                      <span className="tag tag-orange">Wet Conditions</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>600 hrs</p>
                      <span className="avail-od">On-demand</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/WebCleaning.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Surface Cleaning &amp; Wiping</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Humanoid arm trajectories for table, counter, and floor cleaning. Circular, linear, and avoidance wipe patterns.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Hand Pose</span>
                      <span className="tag tag-teal">Task Labels</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>450 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/WebTrashCollection.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-ego">EGO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Trash Collection &amp; Sorting</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Grasp-and-bin sequences for mixed waste streams. Recyclable detection, lid manipulation, and bag tying.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-teal">EGO-Centric</span>
                      <span className="tag tag-teal">Hand Pose</span>
                      <span className="tag tag-orange">Edge Cases</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>380 hrs</p>
                      <span className="avail-od">On-demand</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/WebWasher.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Laundry — Load &amp; Fold</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Cloth manipulation — sorting, loading washer/dryer, and folding garments. High deformable-object variety.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Hand Pose</span>
                      <span className="tag tag-purple">Seg</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>520 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Automotive ── */}
            <div id="au" onClick={() => { window.location.href = 'robodatahubauto.html'; }} style={{ cursor: 'pointer' }}>
              <div className="section-head">
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#7c3aed', flexShrink: 0 }}></span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Automotive</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(124,58,237,0.15)' }}></div>
              </div>
              <div className={`card-grid${layout === 2 ? ' two-panel' : ''}`} style={{ display: 'grid', gap: '12px' }}>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/frontGrille_012.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>BMW Front Grille Assembly</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Production-line assembly from BMW facility. Multi-step grille fitting, fastening and QC inspection.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-purple">Seg</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>2,100 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/frontSeat_007.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Front Seat Installation</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Seat alignment, bolt-down, and connector-clip sequences across multiple vehicle platforms.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-teal">Bbox</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>1,400 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/passengerSeat_0100_Rotate_left_45_degrees.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-ego">EGO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Passenger Seat QC Inspection</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>EGO-centric quality inspection of seat fitment, trim alignment, and seatbelt anchor verification.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-teal">EGO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-purple">Seg</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>900 hrs</p>
                      <span className="avail-od">On-demand</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
                    <img src="images/rearBumper_021.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0 }} className="card-img-overlay"></div>
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }} className="badge-exo">EXO</span>
                  </div>
                  <div className="card-body">
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Rear Bumper Assembly</h3>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Bumper alignment, clip insertion, and sensor harness routing across multiple trim levels.</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span className="tag tag-blue">EXO-Centric</span>
                      <span className="tag tag-teal">Task Labels</span>
                      <span className="tag tag-orange">Edge Cases</span>
                    </div>
                    <div className="card-footer">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>1,100 hrs</p>
                      <span className="avail-lib">In Library</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Custom Dataset Request ── */}
            <div style={{ marginTop: '8px', padding: '28px 32px', background: 'linear-gradient(135deg,rgba(13,148,136,0.05) 0%,rgba(29,78,216,0.03) 100%)', border: '1.5px dashed rgba(13,148,136,0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 3px' }}>Request a Custom Dataset</p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>Don't see what you need? Our 100+ person team captures any task, environment, or robot workflow on demand.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#1d4ed8', background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Data Center</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#ea580c', background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Warehouse</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#0d9488', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Humanoid</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Automotive</span>
                </div>
                <button
                  style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: 'var(--teal)', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'opacity .2s' }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '.88'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >Submit Request</button>
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
            style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color .2s' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
          >Docs</a>
          <a
            href="#"
            style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color .2s' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
          >Customers</a>
          <a
            href="company.html"
            style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color .2s' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
          >Company</a>
          <a
            href="#"
            style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color .2s' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}
          >Contact</a>
        </div>
        <div>© 2025 DataraAI · NVIDIA Inception Member</div>
      </footer>
    </>
  );
}
