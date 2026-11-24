
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Flame,
  LayoutDashboard,
  Plus,
  Search,
  Send,
  Target,
  Users,
  X,
  LoaderCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API = "http://127.0.0.1:8000";

type Lead = {
  id: number;
  name: string;
  email: string;
  company: string;
  industry: string;
  company_size: number;
  budget: number;
  timeline: string;
  requirement: string;
  source: string;
  score: number;
  classification: "Hot" | "Warm" | "Cold";
  qualification_reason: string;
  suggested_response: string;
  status: string;
  created_at: string;
};

type Analytics = {
  total_leads: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  average_score: number;
};

const emptyForm = {
  name: "",
  email: "",
  company: "",
  industry: "SaaS",
  company_size: "10",
  budget: "5000",
  timeline: "Within a month",
  requirement: "",
  source: "Website",
};

const formFields: {
  key: keyof typeof emptyForm;
  label: string;
  type: string;
}[] = [
  { key: "name", label: "Full name", type: "text" },
  { key: "email", label: "Email address", type: "email" },
  { key: "company", label: "Company", type: "text" },
  { key: "industry", label: "Industry", type: "text" },
  { key: "company_size", label: "Company size (employees)", type: "number" },
  { key: "budget", label: "Budget (USD)", type: "number" },
  { key: "timeline", label: "Buying timeline", type: "text" },
  { key: "source", label: "Lead source", type: "text" },
];

function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    total_leads: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0,
    average_score: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [generating, setGenerating] = useState(false);

  function showNotification(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function loadData() {
    try {
      setError("");

      const [leadRes, analyticsRes] = await Promise.all([
        fetch(`${API}/api/leads`),
        fetch(`${API}/api/analytics`),
      ]);

      if (!leadRes.ok || !analyticsRes.ok) {
        throw new Error("Backend API returned an error.");
      }

      const leadData: Lead[] = await leadRes.json();
      const analyticsData: Analytics = await analyticsRes.json();

      setLeads(leadData);
      setAnalytics(analyticsData);

      setSelected((current) =>
        current
          ? leadData.find((lead) => lead.id === current.id) || null
          : null
      );
    } catch {
      setError(
        "Backend se connection nahi ho pa raha. Check that FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = [
        lead.name,
        lead.company,
        lead.email,
        lead.industry,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || lead.classification === filter;

      return matchesSearch && matchesFilter;
    });
  }, [leads, search, filter]);

  const chartData = [
    { name: "Hot", leads: analytics.hot_leads },
    { name: "Warm", leads: analytics.warm_leads },
    { name: "Cold", leads: analytics.cold_leads },
  ];

  async function createLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`${API}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          company_size: Number(form.company_size),
          budget: Number(form.budget),
        }),
      });

      if (!response.ok) {
        const detail = await response.json();
        throw new Error(detail.detail || "Could not create lead.");
      }

      const newLead: Lead = await response.json();

      setShowForm(false);
      setForm(emptyForm);

      await loadData();
      setSelected(newLead);

      showNotification("Lead successfully added.");
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(lead: Lead, status: string) {
    try {
      const response = await fetch(
        `${API}/api/leads/${lead.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error("Status update failed.");
      }

      const updated: Lead = await response.json();

      setSelected(updated);
      setLeads((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      await loadData();
      showNotification("Lead status updated.");
    } catch {
      showNotification("Could not update lead status.");
    }
  }

  async function generateResponse(lead: Lead) {
    setGenerating(true);

    try {
      const response = await fetch(
        `${API}/api/leads/${lead.id}/generate-response`,
        { method: "POST" }
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Response generation failed.");
      }

      const updated: Lead = await response.json();

      setSelected(updated);
      setLeads((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      showNotification("Response regenerated successfully.");
    } catch (err) {
      showNotification(
        err instanceof Error
          ? err.message
          : "Could not generate response."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyResponse(text: string) {
    if (!text) {
      showNotification("No response available to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showNotification("Response copied to clipboard.");
    } catch {
      showNotification("Clipboard access unavailable.");
    }
  }

  const statCards = [
    {
      label: "Total leads",
      value: analytics.total_leads,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Hot leads",
      value: analytics.hot_leads,
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Warm leads",
      value: analytics.warm_leads,
      icon: Target,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Average score",
      value: analytics.average_score,
      icon: ChartNoAxesCombined,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/[0.07] bg-[#0b0f1a] p-5 lg:flex lg:flex-col">
        <div className="mb-12 flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/15 p-2.5 text-blue-400">
            <Bot size={25} />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight">
              LeadPilot<span className="text-blue-400"> AI</span>
            </h1>
            <p className="text-xs text-slate-500">
              Sales intelligence platform
            </p>
          </div>
        </div>

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          Workspace
        </p>

        <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 px-3 py-3 text-sm font-medium text-blue-300">
          <LayoutDashboard size={18} />
          Dashboard
        </div>

        <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500">
          <BriefcaseBusiness size={18} />
          Lead management
        </div>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Activity size={16} className="text-emerald-400" />
            System status
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Dashboard connected
          </div>

          <p className="mt-2 text-[11px] text-slate-600">
            LaunchDesk demo workspace
          </p>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#080b14]/90 px-5 py-4 backdrop-blur-xl md:px-9">
          <div>
            <p className="text-xs text-slate-500">
              Workspace / Overview
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Dashboard
            </h2>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Add new lead</span>
            <span className="sm:hidden">Add lead</span>
          </button>
        </header>

        <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-blue-400">
                Good to see you
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                Sales overview
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Track, qualify and prioritize your incoming leads.
              </p>
            </div>

            <button
              onClick={() => void loadData()}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/5"
            >
              Refresh data ↻
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {notice && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200">
              {notice}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat, i) => {
              const Icon = stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-2xl border border-white/[0.07] bg-[#101522] p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      {stat.label}
                    </span>

                    <div className={`rounded-xl p-2.5 ${stat.bg} ${stat.color}`}>
                      <Icon size={19} />
                    </div>
                  </div>

                  <p className="mt-5 text-3xl font-bold tracking-tight">
                    {loading ? "—" : stat.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    Live backend data
                  </p>
                </motion.div>
              );
            })}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border border-white/[0.07] bg-[#101522] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Lead distribution
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Leads grouped by qualification
                  </p>
                </div>

                <ChartNoAxesCombined className="text-blue-400" size={20} />
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="leadFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b82f6"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="#ffffff0c"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#151c2b",
                        border: "1px solid #293449",
                        borderRadius: 12,
                        color: "#fff",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke="#60a5fa"
                      strokeWidth={2.5}
                      fill="url(#leadFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.07] bg-[#101522] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Qualification engine
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Rule-based lead scoring
                  </p>
                </div>

                <Bot className="text-violet-400" size={21} />
              </div>

              <div className="space-y-5">
                {[
                  {
                    label: "Budget fit",
                    desc: "Available customer budget",
                    score: "30 pts",
                  },
                  {
                    label: "Buying timeline",
                    desc: "How soon they need a solution",
                    score: "25 pts",
                  },
                  {
                    label: "Requirement detail",
                    desc: "Specificity of their request",
                    score: "25 pts",
                  },
                  {
                    label: "Company size",
                    desc: "Potential business fit",
                    score: "20 pts",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.desc}
                      </p>
                    </div>

                    <span className="whitespace-nowrap rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-blue-300">
                      {item.score}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-5 border-t border-white/[0.07] pt-4 text-[11px] leading-5 text-slate-500">
                Scores are generated by transparent backend rules, not by an LLM.
              </p>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101522]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] p-5">
              <div>
                <h3 className="font-semibold">Recent leads</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Review and prioritize your prospects
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
                  <Search size={15} className="text-slate-500" />

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search leads..."
                    className="w-32 bg-transparent text-xs outline-none placeholder:text-slate-600 sm:w-44"
                  />
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#151c2b] px-3 py-2 text-xs text-slate-300 outline-none"
                >
                  <option>All</option>
                  <option>Hot</option>
                  <option>Warm</option>
                  <option>Cold</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Lead</th>
                    <th className="px-5 py-4 font-medium">Company</th>
                    <th className="px-5 py-4 font-medium">Score</th>
                    <th className="px-5 py-4 font-medium">Priority</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.05]">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-200">
                          {lead.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {lead.email}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-slate-300">
                          {lead.company}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {lead.industry}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {lead.score}
                        <span className="text-slate-600">/100</span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            lead.classification === "Hot"
                              ? "bg-orange-500/10 text-orange-400"
                              : lead.classification === "Warm"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {lead.classification}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">
                        {lead.status}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelected(lead)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          View details
                          <ArrowUpRight
                            className="ml-1 inline"
                            size={13}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading && filteredLeads.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        No leads found. Add a lead to get started.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        <LoaderCircle
                          className="mr-2 inline animate-spin"
                          size={16}
                        />
                        Loading leads...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/[0.07] px-5 py-3 text-xs text-slate-600">
              Showing {filteredLeads.length} of {leads.length} leads
            </div>
          </section>

          <p className="pb-4 text-center text-[11px] text-slate-600">
            LeadPilot AI · LaunchDesk fictional demo workspace · Synthetic data only
          </p>
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#101522] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Add new lead
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter prospect details for qualification
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={createLead}
              className="grid gap-4 sm:grid-cols-2"
            >
              {formFields.map(({ key, label, type }) => (
                <label
                  key={key}
                  className="space-y-1.5 text-xs text-slate-400"
                >
                  {label}

                  <input
                    required
                    type={type}
                    min={
                      type === "number" ? 0 : undefined
                    }
                    value={form[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#080d18] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              ))}

              <label className="space-y-1.5 text-xs text-slate-400 sm:col-span-2">
                Requirement

                <textarea
                  required
                  rows={3}
                  value={form.requirement}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requirement: e.target.value,
                    })
                  }
                  placeholder="Describe what the prospect needs..."
                  className="w-full resize-y rounded-lg border border-white/10 bg-[#080d18] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>

              <button
                disabled={saving}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 sm:col-span-2"
              >
                {saving ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Plus size={16} />
                )}

                {saving
                  ? "Qualifying lead..."
                  : "Create and qualify lead"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#101522] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Lead profile · #{selected.id}
              </p>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <h2 className="mt-7 text-2xl font-bold">
              {selected.name}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {selected.company} · {selected.industry}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">
                  Lead score
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {selected.score}
                  <span className="text-sm text-slate-500">/100</span>
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">
                  Classification
                </p>
                <p className="mt-3 text-xl font-semibold text-blue-300">
                  {selected.classification}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="mt-1 text-sm">{selected.email}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Requirement
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {selected.requirement}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Qualification explanation
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {selected.qualification_reason}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs text-slate-500">
                  Follow-up status
                </p>

                <select
                  value={selected.status}
                  onChange={(e) =>
                    void updateStatus(selected, e.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#080d18] px-3 py-3 text-sm outline-none"
                >
                  {[
                    "New",
                    "Contacted",
                    "Qualified",
                    "Converted",
                    "Lost",
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-white/10 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Suggested response
                  </p>

                  <button
                    disabled={generating}
                    onClick={() => void generateResponse(selected)}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    {generating ? "Generating..." : "Regenerate"}
                  </button>
                </div>

                <div className="whitespace-pre-wrap rounded-xl border border-white/[0.07] bg-[#080d18] p-4 text-sm leading-6 text-slate-300">
                  {selected.suggested_response ||
                    "No response generated yet."}
                </div>

                <button
                  onClick={() =>
                    void copyResponse(selected.suggested_response)
                  }
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm hover:bg-white/5"
                >
                  <Send size={15} />
                  Copy response
                </button>

                <p className="mt-3 text-[11px] leading-5 text-slate-600">
                  This is a deterministic demo template, not an LLM-generated message. Review before sending.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;
