import { useState, useMemo, useEffect, useCallback } from "react";
import { PlusCircle, Trash2, TrendingUp, TrendingDown, DollarSign, Filter, Download, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORIES = {
  income:  ["Sales", "Services", "Consulting", "Investment", "Grants", "Other Income"],
  expense: ["Salaries", "Rent", "Utilities", "Marketing", "Software", "Travel", "Equipment", "Taxes", "Other Expense"],
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

let _id = Date.now();
const uid = () => String(++_id);

// ── API helpers ────────────────────────────────────────────────────────────────
const API = "/api/transactions";

async function apiGet()        { const r = await fetch(API); return r.json(); }
async function apiPost(body)   { return fetch(API, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); }
async function apiDelete(id)   { return fetch(`${API}/${id}`, { method:"DELETE" }); }

// ── Styles ─────────────────────────────────────────────────────────────────────
const inp = (extra={}) => ({
  background:"#12151f", border:"1px solid #2a2f4a", borderRadius:8,
  color:"#e8eaf0", padding:"9px 12px", fontSize:13, width:"100%",
  outline:"none", boxSizing:"border-box", height:40, ...extra
});
const sel = (extra={}) => ({
  background:"#12151f", border:"1px solid #2a2f4a", borderRadius:8,
  color:"#e8eaf0", padding:"9px 12px", fontSize:13,
  outline:"none", cursor:"pointer", height:40, ...extra
});

// ── Component ──────────────────────────────────────────────────────────────────
export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);

  const [form, setForm]             = useState({ type:"income", date:today(), category:CATEGORIES.income[0], description:"", amount:"" });
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [showForm, setShowForm]     = useState(false);
  const [activeTab, setActiveTab]   = useState("transactions");

  // Load transactions
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet();
      setTransactions(data);
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (k, v) => {
    const next = { ...form, [k]: v };
    if (k === "type") next.category = CATEGORIES[v][0];
    setForm(next);
  };

  const addTransaction = async () => {
    if (!form.description.trim() || !form.amount || isNaN(parseFloat(form.amount))) return;
    const entry = { ...form, id: uid(), amount: parseFloat(form.amount) };
    setSaving(true);
    try {
      await apiPost(entry);
      await load();
      setForm({ type: form.type, date: today(), category: CATEGORIES[form.type][0], description: "", amount: "" });
      setShowForm(false);
    } catch {
      setError("Failed to save transaction.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await apiDelete(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch {
      setError("Failed to delete transaction.");
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterMonth !== "all" && String(new Date(t.date).getMonth()) !== filterMonth) return false;
      return true;
    });
  }, [transactions, filterType, filterMonth]);

  const totals = useMemo(() => {
    const income  = transactions.filter(t => t.type === "income").reduce((s,t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [transactions]);

  const chartData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
      if (!map[key]) map[key] = { label: MONTHS[d.getMonth()], income:0, expense:0 };
      map[key][t.type] += t.amount;
    });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).slice(-6).map(([,v]) => v);
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      if (!map[t.category]) map[t.category] = { type: t.type, total: 0 };
      map[t.category].total += t.amount;
    });
    return Object.entries(map).sort((a,b) => b[1].total - a[1].total);
  }, [filtered]);

  const exportCSV = () => {
    const rows = [["Date","Type","Category","Description","Amount"], ...filtered.map(t => [t.date, t.type, t.category, t.description, t.amount])];
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type:"text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "transactions.csv"; a.click();
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0f1117", color:"#e8eaf0", fontFamily:"'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a1d2e 0%,#12151f 100%)", borderBottom:"1px solid #1e2235", padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:"0.15em", textTransform:"uppercase", color:"#5b6490", fontWeight:600, marginBottom:4 }}>Financial Dashboard</div>
          <div style={{ fontSize:22, fontWeight:700, color:"#e8eaf0", letterSpacing:"-0.02em" }}>Business Tracker</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={load} title="Refresh" style={{ ...btnStyle("#1e2235","#8b91b8","1px solid #2a2f4a") }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={exportCSV} style={{ ...btnStyle("#1e2235","#8b91b8","1px solid #2a2f4a"), gap:6, display:"flex", alignItems:"center" }}>
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{ display:"flex", alignItems:"center", gap:6, background:"#4f6ef7", border:"none", color:"#fff", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600, boxShadow:"0 4px 16px rgba(79,110,247,0.3)" }}>
            <PlusCircle size={14} /> Add Entry
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 20px" }}>

        {/* Error banner */}
        {error && (
          <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:10, padding:"12px 16px", marginBottom:20, color:"#f87171", fontSize:13, display:"flex", justifyContent:"space-between" }}>
            {error}
            <span style={{ cursor:"pointer" }} onClick={() => setError(null)}>✕</span>
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
          {[
            { label:"Total Income",   value:totals.income,  icon:TrendingUp,   color:"#34d399", bg:"rgba(52,211,153,0.08)" },
            { label:"Total Expenses", value:totals.expense, icon:TrendingDown,  color:"#f87171", bg:"rgba(248,113,113,0.08)" },
            { label:"Net Profit",     value:totals.net,     icon:DollarSign,   color:totals.net>=0?"#60a5fa":"#f87171", bg:totals.net>=0?"rgba(96,165,250,0.08)":"rgba(248,113,113,0.08)" },
          ].map(card => (
            <div key={card.label} style={{ background:"#1a1d2e", border:"1px solid #1e2235", borderRadius:12, padding:"20px 22px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:"#5b6490", fontWeight:600, marginBottom:8 }}>{card.label}</div>
                <div style={{ fontSize:26, fontWeight:700, color:card.color, letterSpacing:"-0.03em" }}>
                  {loading ? <span style={{color:"#3a3f5c"}}>—</span> : fmt(card.value)}
                </div>
              </div>
              <div style={{ background:card.bg, borderRadius:10, padding:12 }}>
                <card.icon size={22} color={card.color} />
              </div>
            </div>
          ))}
        </div>

        {/* Add Form */}
        {showForm && (
          <div style={{ background:"#1a1d2e", border:"1px solid #2a2f4a", borderRadius:12, padding:"20px 22px", marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#8b91b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>New Transaction</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 2fr 1fr auto", gap:10, alignItems:"end" }}>
              {[
                { label:"Type", el:<select value={form.type} onChange={e=>setField("type",e.target.value)} style={sel()}><option value="income">Income</option><option value="expense">Expense</option></select> },
                { label:"Date", el:<input type="date" value={form.date} onChange={e=>setField("date",e.target.value)} style={inp()} /> },
                { label:"Category", el:<select value={form.category} onChange={e=>setField("category",e.target.value)} style={sel()}>{CATEGORIES[form.type].map(c=><option key={c}>{c}</option>)}</select> },
                { label:"Description", el:<input type="text" value={form.description} onChange={e=>setField("description",e.target.value)} placeholder="e.g. Client invoice #42" style={inp()} /> },
                { label:"Amount (USD)", el:<input type="number" value={form.amount} onChange={e=>setField("amount",e.target.value)} placeholder="0.00" min="0" style={inp()} /> },
                { label:"", el:<button onClick={addTransaction} disabled={saving} style={{ background:saving?"#2a2f4a":"#4f6ef7", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", cursor:saving?"not-allowed":"pointer", fontWeight:600, fontSize:13, height:40 }}>{saving?"Saving…":"Save"}</button> },
              ].map(({label,el}) => (
                <div key={label}>
                  {label && <div style={{ fontSize:11, color:"#5b6490", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
                  {el}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:20, background:"#1a1d2e", borderRadius:10, padding:4, width:"fit-content", border:"1px solid #1e2235" }}>
          {[["transactions","Transactions"],["chart","Monthly Overview"]].map(([k,v]) => (
            <button key={k} onClick={()=>setActiveTab(k)} style={{ background:activeTab===k?"#2a2f4a":"transparent", color:activeTab===k?"#e8eaf0":"#5b6490", border:"none", borderRadius:7, padding:"7px 16px", cursor:"pointer", fontSize:13, fontWeight:600 }}>{v}</button>
          ))}
        </div>

        {/* Chart Tab */}
        {activeTab === "chart" && (
          <div style={{ background:"#1a1d2e", border:"1px solid #1e2235", borderRadius:12, padding:"22px 22px 16px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#8b91b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:20 }}>Income vs Expenses — Last 6 Months</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="label" tick={{ fill:"#5b6490", fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#5b6490", fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background:"#1e2235", border:"1px solid #2a2f4a", borderRadius:8, color:"#e8eaf0", fontSize:13 }} formatter={(v)=>[fmt(v)]} />
                <Bar dataKey="income"  fill="#34d399" radius={[4,4,0,0]} name="Income"  />
                <Bar dataKey="expense" fill="#f87171" radius={[4,4,0,0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop:24, borderTop:"1px solid #1e2235", paddingTop:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#5b6490", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>Category Breakdown</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {categoryBreakdown.map(([cat,{type,total}]) => (
                  <div key={cat} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#12151f", borderRadius:8, padding:"10px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:type==="income"?"#34d399":"#f87171" }} />
                      <span style={{ fontSize:13, color:"#c0c5e0" }}>{cat}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, color:type==="income"?"#34d399":"#f87171" }}>{fmt(total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div style={{ background:"#1a1d2e", border:"1px solid #1e2235", borderRadius:12, overflow:"hidden" }}>
            <div style={{ display:"flex", gap:10, padding:"16px 20px", borderBottom:"1px solid #1e2235", alignItems:"center" }}>
              <Filter size={14} color="#5b6490" />
              <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={sel()}>
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={sel()}>
                <option value="all">All Months</option>
                {MONTHS.map((m,i)=><option key={m} value={String(i)}>{m}</option>)}
              </select>
              <span style={{ marginLeft:"auto", fontSize:12, color:"#5b6490" }}>{filtered.length} record{filtered.length!==1?"s":""}</span>
            </div>

            {loading ? (
              <div style={{ padding:"48px 20px", textAlign:"center", color:"#5b6490", fontSize:13 }}>Loading transactions…</div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid #1e2235" }}>
                    {["Date","Type","Category","Description","Amount",""].map(h => (
                      <th key={h} style={{ padding:"12px 20px", textAlign:h==="Amount"?"right":"left", fontSize:11, fontWeight:600, color:"#5b6490", textTransform:"uppercase", letterSpacing:"0.1em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ padding:"40px 20px", textAlign:"center", color:"#5b6490", fontSize:13 }}>No transactions found.</td></tr>
                  )}
                  {filtered.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom:"1px solid #12151f", background:i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>
                      <td style={{ padding:"13px 20px", fontSize:13, color:"#8b91b8" }}>{t.date}</td>
                      <td style={{ padding:"13px 20px" }}>
                        <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", padding:"3px 9px", borderRadius:5, background:t.type==="income"?"rgba(52,211,153,0.12)":"rgba(248,113,113,0.12)", color:t.type==="income"?"#34d399":"#f87171" }}>{t.type}</span>
                      </td>
                      <td style={{ padding:"13px 20px", fontSize:13, color:"#c0c5e0" }}>{t.category}</td>
                      <td style={{ padding:"13px 20px", fontSize:13, color:"#e8eaf0" }}>{t.description}</td>
                      <td style={{ padding:"13px 20px", fontSize:14, fontWeight:600, color:t.type==="income"?"#34d399":"#f87171", textAlign:"right" }}>
                        {t.type==="income"?"+":"-"}{fmt(t.amount)}
                      </td>
                      <td style={{ padding:"13px 16px", textAlign:"center" }}>
                        <button onClick={()=>remove(t.id)}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"#3a3f5c", padding:4, borderRadius:4, display:"flex", alignItems:"center" }}
                          onMouseEnter={e=>e.currentTarget.style.color="#f87171"}
                          onMouseLeave={e=>e.currentTarget.style.color="#3a3f5c"}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = (bg, color, border) => ({
  display:"flex", alignItems:"center", background:bg, border, color,
  borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13, fontWeight:500
});
