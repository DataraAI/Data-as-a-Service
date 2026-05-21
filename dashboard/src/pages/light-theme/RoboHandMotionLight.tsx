import React from 'react';

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  body {
    font-family: 'Inter', sans-serif;
    --teal: #0d9488;
    --blue: #1d4ed8;
    --purple: #7c3aed;
    --orange: #ea580c;
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
  .nav-d-logo:hover { background: rgba(124,58,237,0.04); }
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
  .nav-d-tab.active { color: var(--purple); background: rgba(124,58,237,0.04); }
  .nav-d-tab.active::after { background: var(--purple); }
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
  .sidebar-item:hover { background: rgba(124,58,237,0.05); }
  .sidebar-item.active { background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.18); }

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
  .card-dk::before { background: linear-gradient(to bottom, #7c3aed 0%, rgba(124,58,237,0.15) 100%); }
  .card-dk:hover { box-shadow: 0 6px 28px rgba(124,58,237,0.10); border-color: rgba(124,58,237,0.2); }
  .card-ht::before { background: linear-gradient(to bottom, #ea580c 0%, rgba(234,88,12,0.15) 100%); }
  .card-ht:hover { box-shadow: 0 6px 28px rgba(234,88,12,0.10); border-color: rgba(234,88,12,0.2); }

  /* ── EXO image box ── */
  .exo-box {
    position: relative; border-radius: 10px; overflow: hidden;
    border: 1.5px solid rgba(29,78,216,0.4); height: 160px;
    box-shadow: 0 2px 8px rgba(29,78,216,0.08);
  }
  .exo-label { position: absolute; top: 8px; left: 8px; font-size: 9px; font-weight: 800; letter-spacing: .12em; color: #fff; background: #1d4ed8; padding: 3px 8px; border-radius: 4px; }

  /* ── Motion output box ── */
  .motion-box {
    position: relative; border-radius: 8px; overflow: hidden;
    border: 1.5px solid rgba(124,58,237,0.4); height: 160px;
    box-shadow: 0 2px 8px rgba(124,58,237,0.08);
  }
  .motion-label { position: absolute; top: 6px; left: 6px; font-size: 8px; font-weight: 800; letter-spacing: .08em; color: #fff; background: #7c3aed; padding: 2px 6px; border-radius: 3px; }

  /* ── Output grid ── */
  .output-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

  /* ── Arrow pipe (purple) ── */
  .pipe { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 0 16px; flex-shrink: 0; }
  .pipe-line { width: 2px; height: 24px; background: linear-gradient(to bottom, rgba(124,58,237,0.1), rgba(124,58,237,0.4), rgba(124,58,237,0.1)); }
  .pipe-badge {
    background: rgba(124,58,237,0.05);
    border: 1.5px solid rgba(124,58,237,0.28);
    border-radius: 16px; padding: 16px 14px; text-align: center; white-space: nowrap;
  }

  /* ── Stats strip ── */
  .stat-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .stat-tile { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; text-align: center; transition: border-color .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .stat-tile:hover { border-color: rgba(124,58,237,0.22); }
  .stat-num { font-size: 26px; font-weight: 900; color: var(--purple); letter-spacing: -1px; margin: 0; }
  .stat-lbl { font-size: 10px; font-weight: 600; color: var(--muted); margin: 3px 0 0; letter-spacing: .1em; text-transform: uppercase; }

  /* ── Section heading ── */
  .section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .section-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 8px; flex-shrink: 0; }
  .section-pill-dk { background: rgba(124,58,237,0.07); border: 1px solid rgba(124,58,237,0.18); }
  .section-pill-ht { background: rgba(234,88,12,0.07);  border: 1px solid rgba(234,88,12,0.18); }

  /* ── Tags ── */
  .tag { display: inline-block; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 3px; }
  .tag-teal   { background: rgba(13,148,136,0.08);  color: #0d9488; border: 1px solid rgba(13,148,136,0.2); }
  .tag-blue   { background: rgba(29,78,216,0.08);   color: #1d4ed8; border: 1px solid rgba(29,78,216,0.2); }
  .tag-orange { background: rgba(234,88,12,0.08);   color: #ea580c; border: 1px solid rgba(234,88,12,0.2); }
  .tag-purple { background: rgba(124,58,237,0.08);  color: #7c3aed; border: 1px solid rgba(124,58,237,0.2); }

  /* ── Availability ── */
  .avail-lib { font-size: 10px; font-weight: 700; color: #16a34a; background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.2); padding: 3px 10px; border-radius: 10px; white-space: nowrap; }
  .avail-od  { font-size: 10px; font-weight: 700; color: #b45309; background: rgba(180,83,9,0.08);  border: 1px solid rgba(180,83,9,0.2);  padding: 3px 10px; border-radius: 10px; white-space: nowrap; }

  /* ── Dataset gallery (household cards) ── */
  .ds-gallery { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
  .ds-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: border-color .2s, box-shadow .2s; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .ds-card:hover { border-color: rgba(124,58,237,0.25); box-shadow: 0 6px 20px rgba(124,58,237,0.08); }
  .ds-img { width: 100%; height: 150px; object-fit: cover; display: block; }
  .ds-body { padding: 14px 16px; }
  .ds-name { font-size: 13px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
  .ds-meta { font-size: 11px; color: var(--muted); margin: 0 0 10px; }
  .ds-tags { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }

  /* scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
`;

export default function RoboHandMotionLight() {
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
          <a href="roboeyeview_light.html" className="nav-d-tab">
            <span className="tab-label">RoboEyeView</span>
            <span className="tab-sub">Visual Intelligence</span>
          </a>
          <a href="#" className="nav-d-tab active">
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
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Hand Motion</p>
          </div>
          <div style={{ padding: '16px 12px', flex: 1 }}>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', padding: '0 8px', margin: '0 0 12px' }}>Verticals</p>
            <a href="#dk" className="sidebar-item active">
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#7c3aed', flexShrink: 0 }}></span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Dexterous</span>
            </a>
            <a href="#ht" className="sidebar-item">
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ea580c', flexShrink: 0 }}></span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-2)' }}>Household</span>
            </a>
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <button style={{ width: '100%', background: 'var(--purple)', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .2s' }} onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '.88'; }} onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}>Get Access</button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '36px 44px', overflow: 'auto', background: 'var(--bg)' }}>

          {/* Page header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                </svg>
              </div>
              <h1 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text)', margin: 0, lineHeight: 1, letterSpacing: '-.5px' }}>RoboHandMotion</h1>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--purple)', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.22)', padding: '3px 9px', borderRadius: '20px', letterSpacing: '.08em' }}>PATENTED</span>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.8, maxWidth: '640px' }}>
              Patented pipeline capturing <span style={{ color: 'var(--purple)', fontWeight: 600 }}>hand pose</span>, <span style={{ color: 'var(--blue)', fontWeight: 600 }}>tool interactions</span>, and <span style={{ color: 'var(--orange)', fontWeight: 600 }}>object states</span> — labeled and ready for dexterous robot model training.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--purple)', background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)', padding: '5px 13px', borderRadius: '6px' }}><strong>Hand Pose</strong> — Per-frame keypoint skeleton, joint angles &amp; finger trajectories</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', background: 'rgba(29,78,216,0.07)', border: '1px solid rgba(29,78,216,0.18)', padding: '5px 13px', borderRadius: '6px' }}><strong>Object State</strong> — Grasped object identity, orientation &amp; contact classification</span>
            </div>
          </div>

          {/* Stats */}
          <div className="stat-strip">
            <div className="stat-tile"><p className="stat-num">8</p><p className="stat-lbl">Datasets</p></div>
            <div className="stat-tile"><p className="stat-num">2,850+</p><p className="stat-lbl">Hours Labeled</p></div>
            <div className="stat-tile"><p className="stat-num">2</p><p className="stat-lbl">Verticals</p></div>
            <div className="stat-tile" style={{ borderColor: 'rgba(124,58,237,0.18)', background: 'rgba(124,58,237,0.04)' }}>
              <p className="stat-num" style={{ fontSize: '18px', letterSpacing: 0 }}>Patented</p>
              <p className="stat-lbl">Hand Motion Pipeline</p>
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px 32px', marginBottom: '40px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#9ca3af', margin: '0 0 24px', letterSpacing: '.14em', textTransform: 'uppercase' }}>HOW IT WORKS</p>
            <div style={{ display: 'flex', alignItems: 'center' }}>

              {/* Step 01 */}
              <div style={{ flex: 1, background: 'rgba(29,78,216,0.05)', border: '1px solid rgba(29,78,216,0.18)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 4px' }}>Step 01 · Capture</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Raw Video Footage</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>Third-person footage of hand tasks: household, kitchen, or manipulation — any fixed or mobile camera.</p>
              </div>

              {/* Arrow 1 */}
              <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: '56px', height: '2px', background: 'linear-gradient(to right,#1d4ed8,#7c3aed)', borderRadius: '2px' }}></div>
                <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '11px solid #7c3aed' }}></div>
              </div>

              {/* Engine */}
              <div style={{ flex: 1, background: 'rgba(124,58,237,0.07)', border: '1.5px solid rgba(124,58,237,0.32)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124,58,237,0.14)', border: '1px solid rgba(124,58,237,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                  </svg>
                </div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)', margin: '0 0 4px' }}>Step 02</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>RoboHandMotion Engine</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>Pose estimation, keypoint tracking &amp; interaction labeling.</p>
              </div>

              {/* Arrow 2 */}
              <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: '56px', height: '2px', background: 'linear-gradient(to right,#7c3aed,#ea580c)', borderRadius: '2px' }}></div>
                <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '11px solid #ea580c' }}></div>
              </div>

              {/* Step 03 */}
              <div style={{ flex: 1, background: 'rgba(234,88,12,0.05)', border: '1px solid rgba(234,88,12,0.18)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--orange)', margin: '0 0 4px' }}>Step 03 · Training Data</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Labeled Motion Datasets</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>Pose sequences, grasp annotations &amp; tool trajectories — ready for dexterous robot model training.</p>
              </div>

            </div>
          </div>

          {/* Datasets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* ── Dexterous Kitchen ── */}
            <div id="dk">
              <div className="section-head">
                <div className="section-pill section-pill-dk">
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#7c3aed', flexShrink: 0 }}></span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Dexterous Kitchen</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>3 datasets · 1,430 hrs</span>
                </div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right,rgba(124,58,237,0.2),transparent)', marginLeft: '4px' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Card 1: Drawer */}
                <div className="xform-card card-dk">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Kitchen Drawer Manipulation</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Full-body EXO of trash bag handling → hand-level pose &amp; grasp annotations</p>
                    </div>
                    <span className="avail-od">On-demand</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '200px', flexShrink: 0 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/human1_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Kitchen Drawer EXO" />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                          </svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--purple)', margin: '0 0 2px' }}>RoboHandMotion</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>Hand Tracking</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--orange)', margin: '0 0 6px' }}>Labeled Motion Output</p>
                      <div className="output-grid">
                        <div className="motion-box"><img src="images/rev/human1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Wrist Pose" /><span className="motion-label">Wrist Pose</span></div>
                        <div className="motion-box"><img src="images/rev/human1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Finger Joints" /><span className="motion-label">Finger Joints</span></div>
                        <div className="motion-box"><img src="images/rev/human1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Grasp Point" /><span className="motion-label">Grasp Point</span></div>
                        <div className="motion-box"><img src="images/rev/human1_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Motion Path" /><span className="motion-label">Motion Path</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-purple">Hand Pose Tracking</span>
                    <span className="tag tag-purple">Wrist-level Annotations</span>
                    <span className="tag tag-orange">Grasp Points</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--purple)' }}>380 hrs labeled</span>
                  </div>
                </div>

                {/* Card 2: Stovetop */}
                <div className="xform-card card-dk">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Surface Cleaning — Stovetop</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Full-body cleaning EXO → hand skeleton &amp; contact zone annotations at varied proximities</p>
                    </div>
                    <span className="avail-lib">In Library</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '200px', flexShrink: 0 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/human2_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Stovetop EXO" />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                          </svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--purple)', margin: '0 0 2px' }}>RoboHandMotion</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>Motion Synthesis</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--orange)', margin: '0 0 6px' }}>Labeled Motion Output</p>
                      <div className="output-grid">
                        <div className="motion-box"><img src="images/rev/human2_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Hand Path" /><span className="motion-label">Hand Path</span></div>
                        <div className="motion-box"><img src="images/rev/human2_ego2.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Contact Points" /><span className="motion-label">Contact Points</span></div>
                        <div className="motion-box"><img src="images/rev/human2_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Pose Sequence" /><span className="motion-label">Pose Sequence</span></div>
                        <div className="motion-box"><img src="images/rev/human2_ego2.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Close-up" /><span className="motion-label">Close-up</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-purple">Hand Pose Tracking</span>
                    <span className="tag tag-teal">Surface Segmentation</span>
                    <span className="tag tag-blue">Multi-distance Views</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--purple)' }}>450 hrs labeled</span>
                  </div>
                </div>

                {/* Card 3: Dishwashing */}
                <div className="xform-card card-dk">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Dishwashing — Sink Manipulation</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Wide kitchen scene EXO → grasp classification &amp; wet object handling annotations</p>
                    </div>
                    <span className="avail-od">On-demand</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '200px', flexShrink: 0 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', margin: '0 0 6px' }}>EXO Source</p>
                      <div className="exo-box">
                        <img src="images/rev/human3_exo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Dishwashing EXO" />
                        <span className="exo-label">EXO</span>
                      </div>
                    </div>
                    <div className="pipe">
                      <div className="pipe-line"></div>
                      <div className="pipe-badge">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                          </svg>
                        </div>
                        <p style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--purple)', margin: '0 0 2px' }}>RoboHandMotion</p>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Engine</p>
                        <p style={{ fontSize: '8px', color: 'var(--muted)', margin: '2px 0 0' }}>Grasp Synthesis</p>
                      </div>
                      <div className="pipe-line"></div>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M1 1l8 6-8 6" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--orange)', margin: '0 0 6px' }}>Labeled Motion Output</p>
                      <div className="output-grid">
                        <div className="motion-box"><img src="images/rev/human3_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Grasp Type" /><span className="motion-label">Grasp Type</span></div>
                        <div className="motion-box"><img src="images/rev/human3_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Object State" /><span className="motion-label">Object State</span></div>
                        <div className="motion-box"><img src="images/rev/human3_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Joint Angles" /><span className="motion-label">Joint Angles</span></div>
                        <div className="motion-box"><img src="images/rev/human3_ego1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Motion Arc" /><span className="motion-label">Motion Arc</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span className="tag tag-purple">Grasp Keypoints</span>
                    <span className="tag tag-teal">Wet Object Handling</span>
                    <span className="tag tag-orange">Edge Conditions</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: 'var(--purple)' }}>600 hrs labeled</span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Household Tasks Gallery ── */}
            <div id="ht">
              <div className="section-head">
                <div className="section-pill section-pill-ht">
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ea580c', flexShrink: 0 }}></span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Household Tasks</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>5 datasets · 1,420 hrs</span>
                </div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right,rgba(234,88,12,0.2),transparent)', marginLeft: '4px' }}></div>
              </div>
              <div className="ds-gallery">

                <div className="ds-card">
                  <img src="images/WebCleaning.png" className="ds-img" alt="Surface Cleaning" />
                  <div className="ds-body">
                    <p className="ds-name">Surface &amp; Floor Cleaning</p>
                    <p className="ds-meta">Sweeping, scrubbing motions — 3 tool types</p>
                    <div className="ds-tags">
                      <span className="tag tag-purple">Arm Trajectory</span>
                      <span className="tag tag-teal">Tool Grip</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: 'var(--purple)' }}>280 hrs</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <img src="images/WebDishWasher.png" className="ds-img" alt="Dishwasher Loading" />
                  <div className="ds-body">
                    <p className="ds-name">Dishwasher Loading</p>
                    <p className="ds-meta">Object placement, rack navigation, door operation</p>
                    <div className="ds-tags">
                      <span className="tag tag-purple">Bimanual Grasp</span>
                      <span className="tag tag-orange">Object Place</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: 'var(--purple)' }}>310 hrs</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <img src="images/WebDishWashing.png" className="ds-img" alt="Hand Dish Washing" />
                  <div className="ds-body">
                    <p className="ds-name">Hand Dish Washing</p>
                    <p className="ds-meta">Scrub, rinse, transfer — wet object sequences</p>
                    <div className="ds-tags">
                      <span className="tag tag-purple">Wet Grasp</span>
                      <span className="tag tag-teal">Force Est.</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: 'var(--purple)' }}>340 hrs</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <img src="images/WebTrashCollection.png" className="ds-img" alt="Trash Collection" />
                  <div className="ds-body">
                    <p className="ds-name">Trash Collection &amp; Sorting</p>
                    <p className="ds-meta">Pick, bag, and bin — varied object sizes &amp; weights</p>
                    <div className="ds-tags">
                      <span className="tag tag-purple">Lift &amp; Place</span>
                      <span className="tag tag-blue">Sort Logic</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: 'var(--purple)' }}>240 hrs</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <img src="images/WebWasher.png" className="ds-img" alt="Laundry" />
                  <div className="ds-body">
                    <p className="ds-name">Laundry — Washer Operation</p>
                    <p className="ds-meta">Load, sort, and transfer fabric items</p>
                    <div className="ds-tags">
                      <span className="tag tag-purple">Deformable Obj.</span>
                      <span className="tag tag-orange">Bimanual</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: 'var(--purple)' }}>250 hrs</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card">
                  <img src="images/WebWasher.png" className="ds-img" alt="Laundry Fold" />
                  <div className="ds-body">
                    <p className="ds-name">Laundry — Fold &amp; Transfer</p>
                    <p className="ds-meta">Garment folding, hang, and drawer placement</p>
                    <div className="ds-tags">
                      <span className="tag tag-purple">Deformable Obj.</span>
                      <span className="tag tag-orange">Bimanual</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: 'var(--purple)' }}>250 hrs</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Request section ── */}
            <div style={{ marginTop: '4px', padding: '28px 32px', background: 'linear-gradient(135deg,rgba(124,58,237,0.05) 0%,rgba(234,88,12,0.03) 100%)', border: '1.5px dashed rgba(124,58,237,0.22)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Run RoboHandMotion on Your Footage</p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.5, maxWidth: '480px' }}>Already have footage of hand tasks? We'll generate labeled pose sequences, grasp annotations, and motion trajectories — across any task, environment, or robot form factor.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Dexterous</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#ea580c', background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Household</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#0d9488', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Industrial</span>
                </div>
                <button style={{ width: '100%', fontSize: '13px', fontWeight: 700, color: '#fff', background: 'var(--purple)', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .2s', whiteSpace: 'nowrap' }} onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '.88'; }} onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}>Submit Your Footage</button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '36px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--teal)', letterSpacing: '.04em' }}>DataraAI</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="homepage_light.html" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color .2s' }} onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }} onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}>Home</a>
          <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }} onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }} onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}>Docs</a>
          <a href="company.html" style={{ color: '#9ca3af', textDecoration: 'none' }} onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }} onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}>Company</a>
          <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }} onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'; }} onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; }}>Contact</a>
        </div>
        <div>© 2025 DataraAI · NVIDIA Inception Member</div>
      </footer>
    </>
  );
}
