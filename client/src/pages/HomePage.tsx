import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  FileText,
  Search,
  Key,
  Database,
  Scale,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Activity,
  Award,
  Layers,
  LayoutDashboard,
  LogOut,
  Shield,
  FileCheck
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { DEMO_USERS, DEMO_PASSWORD } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleBadge } from '@/components/shared/RoleBadge'

export function HomePage() {
  const navigate = useNavigate()
  const { user, token, logout } = useAuthStore()

  const handleRoleSelect = (username: string) => {
    navigate('/login', { state: { prefillUsername: username } })
  }

  const features = [
    {
      title: 'Centralized & Encrypted Storage',
      icon: Lock,
      description:
        'Digitizes and centralizes FIRs, charge sheets, witness statements, and forensic reports with AES-256-GCM envelope encryption and per-user RSA key wrapping.',
    },
    {
      title: 'Tamper-Evident Audit Trail',
      icon: Activity,
      description:
        'Every action (upload, retrieve, handover, seal) is logged in an immutable SHA-256 hash chain and digitally signed with officer X.509 PKI certificates.',
    },
    {
      title: 'Threshold Sealed Custody',
      icon: Key,
      description:
        "High-security evidence is split using Shamir's Secret Sharing over GF(2⁸). No single official can unseal files without a consensus of designated custodians.",
    },
    {
      title: 'Blockchain Ledger Anchors',
      icon: Layers,
      description:
        'Batches of document hashes and audit entries are Merkle-tree rooted and anchored into a cryptographic block ledger, proving evidence integrity over time.',
    },
    {
      title: 'Fine-Grained Role & Case Scoping',
      icon: Users,
      description:
        'Multi-agency governance ensures Investigating Officers, Forensics, Prosecutors, and Judges only access cases and actions permitted by their constitutional mandates.',
    },
    {
      title: 'Court Evidence Certification',
      icon: Scale,
      description:
        'Automated generation of cryptographic Hash Certificates conforming to Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023 for direct court admissibility.',
    },
  ]

  const lifecycleSteps = [
    {
      step: '1',
      title: 'Digital Ingestion & FIR Registration',
      actor: 'Police Station / Investigating Officer',
      description:
        'Digital documents or scanned physical case files are uploaded, hashed (SHA-256), encrypted at rest, and assigned to authorized case investigators.',
    },
    {
      step: '2',
      title: 'Custodial Sealing & Multi-Party Protection',
      actor: 'Magistrate & Designated Custodians',
      description:
        'Confidential witness identities or sensitive physical asset records are sealed under k-of-n threshold cryptography to prevent unilateral access.',
    },
    {
      step: '3',
      title: 'Departmental Handover & Forensics',
      actor: 'Forensic Science Laboratory (FSL)',
      description:
        'Evidence movements between police malkhanas, forensic analysts, and prosecutors are recorded in the chronological, digitally signed audit chain.',
    },
    {
      step: '4',
      title: 'Judicial Verification & Trial Presentation',
      actor: 'Prosecutor, Judge & Court Clerk',
      description:
        'During hearings, the system recomputes cryptographic hashes against blockchain anchors, outputting certified Section 63(4) BSA compliance reports.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight">Sentinel Vault</span>
              <p className="text-[11px] text-muted-foreground leading-none">
                Secure Evidence Management System
              </p>
            </div>
          </Link>

          {/* Navigation and Login Button */}
          <div className="flex items-center gap-3">
            {token && user ? (
              <div className="flex items-center gap-3">
                <Button asChild size="sm">
                  <Link to="/dashboard" id="nav-dashboard-btn">
                    <LayoutDashboard className="h-4 w-4 mr-1.5" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" id="nav-login-btn">
                <Link to="/login">
                  Sign in
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border bg-gradient-to-b from-white to-slate-50 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>SIH Problem Statement 26190</span>
              <span className="text-border">•</span>
              <span>Law Enforcement & Legal Records</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Secure Digital Document & Evidence Management System
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A centralized, tamper-evident platform built for police departments, forensic labs,
              prosecutors, and courts. Ensures confidentiality, chain of custody, and verifiable legal
              admissibility for all case documents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto shadow-sm" id="hero-login-btn">
                <Link to="/login">
                  Sign in to Vault
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <a href="#features">View System Capabilities</a>
              </Button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                AES-256 Envelope Encryption
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Tamper-Evident Hash Chains
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Shamir Sealed Custody
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Sec 63(4) BSA 2023 Admissible
              </span>
            </div>
          </div>
        </section>

        {/* What this project solves */}
        <section className="py-12 border-b border-border bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">The Problem & The Solution</h2>
              <p className="text-sm text-muted-foreground">
                Transitioning from fragmented, paper-based case files to a secure cryptographic digital vault.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Challenges */}
              <Card className="border-red-200/80 bg-red-50/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    <CardTitle className="text-base font-semibold">Traditional Challenges</CardTitle>
                  </div>
                  <CardDescription>
                    Risks faced with paper files and unencrypted digital storage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Tampering Risks:</strong> Critical case papers or PDFs can be altered with no audit trail.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Unauthorized Access:</strong> Lack of strict case-level isolation leads to confidential leaks.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Broken Custody:</strong> No verifiable handover records between police stations, FSL labs, and courts.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Delays & Disputes:</strong> Evidence admissibility disputes stall trials and hearings for months.</span>
                  </div>
                </CardContent>
              </Card>

              {/* SentinelVault Solution */}
              <Card className="border-emerald-200/80 bg-emerald-50/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <CardTitle className="text-base font-semibold">SentinelVault System</CardTitle>
                  </div>
                  <CardDescription>
                    Comprehensive security built for the justice lifecycle
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span><strong>Cryptographic Integrity:</strong> SHA-256 hash chains detect even a 1-bit file alteration immediately.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span><strong>Dual-Layer Access:</strong> RBAC policy checks paired with per-user RSA key wrapping.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span><strong>Multi-Party Custody:</strong> Shamir secret sharing prevents single-person access to sealed records.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span><strong>Court Ready:</strong> Automated digital certificates under Section 63(4) Bharatiya Sakshya Adhiniyam.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section id="features" className="py-14 border-b border-border bg-slate-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Core System Features</h2>
              <p className="text-sm text-muted-foreground">
                Engineered with practical security primitives to protect evidence integrity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((item, i) => {
                const Icon = item.icon
                return (
                  <Card key={i} className="bg-card shadow-sm hover:shadow transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Evidence Lifecycle Workflow */}
        <section className="py-14 border-b border-border bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Evidence & Asset Lifecycle</h2>
              <p className="text-sm text-muted-foreground">
                How documents and police assets travel securely through the justice chain.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {lifecycleSteps.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card p-4 space-y-2 relative shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {s.step}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">Stage {s.step}</span>
                  </div>
                  <h3 className="font-semibold text-sm pt-1">{s.title}</h3>
                  <p className="text-[11px] font-medium text-primary">{s.actor}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo Roles & Quick Access */}
        <section className="py-14 bg-slate-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Demo Accounts & Stakeholders</h2>
              <p className="text-sm text-muted-foreground">
                Select any pre-configured role below to test the platform. Password for all accounts is{' '}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-xs font-semibold text-foreground">
                  {DEMO_PASSWORD}
                </code>
                .
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEMO_USERS.map((u) => (
                <Card
                  key={u.username}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => handleRoleSelect(u.username)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold">{u.username}</span>
                      <RoleBadge role={u.role} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>Click to log in</span>
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bottom Callout */}
            <div className="mt-10 text-center">
              <Button asChild size="lg" className="shadow-sm" id="cta-login-btn">
                <Link to="/login">
                  Go to Login Page
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Sentinel Vault</span>
            <span>— Smart India Hackathon Prototype</span>
          </div>
          <p>Section 63(4) Bharatiya Sakshya Adhiniyam, 2023 Compliant</p>
        </div>
      </footer>
    </div>
  )
}
