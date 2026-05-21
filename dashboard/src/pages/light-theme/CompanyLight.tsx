import React from 'react';

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  body {
    font-family: 'Inter', sans-serif;
    --teal: #0d9488;
    --blue: #1d4ed8;
    --purple: #7c3aed;
    --bg: #ffffff;
    --bg-alt: #f8fafc;
    --bg-card: #ffffff;
    --border: #e5e7eb;
    --muted: #6b7280;
    --text: #0f172a;
    background: var(--bg);
    color: var(--text);
  }

  /* NAV */
  .nav-d {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: stretch; height: 88px;
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
  .nav-d-tab:hover { color: var(--text); background: rgba(0,0,0,0.02); }
  .nav-d-tab .tab-label { font-size: 15px; font-weight: 700; }
  .nav-d-tab .tab-sub { font-size: 10px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; opacity: .6; }
  .nav-d-tab::after { content:''; position:absolute; bottom:0; left:20%; right:20%; height:2px; border-radius:2px 2px 0 0; background:transparent; transition:background .2s; }
  .nav-d-tab.active { color: var(--teal); background: rgba(13,148,136,0.04); }
  .nav-d-tab.active::after { background: var(--teal); }
  .nav-d-actions { display: flex; align-items: center; padding: 0 28px; gap: 10px; border-left: 1px solid var(--border); flex-shrink: 0; }
  .btn-d-ghost { padding: 7px 16px; background: transparent; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; font-family: inherit; transition: border-color .2s, color .2s; }
  .btn-d-ghost:hover { border-color: #9ca3af; color: var(--text); }
  .btn-d-solid { padding: 7px 18px; background: var(--teal); border: none; border-radius: 8px; font-size: 13px; font-weight: 700; color: #fff; cursor: pointer; font-family: inherit; transition: background .2s; }
  .btn-d-solid:hover { background: #0f766e; }

  /* PAGE HEADER */
  .page-header {
    padding: 64px 56px 48px; max-width: 1300px; margin: 0 auto;
    border-bottom: 1px solid var(--border);
  }
  .page-header-label { font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; }
  .page-header h1 { font-size: clamp(36px,4vw,52px); font-weight: 900; line-height: 1.08; letter-spacing: -1.5px; color: var(--text); margin-bottom: 14px; }
  .page-header h1 .teal-grad {
    background: linear-gradient(90deg, #0d9488, #0284c7);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .page-header p { font-size: 17px; color: var(--muted); line-height: 1.7; max-width: 580px; }

  /* MISSION STRIP */
  .mission-strip {
    background: var(--bg-alt); border-bottom: 1px solid var(--border);
    padding: 40px 56px;
  }
  .mission-inner { max-width: 1300px; margin: 0 auto; display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
  .mission-item { display: flex; flex-direction: column; gap: 6px; }
  .mission-item-icon {
    width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
    margin-bottom: 4px;
  }
  .mi-teal { background: rgba(13,148,136,0.08); border: 1px solid rgba(13,148,136,0.2); }
  .mi-blue { background: rgba(29,78,216,0.08); border: 1px solid rgba(29,78,216,0.2); }
  .mi-purple { background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2); }
  .mission-item-title { font-size: 15px; font-weight: 800; color: var(--text); }
  .mission-item-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }

  /* SECTION HEADER */
  .sec-d { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .sec-d .sq { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
  .sec-d-title { font-size: 20px; font-weight: 800; color: var(--text); }
  .sec-d-sub { font-size: 13px; color: var(--muted); margin-bottom: 32px; margin-top: 4px; }

  /* TEAM */
  .team-d { padding: 64px 56px; max-width: 1300px; margin: 0 auto; }
  .team-d-founders { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; margin-bottom: 28px; }
  .tdf-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
    padding: 24px; display: flex; gap: 18px; align-items: flex-start;
    transition: border-color .2s, box-shadow .2s;
  }
  .tdf-card:hover { border-color: #5eead4; box-shadow: 0 4px 16px rgba(13,148,136,0.08); }
  .tdf-avatar { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; flex-shrink: 0; }
  .tdf-av-teal { background: linear-gradient(135deg,rgba(13,148,136,0.15),rgba(13,148,136,0.05)); border: 1px solid rgba(13,148,136,0.3); color: var(--teal); }
  .tdf-av-blue { background: linear-gradient(135deg,rgba(29,78,216,0.15),rgba(29,78,216,0.05)); border: 1px solid rgba(29,78,216,0.3); color: var(--blue); }
  .tdf-name { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 2px; }
  .tdf-role { font-size: 11px; font-weight: 600; color: var(--teal); margin-bottom: 8px; letter-spacing: .04em; }
  .tdf-bio { font-size: 12px; color: var(--muted); line-height: 1.6; }
  .tdf-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
  .tdf-tag { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
  .tag-teal { color: var(--teal); background: rgba(13,148,136,0.08); border: 1px solid rgba(13,148,136,0.2); }
  .tag-blue { color: var(--blue); background: rgba(29,78,216,0.08); border: 1px solid rgba(29,78,216,0.2); }

  .team-d-advisors { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
  .tda-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
    padding: 18px; transition: border-color .2s, box-shadow .2s;
  }
  .tda-card:hover { border-color: #a5b4fc; box-shadow: 0 2px 8px rgba(29,78,216,0.06); }
  .tda-init {
    width: 36px; height: 36px; border-radius: 8px;
    background: rgba(13,148,136,0.06); border: 1px solid rgba(13,148,136,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: var(--teal); margin-bottom: 10px;
  }
  .tda-name { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
  .tda-role { font-size: 10px; color: var(--muted); line-height: 1.4; }

  /* BACKED BY / CREDENTIALS */
  .cred-strip {
    background: var(--bg-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
    padding: 40px 56px;
  }
  .cred-inner { max-width: 1300px; margin: 0 auto; }
  .cred-label { font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); margin-bottom: 20px; text-align: center; }
  .cred-row { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .cred-badge {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
    padding: 10px 18px; font-size: 13px; font-weight: 600; color: var(--text);
  }
  .cred-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* CTA */
  .cta-d2 {
    padding: 72px 56px; text-align: center;
    background: var(--bg-alt);
    border-top: 1px solid var(--border);
  }
  .cta-d2 h2 { font-size: clamp(22px,2.5vw,32px); font-weight: 800; letter-spacing: -.5px; margin-bottom: 12px; color: var(--text); }
  .cta-d2 p { font-size: 15px; color: var(--muted); margin-bottom: 28px; }
  .cta-d2-btns { display: flex; gap: 12px; justify-content: center; }
  .cta-d2 .btn-w { padding: 11px 26px; background: var(--teal); color: #fff; border-radius: 9px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; font-family: inherit; transition: background .2s; }
  .cta-d2 .btn-w:hover { background: #0f766e; }
  .cta-d2 .btn-t { padding: 11px 26px; background: transparent; color: var(--muted); border-radius: 9px; font-weight: 600; font-size: 14px; border: 1px solid var(--border); cursor: pointer; font-family: inherit; transition: border-color .2s, color .2s; }
  .cta-d2 .btn-t:hover { border-color: #9ca3af; color: var(--text); }

  /* FOOTER */
  .footer-d {
    background: var(--bg-alt); border-top: 1px solid var(--border);
    padding: 36px 56px; display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; color: var(--muted);
  }
  .footer-d .fd-logo { font-size: 16px; font-weight: 800; color: var(--teal); letter-spacing: .04em; }
  .footer-d .fd-links { display: flex; gap: 24px; }
  .footer-d .fd-links a { color: var(--muted); text-decoration: none; transition: color .2s; }
  .footer-d .fd-links a:hover { color: var(--text); }
`;

export default function CompanyLight() {
  return (
    <>
      <style>{styles}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      {/* NAV */}
      <nav className="nav-d">
        <a href="homepage_light.html" className="nav-d-logo">
          <div className="d-logo-name">DataraAI</div>
          <div className="d-logo-sub">← Back to Home</div>
        </a>
        <div className="nav-d-tabs">
          <a href="homepage_light.html#products" className="nav-d-tab">
            <span className="tab-label">Products</span>
            <span className="tab-sub">AI Data</span>
          </a>
          <a href="homepage_light.html#solutions" className="nav-d-tab">
            <span className="tab-label">Solutions</span>
            <span className="tab-sub">Use Cases</span>
          </a>
          <a href="homepage_light.html#customers" className="nav-d-tab">
            <span className="tab-label">Customers</span>
            <span className="tab-sub">Case Studies</span>
          </a>
          <a href="company_light.html" className="nav-d-tab active">
            <span className="tab-label">Company</span>
            <span className="tab-sub">Team · Mission</span>
          </a>
        </div>
        <div className="nav-d-actions">
          <button className="btn-d-ghost">Sign In</button>
          <button className="btn-d-solid">Get Access</button>
        </div>
      </nav>

      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-label">Company</div>
        <h1>Built by PhysicalAI<br /><span className="teal-grad">Veterans.</span></h1>
        <p>40+ years of combined expertise from NVIDIA, IIT, and deep robotics — building the data infrastructure Physical AI demands.</p>
      </div>

      {/* MISSION STRIP */}
      <div className="mission-strip">
        <div className="mission-inner">
          <div className="mission-item">
            <div className="mission-item-icon mi-teal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <div className="mission-item-title">Real-World First</div>
            <div className="mission-item-desc">Authentic multi-modal datasets captured in operating environments — not simulated proxies.</div>
          </div>
          <div className="mission-item">
            <div className="mission-item-icon mi-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="mission-item-title">Data Infrastructure</div>
            <div className="mission-item-desc">End-to-end pipelines from capture to policy-ready training data across four industry verticals.</div>
          </div>
          <div className="mission-item">
            <div className="mission-item-icon mi-purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="mission-item-title">Partnership-Driven</div>
            <div className="mission-item-desc">Co-developed with industry leaders — Figure AI, BMW, Foxconn — to ensure real production fidelity.</div>
          </div>
        </div>
      </div>

      {/* TEAM */}
      <section className="team-d">
        <div className="sec-d">
          <div className="sq" style={{ background: '#7c3aed' }}></div>
          <div className="sec-d-title">Founders</div>
        </div>
        <p className="sec-d-sub">Serial entrepreneurs with deep roots in NVIDIA, AI, and robotics infrastructure.</p>
        <div className="team-d-founders">
          <div className="tdf-card">
            <div className="tdf-avatar tdf-av-blue">DS</div>
            <div>
              <div className="tdf-name">Durgesh Srivastava</div>
              <div className="tdf-role">Co-Founder &amp; CEO</div>
              <p className="tdf-bio">Serial entrepreneur (exited MIPS). Ex-NVIDIA Sr. Director AI &amp; Robotics. Omniverse, Systems, LLM expert. IIT Kanpur.</p>
              <div className="tdf-tags">
                <span className="tdf-tag tag-blue">NVIDIA</span>
                <span className="tdf-tag tag-blue">IIT Kanpur</span>
                <span className="tdf-tag tag-teal">LLM</span>
                <span className="tdf-tag tag-teal">Omniverse</span>
              </div>
            </div>
          </div>
          <div className="tdf-card">
            <div className="tdf-avatar tdf-av-teal">NR</div>
            <div>
              <div className="tdf-name">Niraj Rai</div>
              <div className="tdf-role">Co-Founder &amp; CTO</div>
              <p className="tdf-bio">Serial entrepreneur. Founder SproutsAi. Ex-CTO Vimaan (AI/Robotics). Software &amp; AI expert. IIT Kharagpur.</p>
              <div className="tdf-tags">
                <span className="tdf-tag tag-teal">SproutsAi</span>
                <span className="tdf-tag tag-teal">Vimaan</span>
                <span className="tdf-tag tag-blue">IIT Kharagpur</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sec-d" style={{ marginTop: '8px' }}>
          <div className="sq" style={{ background: '#1d4ed8' }}></div>
          <div className="sec-d-title">Advisors</div>
        </div>
        <p className="sec-d-sub">Senior leaders from NVIDIA, Intel, and leading robotics institutions.</p>
        <div className="team-d-advisors">
          <div className="tda-card">
            <div className="tda-init">BK</div>
            <div className="tda-name">Brian Kelleher</div>
            <div className="tda-role">Sr. VP NVIDIA · Angel Investor</div>
          </div>
          <div className="tda-card">
            <div className="tda-init">TG</div>
            <div className="tda-name">Dr. Teck Joo Goh</div>
            <div className="tda-role">Angel Investor · Corporate VP SkyeChip · ex-GM Intel</div>
          </div>
          <div className="tda-card">
            <div className="tda-init">AR</div>
            <div className="tda-name">Dr. Amit Roy-Chowdhury</div>
            <div className="tda-role">Professor &amp; UC Presidential Chair · Chair Robotics, UC Riverside</div>
          </div>
          <div className="tda-card">
            <div className="tda-init">LA</div>
            <div className="tda-name">Lomesh Agarwal</div>
            <div className="tda-role">VP Software Apptronik · Ex-MagicLeap</div>
          </div>
        </div>
      </section>

      {/* CREDENTIALS */}
      <div className="cred-strip">
        <div className="cred-inner">
          <div className="cred-label">Recognized &amp; Backed By</div>
          <div className="cred-row">
            <div className="cred-badge">
              <div className="cred-dot" style={{ background: '#76b900' }}></div>
              NVIDIA Inception Member
            </div>
            <div className="cred-badge">
              <div className="cred-dot" style={{ background: '#1d4ed8' }}></div>
              Figure AI Partner
            </div>
            <div className="cred-badge">
              <div className="cred-dot" style={{ background: '#0d9488' }}></div>
              BMW Robotics Partner
            </div>
            <div className="cred-badge">
              <div className="cred-dot" style={{ background: '#ea580c' }}></div>
              Foxconn Smart Factory
            </div>
            <div className="cred-badge">
              <div className="cred-dot" style={{ background: '#7c3aed' }}></div>
              Peer Robotics Customer
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="cta-d2">
        <h2>Ready to close the Sim-to-Real gap?</h2>
        <p>Join leading robotics companies using DataraAI's real-world data to achieve 95%+ precision.</p>
        <div className="cta-d2-btns">
          <button className="btn-w">Request a Demo</button>
          <button className="btn-t">Explore RoboDataHub</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-d">
        <div className="fd-logo">DataraAI</div>
        <div className="fd-links">
          <a href="homepage_light.html">Home</a>
          <a href="homepage_light.html#products">Products</a>
          <a href="homepage_light.html#customers">Customers</a>
          <a href="company_light.html">Company</a>
          <a href="#">Contact</a>
        </div>
        <div>© 2026 DataraAI · NVIDIA Inception Member</div>
      </footer>
    </>
  );
}
