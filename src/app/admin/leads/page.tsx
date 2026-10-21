"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, Building2, Copy, Check, Search, Target, Zap, Download } from "lucide-react";

type Lead = {
  id: number;
  company: string;
  domain: string;
  role: string;
  salary: string;
  emails: string[];
  hunterUrl: string;
  website: string;
  careersUrl: string;
  whyHot: string;
  category: "crypto-native" | "web3-remote";
};

const LEADS: Lead[] = [
  { id: 1, company: "Re7 Capital", domain: "re7.capital", role: "Crypto Fund Operations Manager", salary: "90-140k", emails: ["careers@re7.capital", "info@re7.capital"], hunterUrl: "https://hunter.io/search/re7.capital", website: "https://re7.capital", careersUrl: "https://re7.capital/careers", whyHot: "Remote fund, actively hiring", category: "crypto-native" },
  { id: 2, company: "Relay", domain: "relay.build", role: "Customer Support Specialist", salary: "75-95k", emails: ["jobs@relay.build", "hiring@relay.build"], hunterUrl: "https://hunter.io/search/relay.build", website: "https://relay.build", careersUrl: "https://relay.build/careers", whyHot: "2 open remote roles", category: "crypto-native" },
  { id: 3, company: "Ritual", domain: "ritual.net", role: "Frontend + Ecosystem Engineer", salary: "80-130k", emails: ["careers@ritual.net", "hello@ritual.net"], hunterUrl: "https://hunter.io/search/ritual.net", website: "https://ritual.net", careersUrl: "https://ritual.net/careers", whyHot: "10+ Web3 roles open", category: "crypto-native" },
  { id: 4, company: "Nethermind", domain: "nethermind.io", role: "IT Department Lead", salary: "—", emails: ["careers@nethermind.io"], hunterUrl: "https://hunter.io/search/nethermind.io", website: "https://nethermind.io", careersUrl: "https://nethermind.io/careers", whyHot: "Major Ethereum lab", category: "crypto-native" },
  { id: 5, company: "Koinly", domain: "koinly.io", role: "Product Specialist", salary: "—", emails: ["jobs@koinly.io"], hunterUrl: "https://hunter.io/search/koinly.io", website: "https://koinly.io", careersUrl: "https://koinly.io/careers", whyHot: "Remote crypto tax", category: "crypto-native" },
  { id: 6, company: "Bluprynt", domain: "bluprynt.com", role: "Senior DevOps + Data Engineer", salary: "—", emails: ["careers@bluprynt.com"], hunterUrl: "https://hunter.io/search/bluprynt.com", website: "https://bluprynt.com", careersUrl: "https://bluprynt.com/careers", whyHot: "2 urgent remote roles", category: "crypto-native" },
  { id: 7, company: "Ihsan Pay", domain: "ihsanpay.com", role: "Founding Payments Engineer", salary: "120-240k", emails: ["founders@ihsanpay.com"], hunterUrl: "https://hunter.io/search/ihsanpay.com", website: "https://ihsanpay.com", careersUrl: "https://ihsanpay.com/careers", whyHot: "Startup, fast decision", category: "crypto-native" },
  { id: 8, company: "Rain", domain: "rain.xyz", role: "Solutions Engineer", salary: "148-172k", emails: ["jobs@rain.xyz", "talent@rain.xyz"], hunterUrl: "https://hunter.io/search/rain.xyz", website: "https://rain.xyz", careersUrl: "https://rain.xyz/careers", whyHot: "Crypto infra, funded", category: "crypto-native" },
  { id: 9, company: "Spruce", domain: "spruce.systems", role: "Rust/TypeScript Engineer", salary: "—", emails: ["hiring@spruce.systems"], hunterUrl: "https://hunter.io/search/spruce.systems", website: "https://spruce.systems", careersUrl: "https://spruce.systems/careers", whyHot: "Decentralized ID", category: "crypto-native" },
  { id: 10, company: "MoonPay", domain: "moonpay.com", role: "Capital Officer 84-120k", salary: "84-120k", emails: ["careers@moonpay.com"], hunterUrl: "https://hunter.io/search/moonpay.com", website: "https://moonpay.com", careersUrl: "https://moonpay.com/careers", whyHot: "Unicorn, 100+ remote", category: "crypto-native" },
  { id: 11, company: "Tether", domain: "tether.io", role: "Wallets Designer", salary: "115-138k", emails: ["jobs@tether.io"], hunterUrl: "https://hunter.io/search/tether.io", website: "https://tether.io", careersUrl: "https://tether.io/careers", whyHot: "Biggest stablecoin", category: "crypto-native" },
  { id: 12, company: "Kraken", domain: "kraken.com", role: "Sr Rust Engineer", salary: "—", emails: ["jobs@kraken.com"], hunterUrl: "https://hunter.io/search/kraken.com", website: "https://kraken.com", careersUrl: "https://kraken.com/careers", whyHot: "60+ remote roles", category: "crypto-native" },
  { id: 13, company: "Ondo Finance", domain: "ondo.finance", role: "Senior PM Growth", salary: "98-150k", emails: ["careers@ondo.finance"], hunterUrl: "https://hunter.io/search/ondo.finance", website: "https://ondo.finance", careersUrl: "https://ondo.finance/careers", whyHot: "Multiple roles", category: "web3-remote" },
  { id: 14, company: "Phantom", domain: "phantom.com", role: "Staff SRE", salary: "200-250k", emails: ["careers@phantom.com"], hunterUrl: "https://hunter.io/search/phantom.com", website: "https://phantom.com", careersUrl: "https://phantom.com/careers", whyHot: "Popular wallet", category: "web3-remote" },
  { id: 15, company: "Chainlink Labs", domain: "chain.link", role: "Executive Assistant", salary: "—", emails: ["careers@chain.link"], hunterUrl: "https://hunter.io/search/chain.link", website: "https://chain.link", careersUrl: "https://chain.link/careers", whyHot: "Always hiring", category: "web3-remote" },
  { id: 16, company: "Aptos Foundation", domain: "aptosfoundation.org", role: "Community Manager Korea", salary: "—", emails: ["jobs@aptosfoundation.org"], hunterUrl: "https://hunter.io/search/aptosfoundation.org", website: "https://aptosfoundation.org", careersUrl: "https://aptosfoundation.org/careers", whyHot: "L1, funded", category: "web3-remote" },
  { id: 17, company: "Lightning Labs", domain: "lightning.engineering", role: "Protocol Engineer", salary: "77-144k", emails: ["hiring@lightning.engineering"], hunterUrl: "https://hunter.io/search/lightning.engineering", website: "https://lightning.engineering", careersUrl: "https://lightning.engineering/careers", whyHot: "Bitcoin famous", category: "web3-remote" },
  { id: 18, company: "Brave", domain: "brave.com", role: "Sr Build/Release Engineer", salary: "—", emails: ["jobs@brave.com"], hunterUrl: "https://hunter.io/search/brave.com", website: "https://brave.com", careersUrl: "https://brave.com/careers", whyHot: "Browser, remote", category: "web3-remote" },
  { id: 19, company: "CertiK", domain: "certik.com", role: "Blockchain Security Intern", salary: "6-8k/mo", emails: ["careers@certik.com"], hunterUrl: "https://hunter.io/search/certik.com", website: "https://certik.com", careersUrl: "https://certik.com/careers", whyHot: "Security leader", category: "web3-remote" },
  { id: 20, company: "Blockstream", domain: "blockstream.com", role: "Security Architect Remote", salary: "—", emails: ["careers@blockstream.com"], hunterUrl: "https://hunter.io/search/blockstream.com", website: "https://blockstream.com", careersUrl: "https://blockstream.com/careers", whyHot: "OG Bitcoin", category: "web3-remote" },
  { id: 21, company: "HyroTrader", domain: "hyrotrader.com", role: "Senior Mobile Dev", salary: "6-11k/mo", emails: ["careers@hyrotrader.com"], hunterUrl: "https://hunter.io/search/hyrotrader.com", website: "https://hyrotrader.com", careersUrl: "https://hyrotrader.com/careers", whyHot: "Multiple roles", category: "crypto-native" },
  { id: 22, company: "Anagram", domain: "anagram.xyz", role: "Site Reliability Engineer", salary: "—", emails: ["hello@anagram.xyz"], hunterUrl: "https://hunter.io/search/anagram.xyz", website: "https://anagram.xyz", careersUrl: "https://anagram.xyz/careers", whyHot: "Small, fast", category: "crypto-native" },
  { id: 23, company: "Alchemy", domain: "alchemy.com", role: "Backend Engineer Rust", salary: "—", emails: ["careers@alchemy.com"], hunterUrl: "https://hunter.io/search/alchemy.com", website: "https://alchemy.com", careersUrl: "https://alchemy.com/careers", whyHot: "Unicorn", category: "web3-remote" },
  { id: 24, company: "Helius", domain: "helius.dev", role: "Senior Backend 90-150k", salary: "90-150k", emails: ["jobs@helius.dev"], hunterUrl: "https://hunter.io/search/helius.dev", website: "https://helius.dev", careersUrl: "https://helius.dev/careers", whyHot: "Solana infra", category: "web3-remote" },
  { id: 25, company: "Groma", domain: "groma.com", role: "Finance Coops $20k", salary: "$20k", emails: ["careers@groma.com"], hunterUrl: "https://hunter.io/search/groma.com", website: "https://groma.com", careersUrl: "https://groma.com/careers", whyHot: "Multiple coops", category: "web3-remote" },
  { id: 26, company: "peaq Labs", domain: "peaq.xyz", role: "Marketing Lead", salary: "—", emails: ["jobs@peaq.xyz"], hunterUrl: "https://hunter.io/search/peaq.xyz", website: "https://peaq.xyz", careersUrl: "https://peaq.xyz/careers", whyHot: "IoT Web3", category: "web3-remote" },
  { id: 27, company: "Stellar Foundation", domain: "stellar.org", role: "Director Research 210-365k", salary: "210-365k", emails: ["jobs@stellar.org"], hunterUrl: "https://hunter.io/search/stellar.org", website: "https://stellar.org", careersUrl: "https://stellar.org/careers", whyHot: "L1 funded", category: "web3-remote" },
  { id: 28, company: "Spruce (again)", domain: "spruce.systems", role: "Rust Engineer", salary: "—", emails: ["hiring@spruce.systems"], hunterUrl: "https://hunter.io/search/spruce.systems", website: "https://spruce.systems", careersUrl: "https://spruce.systems/careers", whyHot: "Decentralized ID", category: "crypto-native" },
  { id: 29, company: "zerohash", domain: "zerohash.io", role: "Eng Manager", salary: "—", emails: ["jobs@zerohash.io"], hunterUrl: "https://hunter.io/search/zerohash.io", website: "https://zerohash.io", careersUrl: "https://zerohash.io/careers", whyHot: "Fintech", category: "web3-remote" },
  { id: 30, company: "Sentient", domain: "sentient.xyz", role: "AI/Web3 roles", salary: "—", emails: ["careers@sentient.xyz"], hunterUrl: "https://hunter.io/search/sentient.xyz", website: "https://sentient.xyz", careersUrl: "https://sentient.xyz/careers", whyHot: "Small, autonomy", category: "crypto-native" },
];

export default function AdminLeadsPage() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<"all" | "crypto-native" | "web3-remote">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("gjm_leads_checked");
    if (saved) try { setChecked(JSON.parse(saved)); } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("gjm_leads_checked", JSON.stringify(checked));
  }, [checked]);

  const toggle = (id: number) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(email);
    setTimeout(() => setCopied(null), 1500);
  };

  const copyTemplate = (company: string, role: string) => {
    const txt = `Hi ${company} team,

Saw your ${role} role — great opening.

We run Global Job Matching — crypto-native board (2000+ jobs, USDT ~$1 fees). We feature jobs on homepage + top search for $39 one-time in crypto (BTC/USDT/BNB). On-chain verified in 5 min, no subscription. CryptoJobsList charges $499 for same.

Want me to feature yours today? Just reply "yes".

Best,
Mehdi — Global Job Matching
global-job-matching.vercel.app/crypto-jobs`;
    navigator.clipboard.writeText(txt);
    setCopied(`template-${company}`);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = LEADS.filter(l => {
    if (filter !== "all" && l.category !== filter) return false;
    if (search && !`${l.company} ${l.domain} ${l.role}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Admin
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-amber-400" /> Employer Leads — 30 Hot Companies
            </h1>
            <p className="text-slate-400 text-sm mt-1">همه الان remote استخدام می‌کنند و قبلاً $150-499 برای آگهی دادن — آماده‌ان $19 بدن. با جیمیل شخصی‌ات بفرست.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">{doneCount}/30 emailed</span>
            <a href="https://hunter.io" target="_blank" rel="noopener" className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Hunter.io</a>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-4 mb-6">
          <h2 className="font-bold text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> چطوری ایمیل پیدا کنم (۳۰ ثانیه/شرکت):</h2>
          <ol className="text-sm text-slate-300 space-y-1 list-decimal pl-5">
            <li>روی <strong>Hunter</strong> کلیک کن → دامین رو بزن → ایمیل موسس/HR رو کپی کن (۲۵ تا رایگان/ماه)</li>
            <li>اگر نبود: برو <code className="px-1 py-0.5 rounded bg-white/10 text-xs">{`careers@domain.com`}</code> یا <code className="px-1 py-0.5 rounded bg-white/10 text-xs">{`hiring@domain.com`}</code> رو با جیمیل بفرست — ۸۰٪ جواب می‌ده</li>
            <li>قالب آماده رو Copy کن → اسم شرکت/نقش رو عوض کن → با جیمیل بفرست (روزی ۱۰ تا)</li>
            <li>تیک ✅ بزن تا یادت بمونه</li>
          </ol>
          <p className="text-xs text-slate-500 mt-3">ایمیل سایت (Resend) برای outreach استفاده نکن — اسپم میشی. فقط جیمیل شخصی.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(["all", "crypto-native", "web3-remote"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>{f === "all" ? "All 30" : f === "crypto-native" ? "Crypto Native (15)" : "Web3 Remote (15)"}</button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or role..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm" />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(lead => (
            <div key={lead.id} className={`glass rounded-xl p-4 border flex flex-col sm:flex-row gap-4 ${checked[lead.id] ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10"}`}>
              <label className="flex items-start gap-3 flex-1 cursor-pointer">
                <input type="checkbox" checked={!!checked[lead.id]} onChange={() => toggle(lead.id)} className="mt-1 w-5 h-5 rounded" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-white">{lead.company}</h3>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${lead.category === "crypto-native" ? "bg-amber-500 text-white" : "bg-indigo-500 text-white"}`}>{lead.category === "crypto-native" ? "CRYPTO" : "WEB3"}</span>
                    <span className="text-xs text-slate-400">• {lead.role} • {lead.salary}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{lead.whyHot} — {lead.domain}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lead.emails.map(email => (
                      <button key={email} onClick={() => copyEmail(email)} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-cyan-300 hover:bg-white/10">
                        <Mail className="w-3 h-3" /> {email} {copied === email ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-50" />}
                      </button>
                    ))}
                  </div>
                </div>
              </label>
              <div className="flex sm:flex-col gap-2 shrink-0">
                <a href={lead.hunterUrl} target="_blank" rel="noopener" className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-1 hover:bg-amber-500/20"><Search className="w-3.5 h-3.5" /> Hunter</a>
                <a href={lead.website} target="_blank" rel="noopener" className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs flex items-center gap-1 hover:bg-white/10"><Building2 className="w-3.5 h-3.5" /> Site <ExternalLink className="w-3 h-3" /></a>
                <button onClick={() => copyTemplate(lead.company, lead.role)} className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-medium flex items-center gap-1 hover:bg-indigo-500">{copied === `template-${lead.company}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy Email</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 glass rounded-2xl border border-indigo-500/20 p-6 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <h3 className="font-bold text-white mb-2">قالب ایمیل (کپی و بفرست):</h3>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-black/20 rounded-xl p-4 border border-white/10 overflow-x-auto">{`Subject: Feature your [Role] for $39 in crypto (vs $499 elsewhere)

Hi [Name],

Saw your [Role] on [CryptoJobsList/RemoteOK] — great opening.

We run Global Job Matching — crypto-native board (2000+ jobs, USDT ~$1 fees).
We feature jobs on homepage + top search for $39 one-time in crypto (BTC/USDT/BNB).

No subscription, on-chain verified in 5 min. CryptoJobsList charges $499.

Want me to feature yours today? Just reply "yes".

Best,
Mehdi — Global Job Matching
global-job-matching.vercel.app/crypto-jobs`}</pre>
        </div>
      </div>
    </div>
  );
}
