'use client'

import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowUpRight, BookOpen, CheckCircle2, ChevronDown, CircleHelp, Clock3, Code2, Download, FileCode2, FileText, Filter, Gauge, History, LayoutDashboard, Menu, Play, ScanLine, ShieldCheck, UploadCloud, X } from 'lucide-react'

type View = 'overview' | 'upload' | 'report' | 'history' | 'docs'
type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

// Shape returned by the backend's POST /api/upload -> CLI's AuditReport.
type Finding = { title: string; severity: Severity; description: string; file?: string; line?: number; source: string }
type GasProfile = { function_costs: Record<string, number>; total_operations: number; estimated_max: number }
type AuditReport = { findings: Finding[]; gas_profile: GasProfile | null; score: number; ready_for_audit: boolean; timestamp: string }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// Placeholder data for the Overview/History views, which depict a signed-in
// workspace with saved report history -- that needs the backend's Postgres
// persistence layer, which isn't wired up yet. The Upload -> Report flow
// below uses real data from the backend/CLI instead of this.
type MockFinding = { id: string; severity: 'Critical' | 'High' | 'Medium' | 'Low'; title: string; file: string; line: number; summary: string; detail: string }

const mockFindings: MockFinding[] = [
  { id: 'SC-101', severity: 'Critical', title: 'Unchecked arithmetic in token transfer', file: 'src/token.rs', line: 184, summary: 'Integer overflow can inflate balances during transfer.', detail: 'Use checked_add and checked_sub around the balance mutation, then return a contract error when the operation fails.' },
  { id: 'SC-204', severity: 'High', title: 'Authorization bypass in admin path', file: 'src/admin.rs', line: 72, summary: 'Caller identity is not verified before privileged state changes.', detail: 'Require the admin address from persistent storage and compare it against the invoker before executing this branch.' },
  { id: 'SC-308', severity: 'Medium', title: 'Missing event emission', file: 'src/staking.rs', line: 219, summary: 'State change is not observable by indexers.', detail: 'Emit a structured event for stake updates to make the state transition auditable and integrations reliable.' },
  { id: 'SC-412', severity: 'Low', title: 'Redundant storage read', file: 'src/rewards.rs', line: 91, summary: 'Repeated read increases the instruction footprint.', detail: 'Cache the value locally and reuse it through the function to reduce budget consumption.' },
]

const nav = [
  { id: 'overview' as View, label: 'Overview', icon: LayoutDashboard },
  { id: 'upload' as View, label: 'New audit', icon: UploadCloud },
  { id: 'report' as View, label: 'Latest report', icon: FileText },
  { id: 'history' as View, label: 'History', icon: History },
  { id: 'docs' as View, label: 'Guides', icon: BookOpen },
]

function SeverityBadge({ severity }: { severity: string }) {
  const key = severity.toLowerCase()
  return <span className={`severity severity-${key}`}><span />{key.charAt(0).toUpperCase() + key.slice(1)}</span>
}

export default function Page() {
  const [view, setView] = useState<View>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [filter, setFilter] = useState<Severity | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const visibleFindings = useMemo(() => {
    const all = report?.findings ?? []
    return filter === 'all' ? all : all.filter((finding) => finding.severity === filter)
  }, [report, filter])

  function chooseFile(nextFile?: File) {
    if (!nextFile) return
    if (!/\.(rs|wasm)$/i.test(nextFile.name)) return
    setFile(nextFile); setProgress(0); setAnalyzing(false); setUploadError(null)
  }

  async function startAnalysis() {
    if (!file) return
    setAnalyzing(true); setProgress(10); setUploadError(null)

    // fetch() doesn't expose upload progress, so this just ticks toward 90%
    // while the request is in flight and jumps to 100% on response.
    const ticker = window.setInterval(() => setProgress((current) => Math.min(current + 7, 90)), 380)

    try {
      const body = new FormData()
      body.append('contract', file)
      const response = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? `Analysis failed (HTTP ${response.status})`)
      }

      setReport(payload.report as AuditReport)
      setProgress(100)
      setView('report')
    } catch (err) {
      // A network-level failure (backend unreachable, CORS, DNS) surfaces
      // as a generic TypeError from fetch itself -- give a useful message
      // instead of the browser's raw "Failed to fetch".
      const message = err instanceof TypeError
        ? `Can't reach the backend at ${API_BASE_URL}. Is it running?`
        : err instanceof Error ? err.message : 'Analysis failed.'
      setUploadError(message)
    } finally {
      window.clearInterval(ticker)
      setAnalyzing(false)
    }
  }

  function exportReport() {
    if (!report) return
    const lines = [
      'SOROBAN AUDIT PREP REPORT', '',
      `Score: ${report.score} / 100`,
      `Ready for audit: ${report.ready_for_audit ? 'yes' : 'no'}`,
      `Generated: ${report.timestamp}`, '',
      ...report.findings.map((f) => `${f.severity.toUpperCase()}: ${f.title} (${f.file ?? 'unknown'}:${f.line ?? '?'})`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'audit-report.txt'; anchor.click(); URL.revokeObjectURL(url)
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><ScanLine size={19} /></div><span>scout<span className="brand-dot">.</span>audit</span></div><div className="topbar-right"><span className="network-dot"><span />Testnet</span><button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button><div className="avatar">MV</div></div><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu size={20} /></button></header>
    <div className="workspace">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><div className="project-switcher"><div className="project-icon">M</div><div><span className="eyebrow">PROJECT</span><strong>Meridian Vault</strong></div><ChevronDown size={15} /></div><nav aria-label="Main navigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => { setView(id); setMobileNav(false) }}><Icon size={17} /><span>{label}</span>{id === 'report' && report && <span className="nav-count">{report.findings.length}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="readiness-mini"><div className="mini-label"><span>READINESS</span><strong>82%</strong></div><div className="progress-track"><span style={{ width: '82%' }} /></div><small>Good to review</small></div><div className="user-card"><div className="avatar">MV</div><div><strong>Meridian team</strong><small>Free workspace</small></div><ChevronDown size={14} /></div></div></aside>
      <main className="main-content">{view === 'overview' && <Overview onView={setView} />}{view === 'upload' && <Upload file={file} setFile={chooseFile} inputRef={inputRef} analyzing={analyzing} progress={progress} error={uploadError} onStart={startAnalysis} />}{view === 'report' && <Report report={report} filter={filter} setFilter={setFilter} visibleFindings={visibleFindings} expanded={expanded} setExpanded={setExpanded} onExport={exportReport} onView={setView} />}{view === 'history' && <HistoryView onView={setView} />}{view === 'docs' && <Docs />}</main>
    </div>
  </div>
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div> }

function Overview({ onView }: { onView: (view: View) => void }) { return <><PageHeader eyebrow="AUDIT WORKSPACE / MERIDIAN VAULT" title="Good morning, team." description="Your contract is making progress. Here’s what needs your attention before submission." action={<button className="button button-primary" onClick={() => onView('upload')}><UploadCloud size={16} />Start new audit</button>} /><section className="overview-grid"><div className="score-card"><div className="card-top"><div><span className="eyebrow">LATEST READINESS SCORE</span><div className="score"><strong>82</strong><span>/100</span></div></div><div className="score-ring"><div><strong>82%</strong><small>READY</small></div></div></div><div className="score-footer"><CheckCircle2 size={16} /><span>Up 12 points since last scan</span><span className="muted">·</span><span>Scanned 18 min ago</span></div></div><div className="metric-card"><span className="eyebrow">OPEN FINDINGS</span><div className="metric-number">4</div><div className="metric-breakdown"><span className="critical-dot" />1 critical <span className="high-dot" />1 high <span className="medium-dot" />1 medium</div><button className="text-button" onClick={() => onView('report')}>Review findings <ArrowUpRight size={14} /></button></div><div className="metric-card"><span className="eyebrow">CONTRACT SIZE</span><div className="metric-number">18.4<span className="unit">KB</span></div><div className="metric-breakdown">WASM binary · 14 functions</div><button className="text-button" onClick={() => onView('docs')}>View gas profile <ArrowUpRight size={14} /></button></div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">ACTION REQUIRED</span><h2>Latest findings</h2></div><button className="button button-quiet" onClick={() => onView('report')}>View full report <ArrowUpRight size={15} /></button></div><div className="findings-preview">{mockFindings.slice(0, 3).map((finding) => <div className="finding-row" key={finding.id}><SeverityBadge severity={finding.severity} /><div className="finding-main"><strong>{finding.title}</strong><span>{finding.file}:{finding.line}</span></div><ArrowUpRight size={16} className="row-arrow" /></div>)}</div></section><section className="lower-grid"><div className="activity-card"><div className="section-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Audit timeline</h2></div><Clock3 size={17} /></div><div className="timeline"><div><span className="timeline-dot done" /><p><strong>Analysis completed</strong><small>Today, 10:42 AM · v0.8.2</small></p></div><div><span className="timeline-dot" /><p><strong>Contract uploaded</strong><small>Today, 10:41 AM · meridian_vault.wasm</small></p></div><div><span className="timeline-dot" /><p><strong>Project created</strong><small>Yesterday, 4:18 PM</small></p></div></div></div><div className="tip-card"><div className="tip-icon"><Gauge size={20} /></div><div><span className="eyebrow">SCOUT TIP</span><h3>Start with authorization.</h3><p>Most critical Soroban findings come from missing caller checks. Verify every privileged entry point.</p><button className="text-button" onClick={() => onView('docs')}>Read the guide <ArrowUpRight size={14} /></button></div></div></section></> }

function Upload({ file, setFile, inputRef, analyzing, progress, error, onStart }: { file: File | null; setFile: (file?: File) => void; inputRef: React.RefObject<HTMLInputElement | null>; analyzing: boolean; progress: number; error: string | null; onStart: () => void }) { return <><PageHeader eyebrow="NEW AUDIT" title="Upload your contract." description="Scout checks your Rust source and compiled WASM for common security vulnerabilities." /><div className="upload-layout"><div className="upload-column"><input ref={inputRef} type="file" hidden accept=".rs,.wasm" onChange={(e) => setFile(e.target.files?.[0])} /><div className={`dropzone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0]) }}><div className="upload-icon">{file ? <FileCode2 size={28} /> : <UploadCloud size={28} />}</div>{file ? <><h2>{file.name}</h2><p>{(file.size / 1024).toFixed(1)} KB · Ready to analyze</p><button className="remove-file" onClick={(e) => { e.stopPropagation(); setFile(undefined) }}><X size={14} />Remove file</button></> : <><h2>Drop your files here</h2><p>or click to browse from your computer</p><span className="file-types">.rs Rust source &nbsp;·&nbsp; .wasm compiled contract</span></>}</div>{analyzing && <div className="analysis-progress"><div className="progress-label"><span>Analyzing contract...</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><small>Running Scout security rules and gas analysis</small></div>}{error && <div className="upload-error"><AlertTriangle size={15} />{error}</div>}<div className="upload-actions"><button className="button button-primary" disabled={!file || analyzing} onClick={onStart}><Play size={15} />{analyzing ? 'Analyzing...' : 'Run security analysis'}</button></div></div><aside className="upload-info"><div className="info-block"><ShieldCheck size={19} /><div><h3>What gets checked?</h3><p>Access control, arithmetic safety, storage patterns, reentrancy, event coverage, and Soroban-specific best practices.</p></div></div><div className="info-block"><Code2 size={19} /><div><h3>Your code stays yours</h3><p>Files are analyzed securely and never shared. Delete a report anytime from your history.</p></div></div></aside></div></> }

function Report({ report, filter, setFilter, visibleFindings, expanded, setExpanded, onExport, onView }: { report: AuditReport | null; filter: Severity | 'all'; setFilter: (v: Severity | 'all') => void; visibleFindings: Finding[]; expanded: string | null; setExpanded: (v: string | null) => void; onExport: () => void; onView: (view: View) => void }) {
  if (!report) return <><PageHeader eyebrow="AUDIT REPORT" title="No report yet" description="Run an analysis to see security findings and a gas profile here." /><div className="report-empty"><FileText size={28} /><p>Upload a contract to generate your first report.</p><button className="button button-primary" onClick={() => onView('upload')}><UploadCloud size={16} />Start new audit</button></div></>

  const counts = report.findings.reduce<Record<Severity, number>>((acc, f) => { acc[f.severity] = (acc[f.severity] ?? 0) + 1; return acc }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 })
  const gas = report.gas_profile
  const gasEntries = gas ? Object.entries(gas.function_costs).sort(([, a], [, b]) => b - a) : []

  return <><PageHeader eyebrow="AUDIT REPORT" title="Analysis result" description={`Generated ${new Date(report.timestamp).toLocaleString()}`} action={<button className="button button-secondary" onClick={onExport}><Download size={15} />Export report</button>} /><div className={`report-status ${report.ready_for_audit ? '' : 'report-status-warn'}`}>{report.ready_for_audit ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}<div><strong>{report.ready_for_audit ? 'Ready for audit' : 'Not ready for audit yet'}</strong><span>Review the findings below before sharing with your auditor.</span></div><span className="status-score">{report.score} / 100</span></div><section className="report-summary"><div className="summary-score"><span className="eyebrow">READINESS</span><strong>{report.score}</strong><span>{report.ready_for_audit ? 'Good to review' : 'Needs work'}</span></div><div className="summary-count critical"><strong>{counts.critical}</strong><span>Critical</span></div><div className="summary-count high"><strong>{counts.high}</strong><span>High</span></div><div className="summary-count medium"><strong>{counts.medium}</strong><span>Medium</span></div><div className="summary-count low"><strong>{counts.low}</strong><span>Low</span></div><div className="summary-count info"><strong>{counts.info}</strong><span>Info</span></div></section><section className="section-block report-findings"><div className="section-heading"><div><span className="eyebrow">SECURITY FINDINGS</span><h2>{visibleFindings.length} items need review</h2></div><div className="filter-wrap"><Filter size={14} /><select value={filter} onChange={(e) => setFilter(e.target.value as Severity | 'all')} aria-label="Filter findings"><option value="all">All</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="info">Info</option></select></div></div>{visibleFindings.length === 0 ? <p className="no-findings">No findings at this severity. Nice work.</p> : <div className="findings-table">{visibleFindings.map((finding, i) => { const id = `${finding.source}-${finding.line ?? '?'}-${i}`; return <div className={`report-finding ${expanded === id ? 'expanded' : ''}`} key={id}><button className="report-finding-button" onClick={() => setExpanded(expanded === id ? null : id)}><SeverityBadge severity={finding.severity} /><div className="finding-main"><strong>{finding.title}</strong><span><FileCode2 size={13} />{finding.file ?? 'unknown'}:{finding.line ?? '?'} · {finding.source}</span></div><ChevronDown size={17} /></button>{expanded === id && <div className="finding-detail"><p>{finding.description}</p></div>}</div> })}</div>}</section><div className="gas-card"><div><span className="eyebrow">GAS PROFILE</span><h2>Contract budget usage</h2><p>{gas ? 'Heuristic, relative instruction cost per exported function — not exact Soroban gas.' : 'Not available for Rust source: upload a compiled .wasm contract to see this.'}</p></div>{gas && <div className="gas-bars">{gasEntries.slice(0, 6).map(([name, cost]) => <div key={name}><span>{name}</span><i><b className={cost === gas.estimated_max ? 'bar-warn' : ''} style={{ width: `${gas.estimated_max ? (cost / gas.estimated_max) * 100 : 0}%` }} /></i><strong>{cost}</strong></div>)}</div>}</div></> }

function HistoryView({ onView }: { onView: (view: View) => void }) { return <><PageHeader eyebrow="AUDIT WORKSPACE" title="Report history" description="Compare past analyses and keep a clear record of your contract’s progress." action={<button className="button button-primary" onClick={() => onView('upload')}><UploadCloud size={16} />New audit</button>} /><div className="history-list">{[['Meridian Vault', 'v0.8.2', 'Today, 10:42 AM', '82', '4 findings'], ['Meridian Vault', 'v0.8.1', 'Yesterday, 2:16 PM', '70', '7 findings'], ['Meridian Vault', 'v0.7.4', 'Mar 18, 2025', '64', '9 findings']].map((item, index) => <button className="history-row" key={item[1]} onClick={() => onView('report')}><div className="history-icon"><FileText size={18} /></div><div><strong>{item[0]} <span>{item[1]}</span></strong><small>{item[2]}</small></div><div className="history-result"><strong>{item[3]}<small>/100</small></strong><span>{item[4]}</span></div><ArrowUpRight size={16} /></button>)}</div></> }
function Docs() { return <><PageHeader eyebrow="SCOUT GUIDES" title="Build with confidence." description="Practical references for securing and shipping Soroban contracts." /><div className="docs-grid">{[['Authorization patterns', 'Verify invokers and protect privileged contract entry points.', ShieldCheck], ['Storage & arithmetic', 'Avoid overflow and design predictable persistent storage.', Code2], ['Events & observability', 'Make every meaningful state transition indexer-friendly.', ScanLine]].map(([title, text, Icon]) => <article className="doc-card" key={title as string}><Icon size={21} /><h2>{title as string}</h2><p>{text as string}</p><button className="text-button">Read guide <ArrowUpRight size={14} /></button></article>)}</div><div className="docs-callout"><BookOpen size={21} /><div><h2>New to Soroban?</h2><p>Learn the fundamentals of Stellar smart contracts, from environment setup to production deployment.</p></div><button className="button button-secondary">Open Soroban docs <ArrowUpRight size={15} /></button></div></> }
