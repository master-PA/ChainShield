import React, { useEffect, useRef, useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import './landing.css';

interface LandingProps {
  navigate: (route: string) => void;
}

const Arrow: React.FC<{ size?: number }> = ({ size }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} aria-hidden>
    <path d="M5 12h13M12.5 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Tick: React.FC<{ color?: string; w?: number }> = ({ color = '#227A55', w = 2.6 }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShieldPath = 'M12 2.5l7.5 3v6c0 4.6-3.1 8.6-7.5 10-4.4-1.4-7.5-5.4-7.5-10v-6l7.5-3z';

const Brand: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); onClick(); }}>
    <span className="brand-mark">
      <svg viewBox="0 0 24 24" fill="none">
        <path d={ShieldPath} fill="#fff" />
        <path d="M8.6 12.2l2.3 2.3 4.5-4.7" stroke="#165A3D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
    <span className="brand-name">ChainShield <span>Sentinel</span></span>
  </a>
);

const steps = [
  { num: '01', title: 'Intercept & ingest', desc: 'The Chrome extension or web console captures the target URL, transaction calldata or raw message before any wallet connection.' },
  { num: '02', title: 'Private prefix check', desc: 'An 8-character SHA-256 host prefix queries the blocklist without revealing which site you are visiting.' },
  { num: '03', title: 'Multi-vector heuristics', desc: 'Domain age, redirect hops, homoglyph typosquatting and MinHash JS shingles are compared against known drainer kits.' },
  { num: '04', title: 'Burner-wallet sandbox', desc: 'An isolated container with a mock EIP-1193 provider connects an empty address and records every auto-prompt, safely.' },
  { num: '05', title: 'Claim-vs-reality check', desc: 'Button promises ("Claim free NFT") are compared against decoded calldata (setApprovalForAll) with a deterministic taxonomy.' },
  { num: '06', title: 'Sepolia proof anchor', desc: 'The scan is serialized to canonical JSON, hashed with SHA-256 and recorded on the Sepolia EvidenceRegistry.' },
];

export const Landing: React.FC<LandingProps> = ({ navigate }) => {
  const { loadExample } = useSecurity();
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const start = () => {
    loadExample();
    navigate('/scanner?target=https%3A%2F%2Fmintzone-nft.xyz');
  };

  const go = (route: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    navigate(route);
  };

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // scroll-reveal
  useEffect(() => {
    const els = root.current?.querySelectorAll('.r');
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp" ref={root}>
      {/* ===== NAV ===== */}
      <header className="nav">
        <div className="wrap nav-inner">
          <Brand onClick={() => navigate('/')} />
          <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Primary">
            <a href="#/scanner" className="active" onClick={go('/scanner')}>Scanner</a>
            <a href="#features" onClick={scrollTo('features')}>Security</a>
            <a href="#/reports" onClick={go('/reports')}>Reports</a>
            <a href="#report" onClick={scrollTo('report')}>Case study</a>
            <a href="#/dashboard" onClick={go('/dashboard')}>Dashboard</a>
          </nav>
          <div className="nav-right">
            <span className="shield-pill"><i />Shield ready</span>
            <a className="nav-signin" href="#/settings" onClick={go('/settings')}>Settings</a>
            <a className="btn btn-primary btn-sm" href="#/scanner" onClick={go('/scanner')}>Get started</a>
          </div>
          <button className="menu-btn" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="badge r" style={{ ['--d' as any]: '.04s' }}>
              <i>
                <svg viewBox="0 0 24 24" fill="none"><path d={ShieldPath} stroke="#227A55" strokeWidth="2.2" strokeLinejoin="round" /></svg>
              </i>
              Pre-transaction analysis ready
            </div>

            <h1 className="lp-h1 r" style={{ ['--d' as any]: '.12s' }}>
              ChainShield Sentinel —<br />
              <span className="mark">Explainable</span><br />
              <span className="soft">Pre-Transaction Security</span>
            </h1>

            <p className="lede r" style={{ ['--d' as any]: '.2s' }}>
              Know what you are about to authorize before you connect or sign. Deterministic rules and
              classical ML score every site, contract and transaction from 0 to 100 — with the evidence
              behind each point. No generative AI.
            </p>

            <div className="cta-row r" style={{ ['--d' as any]: '.28s' }}>
              <a className="btn btn-primary" href="#/scanner" onClick={go('/scanner')}>
                Go to Scanner <Arrow />
              </a>
              <button className="btn btn-secondary" onClick={start}>
                Walkthrough:  NFT drainer
              </button>
            </div>

            <ul className="facts r" style={{ ['--d' as any]: '.36s' }}>
              <li><span className="tick"><Tick /></span>Nothing is signed or connected</li>
              <li><span className="tick"><Tick color="#3E63DD" /></span>Private prefix lookups</li>
              <li><span className="tick"><Tick color="#B4791B" /></span>Evidence anchored on-chain</li>
            </ul>
          </div>

          <div className="panel-stack r" style={{ ['--d' as any]: '.24s' }}>
            <div className="panel">
              <div className="panel-head">
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h11M4 12h16M4 17h8" stroke="#227A55" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </span>
                <h2>How it works</h2>
                <span className="time">≈ seconds, not minutes</span>
              </div>

              <ol className="steps">
                {[
                  ['01', 'Paste a target', 'A URL, contract address or raw transaction — or let the extension intercept it.', 'No wallet connection'],
                  ['02', 'Sandbox & score', 'Heuristics, drainer-kit fingerprints and a burner-wallet sandbox build a 0–100 risk score.', 'Every point explained'],
                  ['03', 'Verify the evidence', 'The report is hashed and anchored so anyone can check it was never altered.', 'SHA-256 · Sepolia'],
                ].map(([n, t, d, g]) => (
                  <li className="step" key={n}>
                    <span className="n">{n}</span>
                    <div>
                      <h3>{t}</h3>
                      <p>{d}</p>
                      <span className="go">{g} <Arrow size={11} /></span>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="panel-foot">
                <span className="mini">
                  <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="#227A55" strokeWidth="2" /><path d="M12 7.5V12l3 2" stroke="#227A55" strokeWidth="2" strokeLinecap="round" /></svg>
                  Pre-sign, in real time
                </span>
                <span className="mini">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M6 3.5h8l4.5 4.5v12.5H6z" stroke="#6A7A71" strokeWidth="2" strokeLinejoin="round" /></svg>
                  Canonical JSON · SHA-256
                </span>
              </div>
            </div>

            <div className="float-card">
              <svg className="ring" viewBox="0 0 120 120">
                <circle className="tr" cx="60" cy="60" r="45" />
                <circle className="vl" cx="60" cy="60" r="45" style={{ stroke: '#C2415C', strokeDashoffset: 26 }} />
              </svg>
              <div className="txt">
                <strong>91 / 100</strong>
                <span style={{ color: '#C2415C' }}>mintzone-nft.xyz · Critical</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TECH STRIP ===== */}
      <div className="chains">
        <div className="wrap chains-inner">
          <span className="cap">Built on</span>
          <span className="chip"><i />EIP-1193 sandbox</span>
          <span className="chip"><i />SHA-256 prefix lookups</span>
          <span className="chip"><i />MinHash JS shingles</span>
          <span className="chip"><i />Sepolia EvidenceRegistry</span>
          <span className="chip"><i />Chrome MV3</span>
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <section className="lp-sec" id="features">
        <div className="wrap">
          <div className="sec-head-row">
            <div className="grow">
              <span className="sec-tag r">
                <svg viewBox="0 0 24 24" fill="none"><path d={ShieldPath} stroke="#165A3D" strokeWidth="2.2" strokeLinejoin="round" /></svg>
                Security analysis
              </span>
              <h2 className="sec-title r" style={{ ['--d' as any]: '.07s' }}>
                Everything that gets signed, <span className="dim">checked before it happens.</span>
              </h2>
            </div>
            <div className="aside r" style={{ ['--d' as any]: '.14s' }}>
              <p className="sec-lede">
                Every score is decomposed into evidence, intent mismatches and recovery steps anyone can act on immediately.
              </p>
            </div>
          </div>

          <div className="grid-3">
            <article className="fcard feature r" onClick={() => navigate('/scanner')}>
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none"><path d="M9 3.5h6M12 3.5v4M6 20.5l3-9h6l3 9M8 15h8" stroke="#227A55" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3>Reads calldata the way an auditor would</h3>
              <p>
                The page says “Claim free NFT”. The transaction says setApprovalForAll. Sentinel decodes what will
                actually happen and scores the gap between the two.
              </p>
              <div className="checks">
                {[
                  ['Claim vs reality mismatch', 96],
                  ['Drainer-kit similarity', 87],
                  ['Fresh domain & redirect hops', 64],
                ].map(([l, w]) => (
                  <div className="check" key={l as string}>
                    <span className="ok"><Tick color="#fff" w={3} /></span>
                    {l}
                    <span className="meter"><i style={{ ['--w' as any]: `${w}%` }} /></span>
                  </div>
                ))}
              </div>
            </article>

            {[
              {
                r: '/wallet-health', t: 'Wallet health & revoke', d: 'Audit existing allowances and build zero-allowance revoke transactions.', cta: 'Check a wallet',
                icon: <><path d="M12 3.5l7.5 3.2v5.6c0 4.3-3 8-7.5 9.2-4.5-1.2-7.5-4.9-7.5-9.2V6.7L12 3.5z" stroke="#227A55" strokeWidth="1.9" strokeLinejoin="round" /><path d="M9.2 12.2l2 2 3.6-3.9" stroke="#227A55" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></>
              },
              {
                r: '/alerts', t: 'Upgrade tripwire', d: 'Instant alerts when an approved proxy swaps to unverified bytecode.', cta: 'View alerts',
                icon: <><path d="M6 17.5V11a6 6 0 0112 0v6.5l1.5 1.5h-15L6 17.5z" stroke="#227A55" strokeWidth="1.9" strokeLinejoin="round" /><path d="M10 21h4" stroke="#227A55" strokeWidth="1.9" strokeLinecap="round" /></>
              },
              {
                r: '/verify', t: 'Evidence anchor', d: 'Compare a local SHA-256 against the on-chain record to prove a report was never edited.', cta: 'Verify a report',
                icon: <><circle cx="11" cy="11" r="6.5" stroke="#227A55" strokeWidth="1.9" /><path d="M16 16l4.5 4.5" stroke="#227A55" strokeWidth="1.9" strokeLinecap="round" /></>
              },
              {
                r: '/drainer-kits', t: 'Drainer kit library', d: 'Fingerprints of known kits, so lookalike front-ends are caught on sight.', cta: 'Browse kits',
                icon: <><rect x="3" y="4.5" width="18" height="14" rx="2.5" stroke="#227A55" strokeWidth="1.9" /><path d="M3 9h18M7 13h5" stroke="#227A55" strokeWidth="1.9" strokeLinecap="round" /></>
              },
              {
                r: '/extension', t: 'Chrome extension', d: 'A pre-sign modal intercepts eth_sendTransaction before your wallet prompt appears.', cta: 'See how it works',
                icon: <><path d="M6 3.5h8l4.5 4.5v12.5H6z" stroke="#227A55" strokeWidth="1.9" strokeLinejoin="round" /><path d="M9 12.5h6M9 16h4" stroke="#227A55" strokeWidth="1.9" strokeLinecap="round" /></>
              },
            ].map((c, i) => (
              <article className="fcard r" key={c.r} style={{ ['--d' as any]: `${(i + 1) * 0.06}s` }} onClick={() => navigate(c.r)}>
                <div className="ic"><svg viewBox="0 0 24 24" fill="none">{c.icon}</svg></div>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
                <a className="link" href={`#${c.r}`} onClick={go(c.r)}>{c.cta} <Arrow size={13} /></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SIX LAYERS ===== */}
      <section className="lp-sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <span className="sec-tag r">Six validation layers</span>
          <h2 className="sec-title r" style={{ ['--d' as any]: '.07s' }}>
            How Sentinel <span className="dim">protects every interaction.</span>
          </h2>
          <div className="steps6">
            {steps.map((s, i) => (
              <article className="fcard r" key={s.num} style={{ ['--d' as any]: `${(i % 3) * 0.06}s` }}>
                <span className="num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== REPORT / CASE STUDY ===== */}
      <section className="lp-sec report" id="report">
        <div className="wrap report-grid">
          <div>
            <span className="sec-tag r">
              <svg viewBox="0 0 24 24" fill="none"><path d="M6 3.5h8l4.5 4.5v12.5H6z" stroke="#165A3D" strokeWidth="2.2" strokeLinejoin="round" /><path d="M9 12.5h6M9 16h4" stroke="#165A3D" strokeWidth="2.2" strokeLinecap="round" /></svg>
              Worked case study
            </span>
            <h2 className="sec-title r" style={{ ['--d' as any]: '.07s' }}>Telegram NFT incident.</h2>
            <ul className="rlist">
              <li className="r"><span className="ix">01</span><div><h4>Source &amp; fingerprint</h4><p>Unsolicited Telegram DM (+10), domain registered 2 days ago (+20), JS bundle 87% similar to Inferno Drainer (+25).</p></div></li>
              <li className="r" style={{ ['--d' as any]: '.06s' }}><span className="ix">02</span><div><h4>Claim vs reality</h4><p>The button says “Claim Free NFT”; the sandbox caught an immediate setApprovalForAll(all NFTs, true) — intent mismatch 96/100.</p></div></li>
              <li className="r" style={{ ['--d' as any]: '.12s' }}><span className="ix">03</span><div><h4>Verdict &amp; proof</h4><p>Score 91, Critical, recommendation AVOID. Findings hashed and anchored on Sepolia as report #5410982.</p></div></li>
            </ul>
          </div>

          <div className="rpreview r" style={{ ['--d' as any]: '.14s' }}>
            <div className="rp-bar">
              <div className="dots"><i /><i /><i /></div>
              <span className="name">sentinel-report-mintzone.json</span>
              <span className="ok">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#227A55" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Anchored
              </span>
            </div>
            <div className="rp-body">
              <div className="rp-score">
                <div className="num">91<small>/100</small></div>
                <div className="meta">
                  <span className="v" style={{ background: 'rgba(194,65,92,.12)', color: '#C2415C' }}><i style={{ background: '#C2415C' }} />Critical · Avoid</span>
                  <p>Multi-stage drainer. Do not connect a wallet or sign anything.</p>
                </div>
              </div>
              <div className="rp-rows">
                <div className="rp-row"><span className="sev" style={{ background: 'rgba(194,65,92,.12)', color: '#C2415C' }}>Critical</span><span className="fn">setApprovalForAll(all NFTs, true)</span><span className="loc">Sandbox</span></div>
                <div className="rp-row"><span className="sev high">High</span><span className="fn">Drainer kit match: Inferno</span><span className="loc">87%</span></div>
                <div className="rp-row"><span className="sev med">Medium</span><span className="fn">Domain registered 2 days ago</span><span className="loc">+20 pts</span></div>
              </div>
            </div>
            <div className="rp-foot">
              <button className="btn btn-primary btn-sm" onClick={start}>Open in Scanner</button>
              <a className="btn btn-secondary btn-sm" href="#/verify" onClick={go('/verify')}>Verify evidence</a>
              <span className="stamp">Report #5410982 · Sepolia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <div className="stats">
        <div className="wrap stats-grid">
          <div className="stat r"><div className="v">7,830<em>+</em></div><div className="l">Scans analyzed</div></div>
          <div className="stat r" style={{ ['--d' as any]: '.07s' }}><div className="v">1,845</div><div className="l">Drainers blocked</div></div>
          <div className="stat r" style={{ ['--d' as any]: '.14s' }}><div className="v">6<em> layers</em></div><div className="l">Validation pipeline</div></div>
          <div className="stat r" style={{ ['--d' as any]: '.21s' }}><div className="v">0<em>%</em></div><div className="l">Generative AI</div></div>
        </div>
      </div>

      {/* ===== CTA ===== */}
      <section className="lp-sec" id="cta">
        <div className="wrap">
          <div className="cta-wrap r">
            <div>
              <h2>Scan first. <span className="out">Sign second.</span></h2>
              <p>Point Sentinel at a link, an address or raw calldata and get an explainable verdict before your wallet ever opens.</p>
              <div className="cta-actions">
                <a className="btn btn-white" href="#/scanner" onClick={go('/scanner')}>Start a scan <Arrow /></a>
                <a className="btn btn-ghost" href="#/dashboard" onClick={go('/dashboard')}>Open dashboard</a>
              </div>
            </div>
            <aside className="cta-side">
              <div className="t">What you’ll need</div>
              {['A site URL, contract address or raw calldata', 'Nothing else — no wallet connection', 'A few seconds'].map((t) => (
                <div className="line" key={t}><span className="ok"><Tick color="#fff" w={3.2} /></span>{t}</div>
              ))}
            </aside>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-footer" id="education">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <Brand onClick={() => navigate('/')} />
              <p>Explainable pre-transaction security for smart contracts, dApps and everyday wallet users.</p>
            </div>
            {[
              ['Product', [['Scanner', '/scanner'], ['Security reports', '/reports'], ['Scan history', '/history'], ['Wallet health', '/wallet-health']]],
              ['Resources', [['Verify evidence', '/verify'], ['Drainer kits', '/drainer-kits'], ['Developers', '/developers'], ['Extension', '/extension']]],
              ['Workspace', [['Dashboard', '/dashboard'], ['Alerts', '/alerts'], ['Community intel', '/community'], ['Settings', '/settings']]],
            ].map(([h, links]) => (
              <div className="foot-col" key={h as string}>
                <h4>{h as string}</h4>
                {(links as string[][]).map(([l, r]) => (
                  <a key={r} href={`#${r}`} onClick={go(r)}>{l}</a>
                ))}
              </div>
            ))}
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} ChainShield Sentinel</span>
            <span className="sep"><a href="#/settings" onClick={go('/settings')}>Privacy</a><a href="#/developers" onClick={go('/developers')}>Docs</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
};
