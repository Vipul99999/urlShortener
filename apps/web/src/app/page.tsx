import Link from 'next/link'
import { CtaStrip } from '@/components/marketing/cta-strip'

export default function Page() {
  const features = [
    {
      title: 'Branded short links',
      description:
        'Create clean, memorable links for campaigns, product launches, and team-wide sharing.'
    },
    {
      title: 'Fast analytics',
      description:
        'Track clicks, trends, and performance from a dashboard built for action, not clutter.'
    },
    {
      title: 'Workspace-ready',
      description:
        'Organize links by workspace, campaign, and tags so teams can move quickly without losing control.'
    },
    {
      title: 'QR and exports',
      description:
        'Generate QR codes instantly and export data when you need to report or share results.'
    }
  ]

  const stats = [
    { label: 'Link creation time', value: '< 10 sec' },
    { label: 'Dashboard sections', value: '6 core views' },
    { label: 'MVP business features', value: 'Tags + QR + CSV' }
  ]

  const steps = [
    'Create a workspace and your first campaign link.',
    'Share a short URL or QR code anywhere.',
    'Track clicks, update destinations, and export results.'
  ]

  const testimonials = [
    {
      quote:
        'It gave us a much cleaner way to manage campaign links without enterprise-level complexity.',
      name: 'Aarav',
      role: 'Marketing Consultant'
    },
    {
      quote:
        'The dashboard is simple, fast, and exactly what a small business team needs to ship quickly.',
      name: 'Nisha',
      role: 'Growth Lead'
    },
    {
      quote:
        'QR codes, exports, and tags in one place made it feel useful from day one.',
      name: 'Rohit',
      role: 'Operations Manager'
    }
  ]

  const faqs = [
    {
      q: 'Is this good for small businesses?',
      a: 'Yes. The MVP is designed around simple campaign tracking, clean short links, QR codes, and team-friendly organization.'
    },
    {
      q: 'Can I use custom slugs?',
      a: 'Yes. You can create memorable slugs for campaigns, landing pages, and branded sharing.'
    },
    {
      q: 'Does it support analytics?',
      a: 'Yes. You can track clicks, see top-performing links, and review workspace-level performance.'
    },
    {
      q: 'Can my team collaborate?',
      a: 'Yes. Workspaces, members, invitations, and role-based access are part of the MVP flow.'
    }
  ]

  const logos = ['LaunchCo', 'BrightOps', 'Northlane', 'StudioFlow', 'MetricForge']

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-[360px] w-[360px] rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/10">
            <span className="text-lg font-bold">U</span>
          </div>
          <div>
            <p className="text-sm text-white/60">Business link platform</p>
            <h1 className="text-lg font-semibold">UrlShortener</h1>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          <a href="#pricing" className="transition hover:text-white">Pricing</a>
          <a href="#faq" className="transition hover:text-white">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 shadow-xl transition hover:scale-[1.02]"
          >
            Start free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <section className="grid items-center gap-10 pb-20 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:pb-28 lg:pt-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
              Built for modern teams and campaigns
            </div>

            <h2 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Short links that look sharp, move fast, and convert better.
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              Launch branded short URLs, organize campaigns, generate QR codes, and track
              performance from a dashboard designed to feel premium from the first click.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="rounded-2xl bg-cyan-400 px-6 py-3 text-center text-base font-semibold text-slate-950 shadow-2xl shadow-cyan-500/20 transition hover:scale-[1.02]"
              >
                Create your first short link
              </Link>

              <Link
                href="/login"
                className="rounded-2xl border border-white/15 px-6 py-3 text-center text-base text-white/90 transition hover:bg-white/5"
              >
                View dashboard preview
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <div className="text-2xl font-semibold">{stat.value}</div>
                  <div className="mt-1 text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm text-white/50">Workspace</p>
                  <h3 className="text-xl font-semibold">Spring Campaign</h3>
                </div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-300">
                  Live
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-white/50">Short URL</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="truncate font-medium text-cyan-300">go.brand.com/spring-launch</p>
                    <button className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white/80">
                      Copy
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-white/50">Clicks</p>
                    <p className="mt-2 text-2xl font-semibold">12,842</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-white/50">CTR lift</p>
                    <p className="mt-2 text-2xl font-semibold">+18%</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-white/50">QR scans</p>
                    <p className="mt-2 text-2xl font-semibold">3,204</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-medium">7-day performance</p>
                    <span className="text-sm text-white/50">Updated now</span>
                  </div>
                  <div className="flex h-36 items-end gap-2">
                    {[32, 54, 61, 48, 78, 85, 92].map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-2xl bg-gradient-to-t from-cyan-500 to-blue-400"
                        style={{ height: `${v}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Trusted by growing teams</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {logos.map((logo) => (
                <div
                  key={logo}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-5 text-center text-sm font-medium text-white/75"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="pb-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Features</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">
              Everything small teams need to launch fast
            </h3>
            <p className="mt-4 text-white/65">
              Focus on the features that matter most in an MVP business shortener: clarity,
              tracking, collaboration, and speed.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm"
              >
                <h4 className="text-xl font-semibold">{feature.title}</h4>
                <p className="mt-3 leading-7 text-white/65">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="grid gap-6 pb-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">How it works</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">
              A smooth flow from creation to analytics
            </h3>
            <p className="mt-4 text-white/65">
              Your product should feel effortless for first-time users. The onboarding and
              first success moment matter more than advanced settings.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                  {index + 1}
                </div>
                <p className="leading-7 text-white/80">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">What users like</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">
              Built to feel useful from day one
            </h3>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6"
              >
                <p className="leading-7 text-white/75">“{item.quote}”</p>
                <div className="mt-6">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-sm text-white/50">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Pricing</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">
              Start simple, grow into business use
            </h3>
            <p className="mt-4 text-white/65">
              Keep your MVP plan simple: a free tier to attract users and a pro plan for teams
              that need branding, exports, and analytics.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
              <p className="text-sm text-white/55">Starter</p>
              <div className="mt-3 text-4xl font-semibold">Free</div>
              <ul className="mt-6 space-y-3 text-white/70">
                <li>Short links</li>
                <li>Basic analytics</li>
                <li>QR generation</li>
                <li>Single workspace</li>
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-2xl border border-white/15 px-5 py-3 text-center text-white/90 transition hover:bg-white/5"
              >
                Start free
              </Link>
            </div>

            <div className="rounded-[32px] border border-cyan-300/30 bg-gradient-to-b from-cyan-400/10 to-transparent p-8 shadow-2xl shadow-cyan-500/10">
              <div className="mb-3 inline-flex rounded-full bg-cyan-300/15 px-3 py-1 text-sm text-cyan-200">
                Best for teams
              </div>
              <p className="text-sm text-white/55">Pro</p>
              <div className="mt-3 text-4xl font-semibold">
                $19<span className="text-lg text-white/50">/mo</span>
              </div>
              <ul className="mt-6 space-y-3 text-white/80">
                <li>Tags and campaign organization</li>
                <li>CSV exports</li>
                <li>Workspace collaboration</li>
                <li>Premium dashboard experience</li>
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-2xl bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:scale-[1.02]"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </section>

        <section id="faq" className="pt-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">FAQ</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">
              Common questions before getting started
            </h3>
          </div>

          <div className="grid gap-4">
            {faqs.map((item) => (
              <div
                key={item.q}
                className="rounded-[24px] border border-white/10 bg-white/5 p-6"
              >
                <p className="text-lg font-semibold text-white">{item.q}</p>
                <p className="mt-3 text-white/65">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-20">
          <CtaStrip />
        </section>
      </main>
    </div>
  )
}