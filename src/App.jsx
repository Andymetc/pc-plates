import { useState, useEffect, useRef } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "./supabase.js";
import { VENDORS as VENDORS_DEFAULT, VENDOR_NAMES } from "./vendors.js";

const SERIES_COLORS = {
  "Breakfast at PC": { bg: "#FFF3E0", accent: "#E65100" },
  "Cheap Eats": { bg: "#E8F5E9", accent: "#2E7D32" },
  "Late Night / Lock In": { bg: "#E3F2FD", accent: "#1565C0" },
  "Desserts & Drinks": { bg: "#FCE4EC", accent: "#C62828" },
  "Fan Favorites": { bg: "#F3E5F5", accent: "#6A1B9A" },
  "Finals Fuel": { bg: "#FFF9C4", accent: "#F57F17" },
};
const SERIES_LIST = Object.keys(SERIES_COLORS);


const MA_COLORS = {
  "Amber": "#E67E22", "Amané": "#8E44AD", "Andy": "#2C3E50", "Dominik": "#C0392B",
  "Gerardo": "#27AE60", "Isabella": "#D35400", "Jeanette": "#2980B9", "Jennifer": "#16A085",
  "Kaitlyn": "#E74C3C", "Kiana": "#9B59B6", "Leandro": "#1ABC9C", "Siena": "#F39C12",
  "Talia": "#3498DB", "Taniyah": "#E91E63", "Tina": "#00BCD4", "Yaena": "#FF5722",
};
const PA_COLORS = {
  "Aeron": "#7B1FA2", "Fuma": "#00695C", "Jodie": "#AD1457", "Justin": "#1565C0",
  "Leira": "#EF6C00", "Matthew": "#4527A0", "Nadine": "#2E7D32", "Regine": "#C62828", "Tobin": "#0277BD",
};

const MAs = Object.keys(MA_COLORS).sort();
const PAs = Object.keys(PA_COLORS).sort();

const QUARTER_WEEKS = [
  { label: "WK 1", sun: new Date(2026, 2, 29), isMidterm: false, isFinals: false },
  { label: "WK 2", sun: new Date(2026, 3, 5), isMidterm: false, isFinals: false },
  { label: "WK 3", sun: new Date(2026, 3, 12), isMidterm: false, isFinals: false },
  { label: "WK 4", sun: new Date(2026, 3, 19), isMidterm: true, isFinals: false },
  { label: "WK 5", sun: new Date(2026, 3, 26), isMidterm: true, isFinals: false },
  { label: "WK 6", sun: new Date(2026, 4, 3), isMidterm: true, isFinals: false },
  { label: "WK 7", sun: new Date(2026, 4, 10), isMidterm: false, isFinals: false },
  { label: "WK 8", sun: new Date(2026, 4, 17), isMidterm: false, isFinals: false },
  { label: "WK 9", sun: new Date(2026, 4, 24), isMidterm: false, isFinals: false },
  { label: "WK 10", sun: new Date(2026, 4, 31), isMidterm: false, isFinals: true },
  { label: "FINALS", sun: new Date(2026, 5, 7), isMidterm: false, isFinals: true },
];

function getWeekLabel(sundayDate) {
  for (const w of QUARTER_WEEKS) {
    if (sundayDate.getFullYear() === w.sun.getFullYear() && sundayDate.getMonth() === w.sun.getMonth() && sundayDate.getDate() === w.sun.getDate()) return w;
  }
  return null;
}

function getWeekFromDate(dateStr) {
  const d = parseDate(dateStr);
  const sun = new Date(d); sun.setDate(d.getDate() - d.getDay());
  for (const w of QUARTER_WEEKS) {
    if (sun.getFullYear() === w.sun.getFullYear() && sun.getMonth() === w.sun.getMonth() && sun.getDate() === w.sun.getDate()) {
      return w.label === "FINALS" ? "F" : parseInt(w.label.replace("WK ", ""));
    }
  }
  return "—";
}

const DEFAULT_POSTS = [
  { id: 1, series: "Breakfast at PC", spot: "Santorini Greek Island Grill", order: "Breakfast burrito", format: "Reel: morning pickup POV", hook: "You have a 9am. You're already at PC. Stop skipping breakfast.", cost: "$8–10", date: "2026-04-01", ma: "Dominik", pa: "Regine" },
  { id: 2, series: "Cheap Eats", spot: "Curry Up Now", order: "Most affordable bowl or combo", format: "Reel: things you didn't know you could get at PC", hook: "Curry Up Now has a full meal under $10 and nobody talks about it.", cost: "$8–10", date: "2026-04-03", ma: "Isabella", pa: "Nadine" },
  { id: 3, series: "Breakfast at PC", spot: "Su Pan Bakery", order: "Concha + coffee combo", format: "Reel: cozy pastry close-ups", hook: "A concha and a cortado for less than your parking permit.", cost: "$6–8", date: "2026-04-07", ma: "Siena", pa: "Leira" },
  { id: 4, series: "Cheap Eats", spot: "Taco Villa", order: "Burrito or plate under $9", format: "Reel: price reveal — guess the total", hook: "Name a better deal at PC. We'll wait.", cost: "$7–9", date: "2026-04-09", ma: "Taniyah", pa: "Tobin" },
  { id: 5, series: "Desserts & Drinks", spot: "Zanzibar Café at The Loft", order: "Specialty coffee or espresso", format: "Reel: coffee pour shots, study break", hook: "Zanzibar makes real coffee and it's been right here the whole time.", cost: "$5–7", date: "2026-04-11", ma: "Tina", pa: "Jodie" },
  { id: 6, series: "Cheap Eats", spot: "Tapioca Express", order: "Manager's special (reveal on camera)", format: "Reel: mystery order", hook: "We ordered the manager's special so you don't have to wonder.", cost: "$10–14", date: "2026-04-14", ma: "Yaena", pa: "Aeron" },
  { id: 7, series: "Breakfast at PC", spot: "Taco Bell", order: "Breakfast Crunchwrap or combo", format: "Reel: speed-run breakfast under $5", hook: "Taco Bell breakfast is criminally underrated and you know it.", cost: "$4–6", date: "2026-04-16", ma: "Jeanette", pa: "Justin" },
  { id: 8, series: "Desserts & Drinks", spot: "Yogurt World", order: "Custom froyo bowl", format: "Reel: topping build, satisfying swirl shots", hook: "Design your own dessert. It's called self-care.", cost: "$6–8", date: "2026-04-18", ma: "Kaitlyn", pa: "Fuma" },
  { id: 9, series: "Late Night / Lock In", spot: "Taco Bell", order: "Late-night go-to order", format: "Reel: 10pm Geisel exit, walk to PC", hook: "It's 10pm. You just left Geisel. Taco Bell is still open.", cost: "$6–8", date: "2026-04-21", ma: "Gerardo", pa: "Matthew" },
  { id: 10, series: "Cheap Eats", spot: "Zanzibar Café at The Loft", order: "Happy hour menu item", format: "Reel: happy hour spotlight, midterm refuel", hook: "Midterm brain needs real food. Zanzibar happy hour. Go.", cost: "$8–12", date: "2026-04-23", ma: "Amber", pa: "Regine" },
  { id: 11, series: "Desserts & Drinks", spot: "Su Pan Bakery", order: "Coffee + sweet bread for late study", format: "Reel: 8pm pan dulce run, study fuel", hook: "Su Pan coffee and a concha is the midterm survival kit nobody told you about.", cost: "$6–9", date: "2026-04-25", ma: "Jennifer", pa: "Nadine" },
  { id: 12, series: "Late Night / Lock In", spot: "Subway", order: "Custom sub, late-night build", format: "Reel: building the perfect study sub", hook: "Subway at 9pm hits different when you've been studying since noon.", cost: "$8–10", date: "2026-05-01", ma: "Talia", pa: "Leira" },
  { id: 13, series: "Cheap Eats", spot: "Croutons", order: "$6.99 Friday panini", format: "Reel: Friday-only deal reveal", hook: "You survived midterms (almost). $6.99 panini. You've earned it.", cost: "$7–8", date: "2026-05-03", ma: "Kiana", pa: "Tobin" },
  { id: 14, series: "Late Night / Lock In", spot: "Burger King", order: "Late-night value combo", format: "Reel: BK after dark, post-midterm reward", hook: "Midterms are done. Burger King after dark. No judgment zone.", cost: "$6–9", date: "2026-05-05", ma: "Andy", pa: "Jodie" },
  { id: 15, series: "Breakfast at PC", spot: "Shores Diner", order: "Coffee + breakfast plate", format: "Reel: classic diner morning", hook: "Shores has full diner breakfast energy and you've been walking past it.", cost: "$8–11", date: "2026-05-07", ma: "Leandro", pa: "Aeron" },
  { id: 16, series: "Cheap Eats", spot: "Dirty Birds", order: "Wings split with a friend ($7 each)", format: "Reel: buddy meal, celebration", hook: "Midterms are over. Grab a friend. Split wings. $7 each.", cost: "$14", date: "2026-05-09", ma: "Amané", pa: "Justin" },
  { id: 17, series: "Breakfast at PC", spot: "Taco Villa", order: "Breakfast burrito", format: "Reel: breakfast burrito bracket", hook: "Two breakfast burritos enter. One leaves. (Just kidding, eat both.)", cost: "$7–9", date: "2026-05-12", ma: "Dominik", pa: "Fuma" },
  { id: 18, series: "Desserts & Drinks", spot: "Shores Diner", order: "Coffee + pie or dessert", format: "Reel: afternoon diner vibes", hook: "Shores Diner has pie and nobody ever talks about it.", cost: "$6–8", date: "2026-05-14", ma: "Isabella", pa: "Matthew" },
  { id: 19, series: "Cheap Eats", spot: "Taco Bell", order: "Value menu meal under $7", format: "Reel: $5 challenge", hook: "We built a full Taco Bell meal for less than your iced latte.", cost: "$5–7", date: "2026-05-19", ma: "Siena", pa: "Regine" },
  { id: 20, series: "Desserts & Drinks", spot: "Su Pan Bakery", order: "Pan dulce taste test", format: "Reel: ranking every pastry", hook: "Ranking every pastry at Su Pan so you don't have to guess.", cost: "$6–9", date: "2026-05-21", ma: "Taniyah", pa: "Nadine" },
  { id: 21, series: "Fan Favorites", spot: "TBD", order: "Audience vote — which spot to revisit?", format: "Story poll + carousel recap", hook: "You've seen them all. Now you pick. Vote for our Season Finale.", cost: "$0", date: "2026-05-23", ma: "Tina", pa: "Leira" },
  { id: 22, series: "Fan Favorites", spot: "TBD", order: "Top voted spot — revisit with new order", format: "Reel: You voted, we ate", hook: "The people spoke. We're back trying something new.", cost: "$10–14", date: "2026-05-27", ma: "Yaena", pa: "Tobin" },
  { id: 23, series: "Fan Favorites", spot: "TBD", order: "Runner-up spot — different angle", format: "Reel: second chance", hook: "Runner-up round. We owed this spot a second visit.", cost: "$10–14", date: "2026-05-29", ma: "Jeanette", pa: "Jodie" },
  { id: 24, series: "Late Night / Lock In", spot: "Taco Bell", order: "Late-night finals order + hours", format: "Reel: Finals lock-in starts now", hook: "Finals week is here. Taco Bell is still open. Let's lock in.", cost: "$6–8", date: "2026-06-02", ma: "Kaitlyn", pa: "Aeron" },
  { id: 25, series: "Late Night / Lock In", spot: "Subway", order: "Custom finals sub build", format: "Reel: Build your finals fuel", hook: "Build the sub. Hit the books. You've got this.", cost: "$8–10", date: "2026-06-04", ma: "Gerardo", pa: "Justin" },
  { id: 26, series: "Desserts & Drinks", spot: "Zanzibar Café at The Loft", order: "Coffee crawl — caffeine ranking", format: "Reel: Ranking every coffee at PC for finals", hook: "Finals caffeine tier list. You need this.", cost: "$10–14", date: "2026-06-06", ma: "Amber", pa: "Fuma" },
  { id: 27, series: "Finals Fuel", spot: "Multiple / Roundup", order: "Top cheap eats + caffeine + late night", format: "Carousel: finals survival guide", hook: "Finals fuel guide — every cheap eat, late bite, and caffeine hit at PC.", cost: "$0", date: "2026-06-08", ma: "Jennifer", pa: "Matthew" },
  { id: 28, series: "Finals Fuel", spot: "Multiple / Roundup", order: "Late-night spots + finals hours", format: "Reel: Still open during finals", hook: "It's finals. These spots are still open. You're welcome.", cost: "$0", date: "2026-06-10", ma: "Talia", pa: "Regine" },
  { id: 29, series: "Finals Fuel", spot: "Multiple / Roundup", order: "Final post — thank you + summer tease", format: "Reel/Carousel: season wrap", hook: "That's a wrap on PC Plates. Thanks for eating with us.", cost: "$0", date: "2026-06-12", ma: "Kiana", pa: "Nadine" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i++) days.push({ date: new Date(year, month, -first.getDay() + i + 1), inMonth: false });
  for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(year, month, i), inMonth: true });
  while (days.length % 7 !== 0) days.push({ date: new Date(year, month + 1, days.length - last.getDate() - first.getDay() + 1), inMonth: false });
  return days;
}

function parseDate(str) { const [y, m, d] = str.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function sameDay(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

function PersonDot({ name, colorMap, size = 18, fontSize = 7 }) {
  if (!name) return null;
  const color = colorMap[name] || "#999";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: size * 0.55, fontWeight: 700, lineHeight: 1,
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}>{name.charAt(0).toUpperCase()}</div>
      <span style={{ fontSize, color, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap" }}>{name}</span>
    </div>
  );
}

function Select({ value, options, onChange, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px", fontSize: 12,
      fontFamily: "'DM Sans', sans-serif", background: "#fff", width: "100%", ...style,
    }}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
  );
}

function PersonSelect({ label, value, options, colorMap, onChange }) {
  const color = value ? (colorMap[value] || "#999") : "#ccc";
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "#999", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {value ? (
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
            {value.charAt(0)}
          </div>
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f0f0f0", flexShrink: 0, border: "1.5px dashed #ccc" }} />
        )}
        <select value={value || ""} onChange={e => onChange(e.target.value)} style={{
          border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px", fontSize: 12,
          fontFamily: "'DM Sans', sans-serif", background: "#fff", flex: 1,
        }}>
          <option value="">— None —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

function EditableText({ value, onChange, multiline, style }) {
  const Tag = multiline ? "textarea" : "input";
  return <Tag value={value} onChange={e => onChange(e.target.value)} style={{
    border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px", fontSize: 12,
    fontFamily: "'DM Sans', sans-serif", width: "100%", resize: multiline ? "vertical" : "none",
    minHeight: multiline ? 60 : "auto", ...style,
  }} />;
}

function Label({ children }) {
  return <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "#999", marginBottom: 4, fontWeight: 600 }}>{children}</div>;
}

function EditPanel({ post, onClose, onUpdate, onDelete, onVendorClick, vendors }) {
  if (!post) return null;
  const c = SERIES_COLORS[post.series] || { bg: "#f5f5f5", accent: "#333" };
  const update = (key, val) => onUpdate(post.id, key, val);
  const week = getWeekFromDate(post.date);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: Math.min(420, window.innerWidth * 0.94),
      background: "#fff", boxShadow: "-8px 0 30px rgba(0,0,0,0.15)", zIndex: 100,
      display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif",
      overflow: "auto", animation: "slideIn 0.25s ease-out",
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div style={{ background: c.accent, padding: "22px 20px 16px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
              {week === "F" ? "Finals Week" : week === "—" ? "No Quarter Week" : `Week ${week}`} · {post.series}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{post.spot}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => update("done", !post.done)} title={post.done ? "Mark as not done" : "Mark as done"} style={{
              background: post.done ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)",
              border: "none", color: post.done ? "#2E7D32" : "rgba(255,255,255,0.6)",
              width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900,
            }}>✓</button>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
              width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        </div>
        {post.done && (
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.15)", borderRadius: 6, padding: "3px 10px", display: "inline-block" }}>
            ✓ Done
          </div>
        )}
      </div>
      <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><PersonSelect label="MA" value={post.ma || ""} options={MAs} colorMap={MA_COLORS} onChange={v => update("ma", v)} /></div>
          <div style={{ flex: 1 }}><PersonSelect label="MA 2" value={post.ma2 || ""} options={MAs} colorMap={MA_COLORS} onChange={v => update("ma2", v)} /></div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><PersonSelect label="PA" value={post.pa || ""} options={PAs} colorMap={PA_COLORS} onChange={v => update("pa", v)} /></div>
          <div style={{ flex: 1 }}><PersonSelect label="PA 2" value={post.pa2 || ""} options={PAs} colorMap={PA_COLORS} onChange={v => update("pa2", v)} /></div>
        </div>
        <div>
          <Label>Post Date</Label>
          <input type="date" value={post.date} onChange={e => update("date", e.target.value)} style={{
            border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px", fontSize: 12,
            fontFamily: "'DM Sans', sans-serif", width: "100%",
          }} />
        </div>
        <div><Label>Series</Label><Select value={post.series} options={SERIES_LIST} onChange={v => update("series", v)} /></div>
        <div>
          <Label>Vendor</Label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Select value={post.spot} options={VENDOR_NAMES} onChange={v => update("spot", v)} style={{ flex: 1 }} />
            {vendors && vendors[post.spot] && (
              <button onClick={() => onVendorClick(post.spot)} title="View vendor details" style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 6, border: "1px solid #ddd",
                background: "#f5f5f5", cursor: "pointer", fontSize: 14, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>ℹ</button>
            )}
          </div>
        </div>
        <div><Label>What to Order</Label><EditableText value={post.order} onChange={v => update("order", v)} /></div>
        <div><Label>Content Format</Label><EditableText value={post.format} onChange={v => update("format", v)} /></div>
        <div><Label>Caption Hook</Label><EditableText value={post.hook} onChange={v => update("hook", v)} multiline /></div>
        <div><Label>Est. Budget</Label><EditableText value={post.cost} onChange={v => update("cost", v)} /></div>
        <button onClick={() => { onDelete(post.id); onClose(); }} style={{
          width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e53935",
          background: "#fff", color: "#e53935", fontWeight: 600, fontSize: 12, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", marginTop: 4,
        }}>Delete This Post</button>
      </div>
    </div>
  );
}

function VendorPanel({ vendor, vendorData, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [ed, setEd] = useState(null);

  if (!vendorData) return null;
  const v = vendorData;
  const hours = Object.entries(v.hours || {});
  const menu = v.menu || [];

  const startEdit = () => {
    setEd({
      location: v.location || "",
      phone: v.phone || "",
      tags: [...(v.tags || [])],
      hours: Object.entries(v.hours || {}).map(([day, time]) => ({ day, time })),
      menu: (v.menu || []).map(m => typeof m === "string" ? { name: m, price: "" } : { name: m.name || "", price: m.price || "" }),
      deals: [...(v.deals || [])],
      dietary: [...(v.dietary || [])],
    });
    setIsEditing(true);
  };

  const cancelEdit = () => { setIsEditing(false); setEd(null); };

  const saveEdit = () => {
    onUpdate({
      ...v,
      location: ed.location,
      phone: ed.phone,
      tags: ed.tags.filter(t => t.trim()),
      hours: Object.fromEntries(ed.hours.filter(h => h.day.trim()).map(h => [h.day, h.time])),
      menu: ed.menu.filter(m => (m.name || "").trim()),
      deals: ed.deals.filter(d => d.trim()),
      dietary: ed.dietary.filter(d => d.trim()),
    });
    setIsEditing(false);
    setEd(null);
  };

  const inp = { border: "1px solid #ddd", borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", width: "100%", boxSizing: "border-box" };
  const secLabel = { fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 };
  const rmBtn = { background: "none", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", color: "#999", padding: "0 8px", fontSize: 14, flexShrink: 0 };
  const addBtn = (color) => ({ fontSize: 11, color, background: "none", border: `1px dashed ${color}60`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", marginTop: 2 });

  const EditList = ({ items, field, placeholder }) => (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
          <input value={item} placeholder={placeholder} onChange={e => { const a = [...ed[field]]; a[i] = e.target.value; setEd(p => ({ ...p, [field]: a })); }} style={{ ...inp, flex: 1 }} />
          <button style={rmBtn} onClick={() => setEd(p => ({ ...p, [field]: p[field].filter((_, j) => j !== i) }))}>×</button>
        </div>
      ))}
      <button style={addBtn(v.color)} onClick={() => setEd(p => ({ ...p, [field]: [...p[field], ""] }))}>+ Add</button>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(500px, 92vw)", maxHeight: "88vh", overflowY: "auto",
        background: "#fff", borderRadius: 16, zIndex: 201,
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{ background: v.color, borderRadius: "16px 16px 0 0", padding: "20px 22px 16px", color: "#fff", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{v.emoji}</div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px" }}>{vendor}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>{v.location}</div>
          {v.phone && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 1 }}>{v.phone}</div>}
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          {/* Edit toggle */}
          {!isEditing ? (
            <button onClick={startEdit} style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: `1px solid ${v.color}50`, background: `${v.color}12`, color: v.color, cursor: "pointer", marginBottom: 16 }}>
              Edit vendor info
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={saveEdit} style={{ fontSize: 11, fontWeight: 700, padding: "6px 16px", borderRadius: 6, border: "none", background: "#2E7D32", color: "#fff", cursor: "pointer" }}>Save changes</button>
              <button onClick={cancelEdit} style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#666", cursor: "pointer" }}>Cancel</button>
            </div>
          )}

          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div><div style={secLabel}>Location</div><input value={ed.location} onChange={e => setEd(p => ({ ...p, location: e.target.value }))} style={inp} /></div>
              <div><div style={secLabel}>Phone</div><input value={ed.phone} onChange={e => setEd(p => ({ ...p, phone: e.target.value }))} style={inp} /></div>
              <div><div style={secLabel}>Tags</div><EditList items={ed.tags} field="tags" placeholder="e.g. Vegetarian" /></div>
              <div>
                <div style={secLabel}>Hours</div>
                {ed.hours.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                    <input placeholder="Mon–Fri" value={h.day} onChange={e => { const a = ed.hours.map((x, j) => j === i ? { ...x, day: e.target.value } : x); setEd(p => ({ ...p, hours: a })); }} style={{ ...inp, flex: "0 0 110px" }} />
                    <input placeholder="9am–5pm" value={h.time} onChange={e => { const a = ed.hours.map((x, j) => j === i ? { ...x, time: e.target.value } : x); setEd(p => ({ ...p, hours: a })); }} style={{ ...inp, flex: 1 }} />
                    <button style={rmBtn} onClick={() => setEd(p => ({ ...p, hours: p.hours.filter((_, j) => j !== i) }))}>×</button>
                  </div>
                ))}
                <button style={addBtn(v.color)} onClick={() => setEd(p => ({ ...p, hours: [...p.hours, { day: "", time: "" }] }))}>+ Add row</button>
              </div>
              <div>
                <div style={secLabel}>Menu / What to order</div>
                <div style={{ fontSize: 10, color: "#aaa", marginBottom: 6 }}>Item name + price (e.g. $9)</div>
                {ed.menu.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                    <input value={item.name} placeholder="e.g. Tikka Masala burrito" onChange={e => { const a = [...ed.menu]; a[i] = { ...a[i], name: e.target.value }; setEd(p => ({ ...p, menu: a })); }} style={{ ...inp, flex: 1 }} />
                    <input value={item.price} placeholder="$0" onChange={e => { const a = [...ed.menu]; a[i] = { ...a[i], price: e.target.value }; setEd(p => ({ ...p, menu: a })); }} style={{ ...inp, flex: "none", width: 64 }} />
                    <button style={rmBtn} onClick={() => setEd(p => ({ ...p, menu: p.menu.filter((_, j) => j !== i) }))}>×</button>
                  </div>
                ))}
                <button style={addBtn(v.color)} onClick={() => setEd(p => ({ ...p, menu: [...p.menu, { name: "", price: "" }] }))}>+ Add item</button>
              </div>
              <div><div style={secLabel}>Deals &amp; notes</div><EditList items={ed.deals} field="deals" placeholder="e.g. Happy hour 3–5pm" /></div>
              <div><div style={secLabel}>Dietary</div><EditList items={ed.dietary} field="dietary" placeholder="e.g. Vegetarian" /></div>
              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <button onClick={saveEdit} style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: "8px", borderRadius: 8, border: "none", background: "#2E7D32", color: "#fff", cursor: "pointer" }}>Save changes</button>
                <button onClick={cancelEdit} style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#666", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {v.tags && v.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                  {v.tags.map(t => <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: `${v.color}18`, color: v.color, border: `1px solid ${v.color}30` }}>{t}</span>)}
                </div>
              )}
              {hours.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={secLabel}>Hours</div>
                  <div style={{ background: "#f7f7f5", borderRadius: 8, overflow: "hidden" }}>
                    {hours.map(([day, time], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: i < hours.length - 1 ? "1px solid #eee" : "none" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{day}</span>
                        <span style={{ fontSize: 12, color: "#555" }}>{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {menu.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={secLabel}>Menu</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {menu.map((m, i) => {
                      const item = typeof m === "string" ? { name: m, price: "" } : m;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: v.color, flexShrink: 0, marginTop: 6 }} />
                            <span style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{item.name}</span>
                          </div>
                          {item.price && <span style={{ fontSize: 12, fontWeight: 700, color: "#2E7D32", background: "#E8F5E9", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>{item.price}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {v.deals && v.deals.length > 0 && (
                <div style={{ marginBottom: v.dietary && v.dietary.length > 0 ? 16 : 0 }}>
                  <div style={secLabel}>Deals &amp; notes</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {v.deals.map((d, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: v.color, flexShrink: 0, marginTop: 5 }} />
                        <span style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {v.dietary && v.dietary.length > 0 && (
                <div>
                  <div style={secLabel}>Dietary</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {v.dietary.map(d => <span key={d} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#E8F5E9", color: "#2E7D32", border: "1px solid #C8E6C9" }}>{d}</span>)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── GOOGLE SHEETS SYNC ───

const SHEET_URL = "https://docs.google.com/spreadsheets/d/189P-4KRC1XBBMhVzUwDYKaWm0bf9xOcd/edit#gid=475468434";
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/189P-4KRC1XBBMhVzUwDYKaWm0bf9xOcd/gviz/tq?tqx=out:csv&sheet=Content%20Calendar";

const SHEET_SPOT_MAP = {
  "Zanzibar": "Zanzibar Café at The Loft",
  "Zanzibar + Su Pan": "Zanzibar Café at The Loft",
  "CurryUp Now": "Curry Up Now",
  "TapEx": "Tapioca Express",
  "Froyo": "Yogurt World",
  "Su Pan": "Su Pan Bakery",
  "Santorini": "Santorini Greek Island Grill",
  "POLL: Vote for Faves": "TBD",
  "Audience Pick #1": "TBD",
  "Audience Pick #2": "TBD",
  "Best-Of Roundup": "Multiple / Roundup",
  "Late Night Finals Ed.": "Multiple / Roundup",
  "Last Call": "Multiple / Roundup",
};

const SHEET_SERIES_MAP = { "Desserts & Coffee": "Desserts & Drinks" };

const SHEET_MONTH_MAP = { "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12 };

function parseSheetDate(str) {
  if (!str) return null;
  const parts = str.trim().split(" ");
  if (parts.length < 2) return null;
  const month = SHEET_MONTH_MAP[parts[0]];
  const day = parseInt(parts[1]);
  if (!month || isNaN(day)) return null;
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseSheetCSV(csv) {
  const lines = csv.split("\n").map(l => l.trim()).filter(Boolean);
  const posts = [];
  let nextId = 1;
  // Find the header row
  const headerIdx = lines.findIndex(l => l.toLowerCase().includes("post date") && l.toLowerCase().includes("series"));
  if (headerIdx < 0) return null;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim());
    if (!row[1] || !row[3] || !row[4]) continue; // skip rows without date/series/spot
    const date = parseSheetDate(row[1]);
    if (!date) continue;
    const rawSeries = row[3];
    const rawSpot = row[4];
    const series = SHEET_SERIES_MAP[rawSeries] || rawSeries;
    const spot = SHEET_SPOT_MAP[rawSpot] || rawSpot;
    if (!SERIES_LIST.includes(series)) continue; // skip non-post rows
    posts.push({
      id: nextId++,
      series, spot,
      order: row[5] || "",
      format: row[6] || "",
      hook: row[7] || "",
      cost: row[8] || "$0",
      date,
      ma: "", ma2: "", pa: "", pa2: "", done: false,
    });
  }
  return posts.length > 0 ? posts : null;
}

// ─── VENDOR DIRECTORY ───

const LOCATION_GROUPS = [
  { key: "Price Center", label: "Price Center", emoji: "🏢", color: "#1565C0", desc: "East & West" },
  { key: "Student Center", label: "Student Center", emoji: "🎓", color: "#2E7D32", desc: "" },
  { key: "Student Services Center", label: "Student Services Center", emoji: "🏛️", color: "#6A1B9A", desc: "" },
];

function getBuilding(location) {
  if (!location) return "Other";
  const l = location.toLowerCase();
  if (l.includes("price center")) return "Price Center";
  if (l.includes("student center")) return "Student Center";
  if (l.includes("student services")) return "Student Services Center";
  return "Other";
}

// ─── SUPABASE SYNC ───

const TABLE = "calendar";
const ROW_ID = 1;

async function fetchPosts() {
  const { data, error } = await supabase.from(TABLE).select("posts").eq("id", ROW_ID).single();
  if (error) { console.error("Fetch error:", error); return null; }
  if (!data || !data.posts || !Array.isArray(data.posts) || data.posts.length === 0) return null;
  return data.posts;
}

async function savePosts(posts) {
  const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, posts }, { onConflict: "id" });
  if (error) console.error("Save error:", error);
  else console.log("Saved", posts.length, "posts");
  pushToSheet("posts", posts);
}

const VENDOR_TABLE = "vendors";
const VENDOR_ROW_ID = 1;

async function fetchVendors() {
  const { data, error } = await supabase.from(VENDOR_TABLE).select("data").eq("id", VENDOR_ROW_ID).single();
  if (error || !data?.data || Object.keys(data.data).length === 0) return null;
  return data.data;
}

async function saveVendors(vendorData) {
  const { error } = await supabase.from(VENDOR_TABLE).upsert({ id: VENDOR_ROW_ID, data: vendorData }, { onConflict: "id" });
  if (error) console.error("Vendor save error:", error);
  pushToSheet("vendors", vendorData);
}

// Fire-and-forget push to Google Sheet via Apps Script web app
function pushToSheet(type, data) {
  const url = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!url) return; // not configured — skip silently
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, data }),
  }).catch(() => {}); // ignore errors — sheet sync is best-effort
}

// ─── MAIN APP ───

export default function App() {
  const [posts, setPosts] = useState(DEFAULT_POSTS);
  const [currentMonth, setCurrentMonth] = useState(3);
  const [selectedId, setSelectedId] = useState(null);
  const [activeVendor, setActiveVendor] = useState(null);
  const [vendors, setVendors] = useState(VENDORS_DEFAULT);
  const [view, setView] = useState("calendar");
  const [synced, setSynced] = useState(false);
  const [sheetSyncing, setSheetSyncing] = useState(false);
  const [sheetMsg, setSheetMsg] = useState(null);
  const saveTimer = useRef(null);
  const lastSavedJson = useRef("");
  const isRemoteUpdate = useRef(false);

  // Load from Supabase on mount + subscribe to real-time changes
  useEffect(() => {
    fetchPosts().then((data) => {
      if (data) {
        setPosts(data);
        lastSavedJson.current = JSON.stringify(data);
      } else {
        savePosts(DEFAULT_POSTS).then(() => {
          lastSavedJson.current = JSON.stringify(DEFAULT_POSTS);
        });
      }
      setSynced(true);
    });

    const channel = supabase
      .channel("calendar-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, (payload) => {
        const newPosts = payload.new?.posts;
        if (newPosts && Array.isArray(newPosts) && newPosts.length > 0) {
          const json = JSON.stringify(newPosts);
          if (json !== lastSavedJson.current) {
            isRemoteUpdate.current = true;
            lastSavedJson.current = json;
            setPosts(newPosts);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Save to Supabase when posts change locally
  useEffect(() => {
    if (!synced) return;
    if (isRemoteUpdate.current) { isRemoteUpdate.current = false; return; }

    const json = JSON.stringify(posts);
    if (json === lastSavedJson.current) return;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      lastSavedJson.current = json;
      savePosts(posts);
    }, 400);

    return () => clearTimeout(saveTimer.current);
  }, [posts, synced]);

  // Flush pending save when user leaves/refreshes
  useEffect(() => {
    const flush = () => {
      const json = JSON.stringify(posts);
      if (json !== lastSavedJson.current && synced) {
        lastSavedJson.current = json;
        navigator.sendBeacon && fetch(`${supabaseUrl}/rest/v1/${TABLE}?id=eq.${ROW_ID}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ posts }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [posts, synced]);

  // Load vendor data from Supabase + subscribe to real-time changes
  useEffect(() => {
    fetchVendors().then(data => {
      if (data) setVendors(data);
      else saveVendors(VENDORS_DEFAULT);
    });
    const channel = supabase
      .channel("vendor-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: VENDOR_TABLE }, payload => {
        const d = payload.new?.data;
        if (d && Object.keys(d).length > 0) setVendors(d);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateVendor = (name, data) => {
    const next = { ...vendors, [name]: data };
    setVendors(next);
    saveVendors(next);
  };

  const syncFromSheet = async () => {
    setSheetSyncing(true);
    setSheetMsg(null);
    try {
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv = await res.text();
      const imported = parseSheetCSV(csv);
      if (!imported) throw new Error("Could not parse sheet data");
      if (!window.confirm(`Import ${imported.length} posts from Google Sheet? This will replace current posts (assignments/done status won't be affected if you re-assign after).`)) {
        setSheetSyncing(false);
        return;
      }
      setPosts(imported);
      setSheetMsg(`✓ Imported ${imported.length} posts`);
    } catch (e) {
      console.error("Sheet sync error:", e);
      setSheetMsg("⚠ Could not fetch sheet — make sure it's shared as 'Anyone with the link'");
    }
    setSheetSyncing(false);
    setTimeout(() => setSheetMsg(null), 5000);
  };

  const updatePost = (id, key, val) => setPosts(prev => prev.map(p => p.id === id ? { ...p, [key]: val } : p));
  const deletePost = (id) => { setPosts(prev => prev.filter(p => p.id !== id)); if (selectedId === id) setSelectedId(null); };

  const addPostOnDate = (date) => {
    const newId = Math.max(0, ...posts.map(p => p.id)) + 1;
    setPosts(prev => [...prev, { id: newId, series: "Cheap Eats", spot: "TBD", order: "TBD", format: "Reel", hook: "", cost: "$0", date: fmtDate(date), ma: "", ma2: "", pa: "", pa2: "", done: false }]);
    setSelectedId(newId);
  };

  const resetAll = () => { setPosts(DEFAULT_POSTS); setSelectedId(null); };

  const selectedPost = posts.find(p => p.id === selectedId);
  const calDays = getCalendarDays(2026, currentMonth);
  const monthPosts = posts.filter(p => parseDate(p.date).getMonth() === currentMonth).sort((a, b) => a.date.localeCompare(b.date));
  const months = [3, 4, 5];
  const maCounts = {}; const paCounts = {};
  posts.forEach(p => { maCounts[p.ma] = (maCounts[p.ma]||0)+1; paCounts[p.pa] = (paCounts[p.pa]||0)+1; });

  const calRows = [];
  for (let i = 0; i < calDays.length; i += 7) calRows.push(calDays.slice(i, i + 7));

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#FAFAF8", minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>PC Plates</h1>
            <span style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>Spring 2026 · @ucsdcenters</span>
            <span style={{ fontSize: 10, color: synced ? "#2E7D32" : "#999", fontWeight: 600 }}>{synced ? "● Synced" : "○ Connecting..."}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a href={SHEET_URL} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8,
              border: "1px solid #1E88E5", background: "#E3F2FD", color: "#1565C0",
              fontSize: 11, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
            }}>📊 Google Sheet</a>
            <button onClick={syncFromSheet} disabled={sheetSyncing} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8,
              border: "1px solid #ddd", background: sheetSyncing ? "#f5f5f5" : "#fff", color: sheetSyncing ? "#aaa" : "#555",
              fontSize: 11, fontWeight: 600, cursor: sheetSyncing ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>{sheetSyncing ? "⏳ Syncing…" : "↓ Import from Sheet"}</button>
            {sheetMsg && <span style={{ fontSize: 11, color: sheetMsg.startsWith("✓") ? "#2E7D32" : "#E65100", fontWeight: 600 }}>{sheetMsg}</span>}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#777", margin: "4px 0 12px" }}>
          {posts.length} posts · Click a post to edit · Click an empty date to add · Changes sync live for everyone
        </p>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          {months.map(m => (
            <button key={m} onClick={() => setCurrentMonth(m)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
              background: currentMonth === m ? "#1a1a2e" : "#eee", color: currentMonth === m ? "#fff" : "#666",
            }}>
              {MONTHS[m]}
              <span style={{ background: currentMonth === m ? "rgba(255,255,255,0.2)" : "#ddd", borderRadius: 10, padding: "1px 6px", fontSize: 10, marginLeft: 5 }}>
                {posts.filter(p => parseDate(p.date).getMonth() === m).length}
              </span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {["calendar", "list", "vendors"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
              border: view === v ? "none" : "1px solid #ddd",
              background: view === v ? "#1a1a2e" : "#fff",
              color: view === v ? "#fff" : "#555",
            }}>
              {v === "calendar" ? "📅 Calendar" : v === "list" ? "📋 List" : "🏪 Vendors"}
            </button>
          ))}
          <button onClick={resetAll} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, background: "#fff", color: "#999",
          }}>Reset</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
          {Object.entries(SERIES_COLORS).map(([name, c]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 4, background: c.bg, borderRadius: 14, padding: "2px 9px", border: `1px solid ${c.accent}22` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.accent }} />
              <span style={{ fontSize: 9, color: c.accent, fontWeight: 600 }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === "calendar" && (
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", gap: 1,
            background: "#e0e0dc", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          }}>
            <div style={{ background: "#1a1a2e", padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Week</span>
            </div>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ background: "#1a1a2e", color: "#fff", textAlign: "center", padding: "8px 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>{d}</div>
            ))}
            {calRows.map((row, ri) => {
              const wk = getWeekLabel(row[0].date);
              const isMidterm = wk && wk.isMidterm;
              const isFinals = wk && wk.isFinals;
              return [
                <div key={`wk-${ri}`} style={{
                  background: isFinals ? "#FFF9C4" : isMidterm ? "#FFF0E0" : wk ? "#f0f0ee" : "#f8f8f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", padding: "4px 2px", borderRight: "2px solid #ccc",
                }}>
                  {wk && (<>
                    <span style={{ fontSize: wk.label === "FINALS" ? 8 : 10, fontWeight: 800, color: isFinals ? "#F57F17" : isMidterm ? "#E65100" : "#1a1a2e", letterSpacing: 0.5, lineHeight: 1.2 }}>{wk.label}</span>
                    {isMidterm && <span style={{ fontSize: 7, color: "#E65100", fontWeight: 600, marginTop: 1 }}>MIDTERM</span>}
                    {isFinals && wk.label !== "FINALS" && <span style={{ fontSize: 7, color: "#F57F17", fontWeight: 600, marginTop: 1 }}>FINALS</span>}
                  </>)}
                </div>,
                ...row.map(({ date, inMonth }, ci) => {
                  const dayPosts = posts.filter(p => sameDay(parseDate(p.date), date));
                  const isToday = sameDay(date, new Date());
                  const hasPosts = dayPosts.length > 0;
                  return (
                    <div key={`d-${ri}-${ci}`}
                      onClick={() => { if (!hasPosts && inMonth) addPostOnDate(date); }}
                      style={{
                        background: inMonth ? "#fff" : "#f5f5f3", minHeight: 90, padding: "4px 5px",
                        opacity: inMonth ? 1 : 0.35,
                        cursor: (!hasPosts && inMonth) ? "pointer" : "default",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => { if (!hasPosts && inMonth) e.currentTarget.style.background = "#f0fce8"; }}
                      onMouseLeave={e => { if (!hasPosts && inMonth) e.currentTarget.style.background = "#fff"; }}
                    >
                      <div style={{
                        fontSize: 11, fontWeight: isToday ? 700 : 500,
                        color: isToday ? "#fff" : inMonth ? "#1a1a2e" : "#aaa", marginBottom: 2,
                        background: isToday ? "#E65100" : "transparent",
                        width: isToday ? 20 : "auto", height: isToday ? 20 : "auto",
                        borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>{date.getDate()}</div>
                      {!hasPosts && inMonth && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 40, opacity: 0.25 }}>
                          <span style={{ fontSize: 18, color: "#aaa" }}>+</span>
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {dayPosts.map(p => {
                          const sc = SERIES_COLORS[p.series] || { bg: "#f5f5f5", accent: "#333" };
                          return (
                            <div key={p.id} style={{
                              background: sc.bg, borderLeft: `3px solid ${sc.accent}`, borderRadius: 4,
                              padding: "4px 5px 5px", fontSize: 9, color: sc.accent, fontWeight: 600,
                              fontFamily: "'DM Sans', sans-serif",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>
                                {p.done && <span style={{ color: "#2E7D32", fontWeight: 900, fontSize: 10, flexShrink: 0, lineHeight: 1 }}>✓</span>}
                                {vendors[p.spot] && (
                                  <button onClick={(e) => { e.stopPropagation(); setActiveVendor(p.spot); }} title="Vendor details" style={{
                                    background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 10, lineHeight: 1, flexShrink: 0,
                                  }}>{vendors[p.spot].emoji}</button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); }} style={{
                                  background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 9, color: sc.accent, fontWeight: 600,
                                  fontFamily: "'DM Sans', sans-serif", textAlign: "left", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1, minWidth: 0,
                                }}>
                                  {p.spot === "TBD" ? "TBD" : p.spot.length > 13 ? p.spot.slice(0,11) + "…" : p.spot}
                                </button>
                              </div>
                              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                                <PersonDot name={p.ma} colorMap={MA_COLORS} size={16} fontSize={6} />
                                <PersonDot name={p.ma2} colorMap={MA_COLORS} size={16} fontSize={6} />
                                <PersonDot name={p.pa} colorMap={PA_COLORS} size={16} fontSize={6} />
                                <PersonDot name={p.pa2} colorMap={PA_COLORS} size={16} fontSize={6} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ];
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>{MONTHS[currentMonth]} — {monthPosts.length} posts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {monthPosts.map(p => {
              const c = SERIES_COLORS[p.series] || { bg: "#f5f5f5", accent: "#333" };
              const d = parseDate(p.date);
              return (
                <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  background: p.done ? "#F1F8E9" : "#fff",
                  border: `1px solid ${p.done ? "#C8E6C9" : "#eee"}`,
                  borderLeft: `4px solid ${p.done ? "#2E7D32" : c.accent}`,
                  borderRadius: 8, cursor: "pointer",
                }}>
                  <button onClick={(e) => { e.stopPropagation(); updatePost(p.id, "done", !p.done); }} title={p.done ? "Mark undone" : "Mark done"} style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${p.done ? "#2E7D32" : "#ccc"}`,
                    background: p.done ? "#2E7D32" : "#fff",
                    color: p.done ? "#fff" : "#ccc",
                    cursor: "pointer", fontSize: 13, fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>✓</button>
                  <div style={{ minWidth: 40, textAlign: "center", color: c.accent, background: c.bg, borderRadius: 6, padding: "5px 4px", fontWeight: 700, fontSize: 11, lineHeight: 1.2 }}>
                    <div style={{ fontSize: 15 }}>{d.getDate()}</div>
                    <div style={{ fontSize: 8, textTransform: "uppercase" }}>{DAYS_SHORT[d.getDay()]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {vendors[p.spot] && <span style={{ fontSize: 14 }}>{vendors[p.spot].emoji}</span>}
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", textDecoration: p.done ? "line-through" : "none", opacity: p.done ? 0.6 : 1 }}>{p.spot}</span>
                      {vendors[p.spot] && (
                        <button onClick={(e) => { e.stopPropagation(); setActiveVendor(p.spot); }} title="Vendor details" style={{
                          fontSize: 10, color: "#aaa", background: "none", border: "none", cursor: "pointer", padding: "0 2px",
                        }}>ℹ</button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{p.order}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <PersonDot name={p.ma} colorMap={MA_COLORS} size={22} fontSize={8} />
                    <PersonDot name={p.ma2} colorMap={MA_COLORS} size={22} fontSize={8} />
                    <PersonDot name={p.pa} colorMap={PA_COLORS} size={22} fontSize={8} />
                    <PersonDot name={p.pa2} colorMap={PA_COLORS} size={22} fontSize={8} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: c.accent, background: c.bg, borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>{p.series}</div>
                  <div style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>{p.cost}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VENDORS VIEW */}
      {view === "vendors" && (() => {
        const grouped = {};
        LOCATION_GROUPS.forEach(g => { grouped[g.key] = []; });
        Object.entries(vendors).forEach(([name, v]) => {
          if (name === "TBD" || name === "Multiple / Roundup") return;
          const building = getBuilding(v.location || "");
          if (grouped[building]) grouped[building].push({ name, ...v });
        });
        return (
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
                University Centers — {Object.values(grouped).flat().length} vendors
              </h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "start" }}>
              {LOCATION_GROUPS.map(group => {
                const list = grouped[group.key] || [];
                return (
                  <div key={group.key} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #eee" }}>
                    <div style={{ background: group.color, padding: "14px 18px", color: "#fff" }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{group.emoji}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.2px" }}>{group.label}</div>
                      {group.desc && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>{group.desc}</div>}
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{list.length} vendors</div>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      {list.sort((a, b) => a.name.localeCompare(b.name)).map((v, i) => {
                        const postCount = posts.filter(p => p.spot === v.name).length;
                        const doneCount = posts.filter(p => p.spot === v.name && p.done).length;
                        const firstHours = Object.entries(v.hours || {})[0];
                        return (
                          <div key={v.name}
                            onClick={() => setActiveVendor(v.name)}
                            style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                              cursor: "pointer", transition: "background 0.12s",
                              borderBottom: i < list.length - 1 ? "1px solid #f0f0ee" : "none",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fafaf8"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{
                              width: 38, height: 38, borderRadius: 10, background: `${v.color}18`,
                              border: `1.5px solid ${v.color}40`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 20, flexShrink: 0,
                            }}>{v.emoji}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                              <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>
                                {firstHours ? `${firstHours[0]}: ${firstHours[1]}` : v.location}
                              </div>
                              {v.tags && v.tags.length > 0 && (
                                <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                                  {v.tags.slice(0, 3).map(t => (
                                    <span key={t} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: `${v.color}15`, color: v.color, fontWeight: 600, border: `1px solid ${v.color}25` }}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                              {postCount > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: doneCount === postCount ? "#2E7D32" : v.color, background: doneCount === postCount ? "#E8F5E9" : `${v.color}15`, borderRadius: 8, padding: "2px 7px" }}>
                                    {doneCount === postCount && postCount > 0 ? "✓ Done" : `${doneCount}/${postCount} posts`}
                                  </span>
                                </div>
                              )}
                              <span style={{ fontSize: 16, color: "#ccc" }}>›</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Roster */}
      <div style={{ maxWidth: 1000, margin: "24px auto 40px" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>Roster</h3>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Marketing Assistants</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MAs.map(n => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8f8f6", borderRadius: 8, padding: "5px 10px 5px 6px" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: MA_COLORS[n], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{n.charAt(0)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e" }}>{n}</span>
                  <span style={{ background: MA_COLORS[n], color: "#fff", borderRadius: 8, padding: "0 6px", fontSize: 9, fontWeight: 700 }}>{maCounts[n]||0}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Photography Assistants</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PAs.map(n => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8f8f6", borderRadius: 8, padding: "5px 10px 5px 6px" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: PA_COLORS[n], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{n.charAt(0)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e" }}>{n}</span>
                  <span style={{ background: PA_COLORS[n], color: "#fff", borderRadius: 8, padding: "0 6px", fontSize: 9, fontWeight: 700 }}>{paCounts[n]||0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedPost && !activeVendor && <div onClick={() => setSelectedId(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 99 }} />}
      <EditPanel post={selectedPost} onClose={() => setSelectedId(null)} onUpdate={updatePost} onDelete={deletePost} onVendorClick={setActiveVendor} vendors={vendors} />
      {activeVendor && <VendorPanel vendor={activeVendor} vendorData={vendors[activeVendor]} onClose={() => setActiveVendor(null)} onUpdate={(data) => updateVendor(activeVendor, data)} />}
    </div>
  );
}
