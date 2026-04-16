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
  "Campus Bites": { bg: "#E0F7FA", accent: "#00838F" },
};
const SERIES_LIST = Object.keys(SERIES_COLORS);

const STATUS_OPTIONS = ["scheduled", "recorded", "posted"];
const STATUS_COLORS = {
  scheduled:  { bg: "#E3F2FD", text: "#1565C0", dot: "#1565C0" },
  recorded:   { bg: "#FFF3E0", text: "#E65100", dot: "#E65100" },
  posted:     { bg: "#E8F5E9", text: "#2E7D32", dot: "#2E7D32" },
};
// Map old status values to the new 3-option set
function normalizeStatus(s) {
  if (s === "posted") return "posted";
  if (s === "recorded" || s === "editing") return "recorded";
  return "scheduled"; // idea, scheduled, undefined → scheduled
}


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
  { id: 1, series: "Breakfast at PC", spot: "Santorini Greek Island Grill", order: "Breakfast burrito", format: "Reel: morning pickup POV", hook: "You have a 9am. You're already at PC. Stop skipping breakfast.", cost: "$8–10", foodDate: "2026-04-01", date: "2026-04-03", ma: "Dominik", pa: "Regine" },
  { id: 2, series: "Cheap Eats", spot: "Curry Up Now", order: "Most affordable bowl or combo", format: "Reel: things you didn't know you could get at PC", hook: "Curry Up Now has a full meal under $10 and nobody talks about it.", cost: "$8–10", foodDate: "2026-04-03", date: "2026-04-05", ma: "Isabella", pa: "Nadine" },
  { id: 3, series: "Breakfast at PC", spot: "Su Pan Bakery", order: "Concha + coffee combo", format: "Reel: cozy pastry close-ups", hook: "A concha and a cortado for less than your parking permit.", cost: "$6–8", foodDate: "2026-04-07", date: "2026-04-09", ma: "Siena", pa: "Leira" },
  { id: 4, series: "Cheap Eats", spot: "Taco Villa", order: "Burrito or plate under $9", format: "Reel: price reveal — guess the total", hook: "Name a better deal at PC. We'll wait.", cost: "$7–9", foodDate: "2026-04-09", date: "2026-04-11", ma: "Taniyah", pa: "Tobin" },
  { id: 5, series: "Desserts & Drinks", spot: "Zanzibar Café at The Loft", order: "Specialty coffee or espresso", format: "Reel: coffee pour shots, study break", hook: "Zanzibar makes real coffee and it's been right here the whole time.", cost: "$5–7", foodDate: "2026-04-11", date: "2026-04-13", ma: "Tina", pa: "Jodie" },
  { id: 6, series: "Cheap Eats", spot: "Tapioca Express", order: "Manager's special (reveal on camera)", format: "Reel: mystery order", hook: "We ordered the manager's special so you don't have to wonder.", cost: "$10–14", foodDate: "2026-04-14", date: "2026-04-16", ma: "Yaena", pa: "Aeron" },
  { id: 7, series: "Breakfast at PC", spot: "Taco Bell", order: "Breakfast Crunchwrap or combo", format: "Reel: speed-run breakfast under $5", hook: "Taco Bell breakfast is criminally underrated and you know it.", cost: "$4–6", foodDate: "2026-04-16", date: "2026-04-18", ma: "Jeanette", pa: "Justin" },
  { id: 8, series: "Desserts & Drinks", spot: "Yogurt World", order: "Custom froyo bowl", format: "Reel: topping build, satisfying swirl shots", hook: "Design your own dessert. It's called self-care.", cost: "$6–8", foodDate: "2026-04-18", date: "2026-04-20", ma: "Kaitlyn", pa: "Fuma" },
  { id: 9, series: "Late Night / Lock In", spot: "Taco Bell", order: "Late-night go-to order", format: "Reel: 10pm Geisel exit, walk to PC", hook: "It's 10pm. You just left Geisel. Taco Bell is still open.", cost: "$6–8", foodDate: "2026-04-21", date: "2026-04-23", ma: "Gerardo", pa: "Matthew" },
  { id: 10, series: "Cheap Eats", spot: "Zanzibar Café at The Loft", order: "Happy hour menu item", format: "Reel: happy hour spotlight, midterm refuel", hook: "Midterm brain needs real food. Zanzibar happy hour. Go.", cost: "$8–12", foodDate: "2026-04-23", date: "2026-04-25", ma: "Amber", pa: "Regine" },
  { id: 11, series: "Desserts & Drinks", spot: "Su Pan Bakery", order: "Coffee + sweet bread for late study", format: "Reel: 8pm pan dulce run, study fuel", hook: "Su Pan coffee and a concha is the midterm survival kit nobody told you about.", cost: "$6–9", foodDate: "2026-04-25", date: "2026-04-27", ma: "Jennifer", pa: "Nadine" },
  { id: 12, series: "Late Night / Lock In", spot: "Subway", order: "Custom sub, late-night build", format: "Reel: building the perfect study sub", hook: "Subway at 9pm hits different when you've been studying since noon.", cost: "$8–10", foodDate: "2026-05-01", date: "2026-05-03", ma: "Talia", pa: "Leira" },
  { id: 13, series: "Cheap Eats", spot: "Croutons", order: "$6.99 Friday panini", format: "Reel: Friday-only deal reveal", hook: "You survived midterms (almost). $6.99 panini. You've earned it.", cost: "$7–8", foodDate: "2026-05-03", date: "2026-05-05", ma: "Kiana", pa: "Tobin" },
  { id: 14, series: "Late Night / Lock In", spot: "Burger King", order: "Late-night value combo", format: "Reel: BK after dark, post-midterm reward", hook: "Midterms are done. Burger King after dark. No judgment zone.", cost: "$6–9", foodDate: "2026-05-05", date: "2026-05-07", ma: "Andy", pa: "Jodie" },
  { id: 15, series: "Breakfast at PC", spot: "Shores Diner", order: "Coffee + breakfast plate", format: "Reel: classic diner morning", hook: "Shores has full diner breakfast energy and you've been walking past it.", cost: "$8–11", foodDate: "2026-05-07", date: "2026-05-09", ma: "Leandro", pa: "Aeron" },
  { id: 16, series: "Cheap Eats", spot: "Dirty Birds", order: "Wings split with a friend ($7 each)", format: "Reel: buddy meal, celebration", hook: "Midterms are over. Grab a friend. Split wings. $7 each.", cost: "$14", foodDate: "2026-05-09", date: "2026-05-11", ma: "Amané", pa: "Justin" },
  { id: 17, series: "Breakfast at PC", spot: "Taco Villa", order: "Breakfast burrito", format: "Reel: breakfast burrito bracket", hook: "Two breakfast burritos enter. One leaves. (Just kidding, eat both.)", cost: "$7–9", foodDate: "2026-05-12", date: "2026-05-14", ma: "Dominik", pa: "Fuma" },
  { id: 18, series: "Desserts & Drinks", spot: "Shores Diner", order: "Coffee + pie or dessert", format: "Reel: afternoon diner vibes", hook: "Shores Diner has pie and nobody ever talks about it.", cost: "$6–8", foodDate: "2026-05-14", date: "2026-05-16", ma: "Isabella", pa: "Matthew" },
  { id: 19, series: "Cheap Eats", spot: "Taco Bell", order: "Value menu meal under $7", format: "Reel: $5 challenge", hook: "We built a full Taco Bell meal for less than your iced latte.", cost: "$5–7", foodDate: "2026-05-19", date: "2026-05-21", ma: "Siena", pa: "Regine" },
  { id: 20, series: "Desserts & Drinks", spot: "Su Pan Bakery", order: "Pan dulce taste test", format: "Reel: ranking every pastry", hook: "Ranking every pastry at Su Pan so you don't have to guess.", cost: "$6–9", foodDate: "2026-05-21", date: "2026-05-23", ma: "Taniyah", pa: "Nadine" },
  { id: 21, series: "Fan Favorites", spot: "TBD", order: "Audience vote — which spot to revisit?", format: "Story poll + carousel recap", hook: "You've seen them all. Now you pick. Vote for our Season Finale.", cost: "$0", foodDate: "2026-05-23", date: "2026-05-25", ma: "Tina", pa: "Leira" },
  { id: 22, series: "Fan Favorites", spot: "TBD", order: "Top voted spot — revisit with new order", format: "Reel: You voted, we ate", hook: "The people spoke. We're back trying something new.", cost: "$10–14", foodDate: "2026-05-27", date: "2026-05-29", ma: "Yaena", pa: "Tobin" },
  { id: 23, series: "Fan Favorites", spot: "TBD", order: "Runner-up spot — different angle", format: "Reel: second chance", hook: "Runner-up round. We owed this spot a second visit.", cost: "$10–14", foodDate: "2026-05-29", date: "2026-05-31", ma: "Jeanette", pa: "Jodie" },
  { id: 24, series: "Late Night / Lock In", spot: "Taco Bell", order: "Late-night finals order + hours", format: "Reel: Finals lock-in starts now", hook: "Finals week is here. Taco Bell is still open. Let's lock in.", cost: "$6–8", foodDate: "2026-06-02", date: "2026-06-04", ma: "Kaitlyn", pa: "Aeron" },
  { id: 25, series: "Late Night / Lock In", spot: "Subway", order: "Custom finals sub build", format: "Reel: Build your finals fuel", hook: "Build the sub. Hit the books. You've got this.", cost: "$8–10", foodDate: "2026-06-04", date: "2026-06-06", ma: "Gerardo", pa: "Justin" },
  { id: 26, series: "Desserts & Drinks", spot: "Zanzibar Café at The Loft", order: "Coffee crawl — caffeine ranking", format: "Reel: Ranking every coffee at PC for finals", hook: "Finals caffeine tier list. You need this.", cost: "$10–14", foodDate: "2026-06-06", date: "2026-06-08", ma: "Amber", pa: "Fuma" },
  { id: 27, series: "Finals Fuel", spot: "Multiple / Roundup", order: "Top cheap eats + caffeine + late night", format: "Carousel: finals survival guide", hook: "Finals fuel guide — every cheap eat, late bite, and caffeine hit at PC.", cost: "$0", foodDate: "2026-06-08", date: "2026-06-10", ma: "Jennifer", pa: "Matthew" },
  { id: 28, series: "Finals Fuel", spot: "Multiple / Roundup", order: "Late-night spots + finals hours", format: "Reel: Still open during finals", hook: "It's finals. These spots are still open. You're welcome.", cost: "$0", foodDate: "2026-06-10", date: "2026-06-12", ma: "Talia", pa: "Regine" },
  { id: 29, series: "Finals Fuel", spot: "Multiple / Roundup", order: "Final post — thank you + summer tease", format: "Reel/Carousel: season wrap", hook: "That's a wrap on PC Plates. Thanks for eating with us.", cost: "$0", foodDate: "2026-06-12", date: "2026-06-14", ma: "Kiana", pa: "Nadine" },
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
function parseCost(str) {
  if (!str) return 0;
  const nums = (str.match(/\d+(\.\d+)?/g) || []).map(Number);
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function isDueSoon(p) {
  if (normalizeStatus(p.status) !== "scheduled") return false;
  const fd = p.foodDate || p.date;
  if (!fd) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = parseDate(fd);
  const diff = (d - today) / 86400000;
  return diff >= 0 && diff <= 7;
}

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

function EditPanel({ post, onClose, onUpdate, onDelete, onDuplicate, onVendorClick, vendors, onPrev, onNext }) {
  const [copied, setCopied] = useState(false);
  if (!post) return null;
  const c = SERIES_COLORS[post.series] || { bg: "#f5f5f5", accent: "#333" };
  const update = (key, val) => onUpdate(post.id, key, val);
  const week = getWeekFromDate(post.date);
  const copyHook = () => {
    if (!post.hook) return;
    navigator.clipboard.writeText(post.hook).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: Math.min(420, window.innerWidth * 0.94),
      background: "#fff", boxShadow: "-8px 0 30px rgba(0,0,0,0.15)", zIndex: 100,
      display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif",
      overflow: "auto", animation: "slideIn 0.25s ease-out",
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div style={{ background: c.accent, padding: "22px 20px 16px", color: "#fff" }}>
        {(onPrev || onNext) && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={onPrev} disabled={!onPrev} style={{ background: onPrev ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)", border: "none", color: onPrev ? "#fff" : "rgba(255,255,255,0.3)", borderRadius: 6, padding: "3px 10px", cursor: onPrev ? "pointer" : "default", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>‹ Prev</button>
            <button onClick={onNext} disabled={!onNext} style={{ background: onNext ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)", border: "none", color: onNext ? "#fff" : "rgba(255,255,255,0.3)", borderRadius: 6, padding: "3px 10px", cursor: onNext ? "pointer" : "default", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Next ›</button>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
              {week === "F" ? "Finals Week" : week === "—" ? "No Quarter Week" : `Week ${week}`} · {post.series}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{post.spot}</div>
              {isDueSoon(post) && <span title="Food date within 7 days — still scheduled!" style={{ fontSize: 11, background: "rgba(255,255,255,0.9)", color: "#E65100", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>⚡ Due soon</span>}
            </div>
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
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Label>Record Food Date</Label>
            <input type="date" value={post.foodDate || ""} onChange={e => {
              const fd = e.target.value;
              update("foodDate", fd);
              if (fd) {
                const d = new Date(fd + "T00:00:00");
                d.setDate(d.getDate() + 2);
                update("date", fmtDate(d));
              }
            }} style={{
              border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px", fontSize: 12,
              fontFamily: "'DM Sans', sans-serif", width: "100%",
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <Label>Post Date</Label>
            <input type="date" value={post.date} onChange={e => update("date", e.target.value)} style={{
              border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px", fontSize: 12,
              fontFamily: "'DM Sans', sans-serif", width: "100%",
            }} />
          </div>
        </div>
        <div><Label>Series</Label><Select value={post.series} options={SERIES_LIST} onChange={v => update("series", v)} /></div>
        <div>
          <Label>Vendor</Label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Select value={post.spot} options={Object.keys(vendors || {}).filter(k => k !== "__new__").sort()} onChange={v => update("spot", v)} style={{ flex: 1 }} />
            {vendors && vendors[post.spot] && (
              <button onClick={() => onVendorClick(post.spot)} title="View vendor details" style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 6, border: "1px solid #ddd",
                background: "#f5f5f5", cursor: "pointer", fontSize: 14, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>ℹ</button>
            )}
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {STATUS_OPTIONS.map(s => {
              const sc = STATUS_COLORS[s];
              const active = (normalizeStatus(post.status)) === s;
              return (
                <button key={s} onClick={() => update("status", s)} style={{
                  padding: "4px 10px", borderRadius: 20, border: `1px solid ${active ? sc.dot : "#ddd"}`,
                  background: active ? sc.bg : "#fff", color: active ? sc.text : "#aaa",
                  fontWeight: active ? 700 : 500, fontSize: 11, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize",
                }}>{s}</button>
              );
            })}
          </div>
        </div>
        <div><Label>What to Order</Label><EditableText value={post.order} onChange={v => update("order", v)} /></div>
        <div><Label>Content Format</Label><EditableText value={post.format} onChange={v => update("format", v)} /></div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <Label>Caption Hook</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: (post.hook||"").length > 2000 ? "#e53935" : "#aaa" }}>{(post.hook||"").length}/2200</span>
              <button onClick={copyHook} title="Copy to clipboard" style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, border: "1px solid #ddd", background: copied ? "#E8F5E9" : "#f5f5f5", color: copied ? "#2E7D32" : "#888", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{copied ? "✓ Copied" : "Copy"}</button>
            </div>
          </div>
          <EditableText value={post.hook} onChange={v => update("hook", v)} multiline />
        </div>
        <div><Label>Est. Budget</Label><EditableText value={post.cost} onChange={v => update("cost", v)} /></div>
        <div>
          <Label>Instagram URL</Label>
          <EditableText value={post.igUrl || ""} onChange={v => update("igUrl", v)} style={{ fontSize: 11 }} />
        </div>
        <div><Label>Notes</Label><EditableText value={post.notes || ""} onChange={v => update("notes", v)} multiline style={{ minHeight: 48 }} /></div>
        {vendors && vendors[post.spot]?.website && (
          <a href={vendors[post.spot].website} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#1565C0",
            textDecoration: "none", fontWeight: 600,
          }}>🔗 {post.spot} website</a>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={() => { onDuplicate(post); onClose(); }} style={{
            flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ddd",
            background: "#fff", color: "#555", fontWeight: 600, fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>⧉ Duplicate</button>
          <button onClick={() => { onDelete(post.id); onClose(); }} style={{
            flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e53935",
            background: "#fff", color: "#e53935", fontWeight: 600, fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function VendorPanel({ vendor, vendorData, onClose, onUpdate, isNew, onCreateVendor, posts }) {
  const [isEditing, setIsEditing] = useState(isNew || false);
  const [ed, setEd] = useState(() => isNew ? {
    name: "", emoji: "🍽️", color: "#888888", website: "",
    location: "", phone: "", tags: [], hours: [], menu: [], deals: [], dietary: [],
  } : null);

  if (!isNew && !vendorData) return null;
  const v = vendorData || { emoji: "🍽️", color: "#888888", location: "", phone: "", tags: [], menu: [], deals: [], dietary: [], hours: {}, website: "" };
  const hours = Object.entries(v.hours || {});
  const menu = v.menu || [];

  const startEdit = () => {
    setEd({
      name: vendor,
      emoji: v.emoji || "🍽️",
      color: v.color || "#888888",
      website: v.website || "",
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

  const cancelEdit = () => {
    if (isNew) { onClose(); return; }
    setIsEditing(false);
    setEd(null);
  };

  const saveEdit = () => {
    const data = {
      ...v,
      emoji: ed.emoji || v.emoji,
      color: ed.color || v.color,
      website: ed.website || "",
      location: ed.location,
      phone: ed.phone,
      tags: ed.tags.filter(t => t.trim()),
      hours: Object.fromEntries(ed.hours.filter(h => h.day.trim()).map(h => [h.day, h.time])),
      menu: ed.menu.filter(m => (m.name || "").trim()),
      deals: ed.deals.filter(d => d.trim()),
      dietary: ed.dietary.filter(d => d.trim()),
    };
    if (isNew) {
      onCreateVendor(ed.name.trim() || "New Vendor", data);
      return;
    }
    onUpdate(data);
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
        <div style={{ background: (isNew && ed ? ed.color : null) || v.color, borderRadius: "16px 16px 0 0", padding: "20px 22px 16px", color: "#fff", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{isNew && ed ? (ed.emoji || "🍽️") : v.emoji}</div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px" }}>{isNew ? (ed?.name || "New Vendor") : vendor}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>{isNew && ed ? ed.location : v.location}</div>
          {!isNew && v.phone && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 1 }}>{v.phone}</div>}
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
              {isNew && (
                <>
                  <div><div style={secLabel}>Vendor Name</div><input value={ed.name} onChange={e => setEd(p => ({ ...p, name: e.target.value }))} style={inp} placeholder="e.g. Taco Villa" autoFocus /></div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}><div style={secLabel}>Emoji</div><input value={ed.emoji} onChange={e => setEd(p => ({ ...p, emoji: e.target.value }))} style={{ ...inp, width: 70 }} placeholder="🍽️" /></div>
                    <div style={{ flex: 1 }}><div style={secLabel}>Color</div><input type="color" value={ed.color} onChange={e => setEd(p => ({ ...p, color: e.target.value }))} style={{ height: 34, width: 70, border: "1px solid #ddd", borderRadius: 6, padding: 2, cursor: "pointer" }} /></div>
                  </div>
                </>
              )}
              <div><div style={secLabel}>Location</div><input value={ed.location} onChange={e => setEd(p => ({ ...p, location: e.target.value }))} style={inp} /></div>
              <div><div style={secLabel}>Phone</div><input value={ed.phone} onChange={e => setEd(p => ({ ...p, phone: e.target.value }))} style={inp} /></div>
              <div><div style={secLabel}>Website</div><input value={ed.website || ""} onChange={e => setEd(p => ({ ...p, website: e.target.value }))} style={inp} placeholder="https://" /></div>
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
              {v.website && (
                <div style={{ marginTop: 14 }}>
                  <a href={v.website} target="_blank" rel="noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
                    color: v.color, fontWeight: 600, textDecoration: "none",
                    border: `1px solid ${v.color}40`, borderRadius: 8, padding: "5px 12px",
                    background: `${v.color}0d`,
                  }}>🔗 Visit website</a>
                </div>
              )}
              {posts && (() => {
                const vPosts = posts.filter(p => p.spot === vendor).sort((a, b) => (a.foodDate || a.date).localeCompare(b.foodDate || b.date));
                if (!vPosts.length) return null;
                return (
                  <div style={{ marginTop: 18, borderTop: "1px solid #f0f0ee", paddingTop: 16 }}>
                    <div style={secLabel}>Posts ({vPosts.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {vPosts.map(p => {
                        const sc = STATUS_COLORS[normalizeStatus(p.status)];
                        const sc2 = SERIES_COLORS[p.series] || { bg: "#f5f5f5", accent: "#999" };
                        return (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#f7f7f5", borderRadius: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc2.accent, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.series}</div>
                              <div style={{ fontSize: 10, color: "#999" }}>Food: {p.foodDate || p.date}{p.date ? ` · Post: ${p.date}` : ""}</div>
                            </div>
                            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, background: sc.bg, color: sc.text, fontWeight: 700, textTransform: "capitalize", flexShrink: 0 }}>{normalizeStatus(p.status)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── GOOGLE SHEETS SYNC ───

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1RnahZx1wlVx9fD21fARrjyIIAC60OXCHC87M7jP727k/edit#gid=475468434";
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1RnahZx1wlVx9fD21fARrjyIIAC60OXCHC87M7jP727k/gviz/tq?tqx=out:csv&sheet=Content%20Calendar";

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
  // Return { posts, existed } so callers know whether the row exists vs had an error
  if (error && error.code !== "PGRST116") { console.error("Fetch error:", error); return { posts: null, existed: true }; }
  if (!data || !data.posts || !Array.isArray(data.posts) || data.posts.length === 0) return { posts: null, existed: false };
  return { posts: data.posts, existed: true };
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

function migrateFoodDates(posts) {
  let changed = false;
  const migrated = posts.map(p => {
    if (!p.foodDate && p.date) {
      changed = true;
      const pd = parseDate(p.date);
      pd.setDate(pd.getDate() + 2);
      return { ...p, foodDate: p.date, date: fmtDate(pd) };
    }
    return p;
  });
  return { migrated, changed };
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
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [dragOverListId, setDragOverListId] = useState(null);
  const [filterSeries, setFilterSeries] = useState("");
  const [filterPerson, setFilterPerson] = useState("");
  const [undoStack, setUndoStack] = useState(null); // { posts, msg }
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [currentWeekSun, setCurrentWeekSun] = useState(() => {
    const today = new Date(); const d = new Date(today);
    d.setDate(today.getDate() - today.getDay()); d.setHours(0,0,0,0); return d;
  });
  const [compact, setCompact] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [calendarStatusView, setCalendarStatusView] = useState("all");
  const undoTimer = useRef(null);
  const saveTimer = useRef(null);
  const lastSavedJson = useRef("");
  const isRemoteUpdate = useRef(false);

  // Load from Supabase on mount + subscribe to real-time changes
  useEffect(() => {
    fetchPosts().then(({ posts: data, existed }) => {
      if (data) {
        const { migrated, changed } = migrateFoodDates(data);
        setPosts(migrated);
        lastSavedJson.current = JSON.stringify(migrated);
        if (changed) savePosts(migrated);
      } else if (!existed) {
        // Only seed defaults if the row genuinely doesn't exist yet (first-time setup)
        savePosts(DEFAULT_POSTS).then(() => {
          lastSavedJson.current = JSON.stringify(DEFAULT_POSTS);
        });
      }
      // If existed but data was null/error, keep showing current state without overwriting
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "Escape") {
        if (activeVendor) { setActiveVendor(null); setCreatingVendor(false); }
        else if (selectedId) setSelectedId(null);
        else if (filterSeries || filterPerson || filterStatus || searchQuery) { setFilterSeries(""); setFilterPerson(""); setFilterStatus(""); setSearchQuery(""); }
      }
      if (e.key === "ArrowLeft") {
        if (view === "week") { setCurrentWeekSun(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; }); }
        else setCurrentMonth(m => Math.max(3, m - 1));
      }
      if (e.key === "ArrowRight") {
        if (view === "week") { setCurrentWeekSun(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; }); }
        else setCurrentMonth(m => Math.min(5, m + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeVendor, selectedId, filterSeries, filterPerson, filterStatus, searchQuery, view]);

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

  const deletePost = (id) => {
    const snapshot = posts;
    const deleted = posts.find(p => p.id === id);
    setPosts(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    clearTimeout(undoTimer.current);
    setUndoStack({ posts: snapshot, msg: `Deleted "${deleted?.spot || "post"}"` });
    undoTimer.current = setTimeout(() => setUndoStack(null), 6000);
  };

  const undo = () => {
    if (!undoStack) return;
    setPosts(undoStack.posts);
    clearTimeout(undoTimer.current);
    setUndoStack(null);
  };

  const duplicatePost = (post) => {
    const newId = Math.max(0, ...posts.map(p => p.id)) + 1;
    const fd = post.foodDate || post.date;
    const pd = fd ? (() => { const d = new Date(fd + "T00:00:00"); d.setDate(d.getDate() + 2); return fmtDate(d); })() : post.date;
    const clone = { ...post, id: newId, foodDate: fd, date: pd, done: false, status: "scheduled", notes: "" };
    setPosts(prev => [...prev, clone]);
    setSelectedId(newId);
  };

  const addVendor = () => {
    setVendors(prev => ({
      ...prev,
      "__new__": { emoji: "🍽️", color: "#888888", location: "", phone: "", website: "", hours: {}, tags: [], deals: [], dietary: [], menu: [] },
    }));
    setActiveVendor("__new__");
    setCreatingVendor(true);
  };

  const createVendor = (name, data) => {
    setVendors(prev => {
      const next = { ...prev };
      delete next["__new__"];
      next[name] = data;
      return next;
    });
    setActiveVendor(null);
    setCreatingVendor(false);
  };

  const dropOnDate = (postId, date) => {
    const fd = fmtDate(date);
    const pd = new Date(date); pd.setDate(pd.getDate() + 2);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, foodDate: fd, date: fmtDate(pd) } : p));
  };

  const dropOnListItem = (draggedId, targetId) => {
    if (draggedId === targetId) return;
    setPosts(prev => {
      const dragged = prev.find(p => p.id === draggedId);
      const target = prev.find(p => p.id === targetId);
      if (!dragged || !target) return prev;
      return prev.map(p => {
        if (p.id === draggedId) return { ...p, foodDate: target.foodDate, date: target.date };
        if (p.id === targetId) return { ...p, foodDate: dragged.foodDate, date: dragged.date };
        return p;
      });
    });
  };

  const addPostOnDate = (date) => {
    const newId = Math.max(0, ...posts.map(p => p.id)) + 1;
    setPosts(prev => [...prev, { id: newId, series: "Cheap Eats", spot: "TBD", order: "TBD", format: "Reel", hook: "", cost: "$0", date: "", foodDate: fmtDate(date), ma: "", ma2: "", pa: "", pa2: "", done: false, status: "scheduled", notes: "" }]);
    setSelectedId(newId);
  };

  const resetAll = () => { setPosts(DEFAULT_POSTS); setSelectedId(null); };

  const selectedPost = posts.find(p => p.id === selectedId);
  const calDays = getCalendarDays(2026, currentMonth);

  const applyFilters = (list) => list.filter(p => {
    if (filterSeries && p.series !== filterSeries) return false;
    if (filterPerson && p.ma !== filterPerson && p.ma2 !== filterPerson && p.pa !== filterPerson && p.pa2 !== filterPerson) return false;
    if (filterStatus && normalizeStatus(p.status) !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fields = [p.spot, p.series, p.hook, p.order, p.notes, p.ma, p.ma2, p.pa, p.pa2].filter(Boolean);
      if (!fields.some(f => f.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const sortedForNav = applyFilters([...posts].sort((a, b) => (a.foodDate || a.date).localeCompare(b.foodDate || b.date)));
  const navIdx = sortedForNav.findIndex(p => p.id === selectedId);
  const prevPost = navIdx > 0 ? sortedForNav[navIdx - 1] : null;
  const nextPost = navIdx >= 0 && navIdx < sortedForNav.length - 1 ? sortedForNav[navIdx + 1] : null;

  const monthPosts = applyFilters(posts.filter(p => parseDate(p.foodDate || p.date).getMonth() === currentMonth)).sort((a, b) => (a.foodDate || a.date).localeCompare(b.foodDate || b.date));
  const months = [3, 4, 5];
  const maCounts = {}; const paCounts = {};
  posts.forEach(p => { maCounts[p.ma] = (maCounts[p.ma]||0)+1; paCounts[p.pa] = (paCounts[p.pa]||0)+1; });

  // Gap & conflict warnings per week
  const weekWarnings = {};
  QUARTER_WEEKS.forEach(w => {
    const wEnd = new Date(w.sun); wEnd.setDate(wEnd.getDate() + 6);
    const wPosts = posts.filter(p => {
      const d = parseDate(p.foodDate || p.date);
      return d >= w.sun && d <= wEnd;
    });
    if (wPosts.length === 0) weekWarnings[w.label] = "gap";
    else {
      const dateCounts = {};
      wPosts.forEach(p => { const ds = p.foodDate || p.date; dateCounts[ds] = (dateCounts[ds]||0)+1; });
      if (Object.values(dateCounts).some(c => c > 1)) weekWarnings[w.label] = "conflict";
    }
  });

  const calRows = [];
  for (let i = 0; i < calDays.length; i += 7) calRows.push(calDays.slice(i, i + 7));

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: darkMode ? "#111827" : "#FAFAF8", minHeight: "100vh", padding: "20px 16px", color: darkMode ? "#e5e7eb" : "#1a1a2e", transition: "background 0.2s, color 0.2s" }}>
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
            <button onClick={() => setDarkMode(d => !d)} title="Toggle dark mode" style={{
              padding: "5px 9px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer",
              background: darkMode ? "#1a1a2e" : "#fff", color: darkMode ? "#fbbf24" : "#555", fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
            }}>{darkMode ? "☀️" : "🌙"}</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#777" }}>{posts.length} posts · Click to edit · Click empty date to add</span>
          <div style={{ display: "flex", gap: 8 }}>
            {STATUS_OPTIONS.map(s => {
              const sc = STATUS_COLORS[s];
              const count = posts.filter(p => normalizeStatus(p.status) === s).length;
              const active = filterStatus === s;
              return (
                <div key={s} onClick={() => setFilterStatus(active ? "" : s)} style={{
                  display: "flex", alignItems: "center", gap: 4, background: active ? sc.bg : "transparent",
                  borderRadius: 99, padding: "2px 8px", cursor: "pointer",
                  border: `1px solid ${active ? sc.dot : "#ddd"}`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
                  <span style={{ fontSize: 10, color: sc.text, fontWeight: 700, textTransform: "capitalize" }}>{count} {s}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          {months.map(m => (
            <button key={m} onClick={() => setCurrentMonth(m)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
              background: currentMonth === m ? "#1a1a2e" : "#eee", color: currentMonth === m ? "#fff" : "#666",
            }}>
              {MONTHS[m]}
              <span style={{ background: currentMonth === m ? "rgba(255,255,255,0.2)" : "#ddd", borderRadius: 10, padding: "1px 6px", fontSize: 10, marginLeft: 5 }}>
                {posts.filter(p => parseDate(p.foodDate || p.date).getMonth() === m).length}
              </span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => {
            const today = new Date(); const sun = new Date(today);
            sun.setDate(today.getDate() - today.getDay()); sun.setHours(0,0,0,0);
            if (view === "week") { setCurrentWeekSun(sun); }
            else { setCurrentMonth(today.getMonth()); setView("calendar"); }
          }} title="Jump to today" style={{
            padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, background: "#fff", color: "#555",
          }}>Today</button>
          {view === "calendar" && (
            <button onClick={() => setCompact(c => !c)} title="Toggle compact cards" style={{
              padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
              background: compact ? "#1a1a2e" : "#fff", color: compact ? "#fff" : "#555",
            }}>{compact ? "⊞ Compact" : "⊟ Compact"}</button>
          )}
          {["calendar", "week", "timeline", "list", "vendors", "overview"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
              border: view === v ? "none" : "1px solid #ddd",
              background: view === v ? "#1a1a2e" : "#fff",
              color: view === v ? "#fff" : "#555",
            }}>
              {v === "calendar" ? "📅 Cal" : v === "week" ? "📆 Week" : v === "timeline" ? "📋 Timeline" : v === "list" ? "☰ List" : v === "vendors" ? "🏪 Vendors" : "📊 Overview"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {Object.entries(SERIES_COLORS).map(([name, c]) => (
            <div key={name} onClick={() => setFilterSeries(filterSeries === name ? "" : name)} style={{
              display: "flex", alignItems: "center", gap: 4, background: c.bg, borderRadius: 14, padding: "2px 9px",
              border: `1px solid ${filterSeries === name ? c.accent : c.accent + "22"}`,
              cursor: "pointer", opacity: filterSeries && filterSeries !== name ? 0.4 : 1,
              boxShadow: filterSeries === name ? `0 0 0 2px ${c.accent}55` : "none",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.accent }} />
              <span style={{ fontSize: 9, color: c.accent, fontWeight: 600 }}>{name}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: 9, fontSize: 12, color: "#bbb", pointerEvents: "none" }}>🔍</span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search posts…"
              style={{
                border: "1px solid #ddd", borderRadius: 8, padding: "5px 10px 5px 28px", fontSize: 11,
                fontFamily: "'DM Sans', sans-serif", background: searchQuery ? "#f0f4ff" : "#fff",
                color: "#1a1a2e", width: 160, outline: "none",
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#aaa", padding: 0, lineHeight: 1 }}>×</button>
            )}
          </div>
          <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} style={{
            border: "1px solid #ddd", borderRadius: 8, padding: "5px 10px", fontSize: 11,
            fontFamily: "'DM Sans', sans-serif", background: filterPerson ? "#1a1a2e" : "#fff",
            color: filterPerson ? "#fff" : "#555", cursor: "pointer",
          }}>
            <option value="">👤 All people</option>
            <optgroup label="MAs">{MAs.map(n => <option key={n} value={n}>{n}</option>)}</optgroup>
            <optgroup label="PAs">{PAs.map(n => <option key={n} value={n}>{n}</option>)}</optgroup>
          </select>
          {(filterSeries || filterPerson || filterStatus || searchQuery) && (
            <button onClick={() => { setFilterSeries(""); setFilterPerson(""); setFilterStatus(""); setSearchQuery(""); }} style={{
              fontSize: 11, padding: "5px 10px", borderRadius: 8, border: "1px solid #ddd",
              background: "#fff", color: "#999", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>✕ Clear all</button>
          )}
          {(filterSeries || filterPerson || filterStatus || searchQuery) && (
            <span style={{ fontSize: 11, color: "#555" }}>
              {applyFilters(posts).length} of {posts.length} posts
            </span>
          )}
        </div>
      </div>

      {/* CALENDAR STATUS FILTER TOGGLE */}
      {view === "calendar" && (
        <div style={{ maxWidth: 1000, margin: "0 auto 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginRight: 2 }}>Show</span>
          {[
            { value: "all",      label: "All",      activeColor: "#1a1a2e", activeBg: "#1a1a2e", activeText: "#fff" },
            { value: "recorded", label: "Recorded", activeColor: "#E65100", activeBg: "#FFF3E0", activeText: "#E65100" },
            { value: "posted",   label: "Posted",   activeColor: "#2E7D32", activeBg: "#E8F5E9", activeText: "#2E7D32" },
          ].map(({ value, label, activeColor, activeBg, activeText }) => {
            const active = calendarStatusView === value;
            return (
              <button key={value} onClick={() => setCalendarStatusView(value)} style={{
                fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 99,
                border: `1.5px solid ${active ? activeColor : "#ddd"}`,
                background: active ? activeBg : "#fff",
                color: active ? activeText : "#888",
                cursor: "pointer", transition: "all 0.15s", letterSpacing: 0.3,
                boxShadow: active ? `0 1px 4px ${activeColor}33` : "none",
              }}>{label}</button>
            );
          })}
        </div>
      )}

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
                    {weekWarnings[wk.label] === "gap" && <span title="No posts this week" style={{ fontSize: 8, color: "#aaa", marginTop: 2 }}>—</span>}
                    {weekWarnings[wk.label] === "conflict" && <span title="Multiple posts on same day" style={{ fontSize: 8, color: "#E65100", marginTop: 2 }}>⚠</span>}
                  </>)}
                </div>,
                ...row.map(({ date, inMonth }, ci) => {
                  const dayPosts = posts.filter(p => sameDay(parseDate(p.foodDate || p.date), date));
                  const filteredDayPosts = applyFilters(dayPosts);
                  const isToday = sameDay(date, new Date());
                  const hasPosts = dayPosts.length > 0;
                  const cellDateStr = fmtDate(date);
                  const isDragOver = draggingId && dragOverDate === cellDateStr && inMonth;
                  return (
                    <div key={`d-${ri}-${ci}`}
                      onClick={() => { if (!hasPosts && inMonth && !draggingId) addPostOnDate(date); }}
                      onDragOver={e => { if (!inMonth) return; e.preventDefault(); setDragOverDate(cellDateStr); }}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={e => { e.preventDefault(); if (draggingId && inMonth) { dropOnDate(draggingId, date); } setDraggingId(null); setDragOverDate(null); }}
                      style={{
                        background: isDragOver ? "#e8f5e9" : inMonth ? "#fff" : "#f5f5f3",
                        minHeight: 90, padding: "4px 5px",
                        opacity: inMonth ? 1 : 0.35,
                        cursor: (!hasPosts && inMonth) ? "pointer" : "default",
                        transition: "background 0.15s",
                        outline: isDragOver ? "2px dashed #2E7D32" : "none",
                        outlineOffset: "-2px",
                      }}
                      onMouseEnter={e => { if (!hasPosts && inMonth && !draggingId) e.currentTarget.style.background = "#f0fce8"; }}
                      onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.background = inMonth ? "#fff" : "#f5f5f3"; }}
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
                          if (calendarStatusView !== "all" && normalizeStatus(p.status) !== calendarStatusView) return null;
                          const sc = SERIES_COLORS[p.series] || { bg: "#f5f5f5", accent: "#333" };
                          const st = STATUS_COLORS[normalizeStatus(p.status)];
                          const isFiltered = (filterSeries || filterPerson) && !filteredDayPosts.includes(p);
                          return (
                            <div key={p.id}
                              draggable={true}
                              onDragStart={e => { e.dataTransfer.effectAllowed = "move"; setDraggingId(p.id); }}
                              onDragEnd={() => { setDraggingId(null); setDragOverDate(null); }}
                              style={{
                                background: sc.bg, borderLeft: `3px solid ${sc.accent}`, borderRadius: 4,
                                padding: "4px 5px 5px", fontSize: 9, color: sc.accent, fontWeight: 600,
                                fontFamily: "'DM Sans', sans-serif",
                                opacity: draggingId === p.id ? 0.4 : isFiltered ? 0.2 : 1,
                                cursor: "grab",
                              }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>
                                {isDueSoon(p) && <span title="Food date within 7 days" style={{ color: "#E65100", fontSize: 9, flexShrink: 0, lineHeight: 1 }}>⚡</span>}
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
                              {!compact && p.date && (
                                <div style={{ fontSize: 8, color: "#888", fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 2 }}>
                                  <span>📅</span>
                                  {(() => { const d = parseDate(p.date); return `Post: ${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}`; })()}
                                </div>
                              )}
                              {!compact && <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: st.bg, borderRadius: 8, padding: "1px 5px", marginBottom: 2 }}>
                                <div style={{ width: 4, height: 4, borderRadius: "50%", background: st.dot }} />
                                <span style={{ fontSize: 7, color: st.text, fontWeight: 700, textTransform: "capitalize" }}>{normalizeStatus(p.status)}</span>
                              </div>}
                              {!compact && <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                                <PersonDot name={p.ma} colorMap={MA_COLORS} size={16} fontSize={6} />
                                <PersonDot name={p.ma2} colorMap={MA_COLORS} size={16} fontSize={6} />
                                <PersonDot name={p.pa} colorMap={PA_COLORS} size={16} fontSize={6} />
                                <PersonDot name={p.pa2} colorMap={PA_COLORS} size={16} fontSize={6} />
                              </div>}
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

      {/* WEEK VIEW */}
      {view === "week" && (() => {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(currentWeekSun); d.setDate(currentWeekSun.getDate() + i); return d;
        });
        const wk = getWeekLabel(currentWeekSun);
        const weekLabel = wk ? (wk.label === "FINALS" ? "Finals Week" : `${wk.label}${wk.isMidterm ? " · Midterm" : wk.isFinals ? " · Finals" : ""}`) : null;
        const goWeek = (delta) => { const d = new Date(currentWeekSun); d.setDate(d.getDate() + delta * 7); setCurrentWeekSun(d); };
        return (
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <button onClick={() => goWeek(-1)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 16, color: "#555" }}>‹</button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
                  {MONTHS[currentWeekSun.getMonth()]} {currentWeekSun.getDate()} – {MONTHS[days[6].getMonth()]} {days[6].getDate()}, {days[6].getFullYear()}
                </span>
                {weekLabel && <span style={{ marginLeft: 8, fontSize: 11, color: "#999", fontWeight: 500 }}>{weekLabel}</span>}
              </div>
              <button onClick={() => goWeek(1)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 16, color: "#555" }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, alignItems: "start" }}>
              {days.map(date => {
                const ds = fmtDate(date);
                const dayPosts = posts.filter(p => (p.foodDate || p.date) === ds);
                const filteredDayPosts = applyFilters(dayPosts);
                const isToday = sameDay(date, new Date());
                return (
                  <div key={ds} style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: isToday ? `2px solid #E65100` : "1px solid #eee", minHeight: 100 }}>
                    <div style={{ padding: "8px 10px 6px", background: isToday ? "#E65100" : "#f7f7f5", borderBottom: "1px solid #f0f0ee" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? "rgba(255,255,255,0.75)" : "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>{DAYS_SHORT[date.getDay()]}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: isToday ? "#fff" : "#1a1a2e", lineHeight: 1.2 }}>{date.getDate()}</div>
                    </div>
                    <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                      {dayPosts.map(p => {
                        const sc = SERIES_COLORS[p.series] || { bg: "#f5f5f5", accent: "#333" };
                        const st = STATUS_COLORS[normalizeStatus(p.status)];
                        const isFiltered = (filterSeries || filterPerson) && !filteredDayPosts.includes(p);
                        return (
                          <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
                            background: sc.bg, borderRadius: 8, padding: "8px 10px",
                            borderLeft: `3px solid ${sc.accent}`, cursor: "pointer",
                            opacity: isFiltered ? 0.2 : 1,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: sc.accent }}>{p.spot}</div>
                              {isDueSoon(p) && <span title="Due within 7 days" style={{ fontSize: 9, color: "#E65100", fontWeight: 700 }}>⚡</span>}
                            </div>
                            <div style={{ fontSize: 9, color: "#888", marginBottom: 4 }}>{p.series}</div>
                            {p.hook && <div style={{ fontSize: 10, color: "#444", lineHeight: 1.4, marginBottom: 5 }}>{p.hook}</div>}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 3, background: st.bg, borderRadius: 99, padding: "2px 7px" }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot }} />
                                <span style={{ fontSize: 9, color: st.text, fontWeight: 700, textTransform: "capitalize" }}>{normalizeStatus(p.status)}</span>
                              </div>
                              {p.date && <span style={{ fontSize: 9, color: "#bbb" }}>📅 {p.date.slice(5)}</span>}
                            </div>
                            {(p.ma || p.pa) && (
                              <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                                {[p.ma, p.ma2, p.pa, p.pa2].filter(Boolean).map((name, i) => {
                                  const color = MA_COLORS[name] || PA_COLORS[name] || "#999";
                                  return <div key={i} title={name} style={{ width: 16, height: 16, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>{name.charAt(0)}</div>;
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div onClick={() => addPostOnDate(date)} style={{
                        border: "1px dashed #ddd", borderRadius: 8, padding: "6px", textAlign: "center",
                        color: "#ccc", cursor: "pointer", fontSize: 16, lineHeight: 1,
                      }}>+</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* TIMELINE VIEW */}
      {view === "timeline" && (() => {
        const sorted = [...posts].sort((a, b) => (a.foodDate || a.date).localeCompare(b.foodDate || b.date));
        return (
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            {QUARTER_WEEKS.map(wk => {
              const wEnd = new Date(wk.sun); wEnd.setDate(wEnd.getDate() + 6);
              const wPosts = sorted.filter(p => { const d = parseDate(p.foodDate || p.date); return d >= wk.sun && d <= wEnd; });
              const filteredWPosts = applyFilters(wPosts);
              const headerBg = wk.isFinals ? "#F57F17" : wk.isMidterm ? "#E65100" : "#1a1a2e";
              return (
                <div key={wk.label} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: headerBg, padding: "3px 10px", borderRadius: 6, flexShrink: 0 }}>{wk.label}</span>
                    <span style={{ fontSize: 10, color: "#aaa" }}>
                      {MONTHS[wk.sun.getMonth()].slice(0,3)} {wk.sun.getDate()} – {MONTHS[wEnd.getMonth()].slice(0,3)} {wEnd.getDate()}
                    </span>
                    {weekWarnings[wk.label] === "conflict" && <span style={{ fontSize: 10, color: "#E65100", fontWeight: 600 }}>⚠ same-day conflict</span>}
                    <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                    <span style={{ fontSize: 10, color: "#bbb" }}>{wPosts.length} post{wPosts.length !== 1 ? "s" : ""}</span>
                  </div>
                  {wPosts.length === 0 ? (
                    <div style={{ fontSize: 11, color: "#ccc", padding: "6px 0" }}>No posts this week</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {wPosts.map(p => {
                        const sc = SERIES_COLORS[p.series] || { bg: "#f5f5f5", accent: "#333" };
                        const st = STATUS_COLORS[normalizeStatus(p.status)];
                        const isFiltered = (filterSeries || filterPerson) && !filteredWPosts.includes(p);
                        const fd = parseDate(p.foodDate || p.date);
                        return (
                          <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                            background: darkMode ? "#1e293b" : "#fff", borderRadius: 10, cursor: "pointer",
                            borderLeft: `4px solid ${sc.accent}`, opacity: isFiltered ? 0.25 : 1,
                            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                          }}>
                            <div style={{ minWidth: 44, textAlign: "center", flexShrink: 0 }}>
                              <div style={{ fontSize: 20, fontWeight: 700, color: sc.accent, lineHeight: 1 }}>{fd.getDate()}</div>
                              <div style={{ fontSize: 9, color: "#aaa", textTransform: "uppercase" }}>{MONTHS[fd.getMonth()].slice(0,3)}</div>
                            </div>
                            {vendors[p.spot] && <div style={{ fontSize: 22, flexShrink: 0 }}>{vendors[p.spot].emoji}</div>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: darkMode ? "#e5e7eb" : "#1a1a2e" }}>{p.spot}</span>
                                {isDueSoon(p) && <span title="Food date within 7 days" style={{ fontSize: 10, color: "#E65100", fontWeight: 700, background: "#FFF3E0", borderRadius: 5, padding: "1px 6px" }}>⚡ due soon</span>}
                              </div>
                              <div style={{ fontSize: 10, color: sc.accent, fontWeight: 600, marginTop: 1 }}>{p.series}</div>
                              {p.hook && <div style={{ fontSize: 10, color: darkMode ? "#9ca3af" : "#666", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.hook}</div>}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 3, background: st.bg, borderRadius: 12, padding: "3px 8px" }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot }} />
                                <span style={{ fontSize: 10, color: st.text, fontWeight: 700, textTransform: "capitalize" }}>{normalizeStatus(p.status)}</span>
                              </div>
                              {p.date && <span style={{ fontSize: 9, color: "#aaa" }}>📅 {p.date.slice(5)}</span>}
                            </div>
                            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                              {[p.ma, p.ma2, p.pa, p.pa2].filter(Boolean).map((name, i) => (
                                <div key={i} title={name} style={{ width: 22, height: 22, borderRadius: "50%", background: MA_COLORS[name] || PA_COLORS[name] || "#999", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{name.charAt(0)}</div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* LIST VIEW */}
      {view === "list" && (
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>{MONTHS[currentMonth]} — {monthPosts.length} posts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {monthPosts.map(p => {
              const c = SERIES_COLORS[p.series] || { bg: "#f5f5f5", accent: "#333" };
              const d = parseDate(p.date);
              return (
                <div key={p.id}
                  draggable={true}
                  onDragStart={e => { e.dataTransfer.effectAllowed = "move"; setDraggingId(p.id); }}
                  onDragEnd={() => { setDraggingId(null); setDragOverListId(null); }}
                  onDragOver={e => { e.preventDefault(); setDragOverListId(p.id); }}
                  onDragLeave={() => setDragOverListId(null)}
                  onDrop={e => { e.preventDefault(); if (draggingId) dropOnListItem(draggingId, p.id); setDraggingId(null); setDragOverListId(null); }}
                  onClick={() => { if (!draggingId) setSelectedId(p.id); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    background: dragOverListId === p.id ? "#e8f5e9" : p.done ? "#F1F8E9" : "#fff",
                    border: `1px solid ${dragOverListId === p.id ? "#2E7D32" : p.done ? "#C8E6C9" : "#eee"}`,
                    borderLeft: `4px solid ${p.done ? "#2E7D32" : c.accent}`,
                    borderRadius: 8, cursor: draggingId ? "grabbing" : "grab",
                    opacity: draggingId === p.id ? 0.4 : 1,
                    transition: "background 0.1s, border-color 0.1s",
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
          if (name === "TBD" || name === "Multiple / Roundup" || name === "__new__") return;
          const building = getBuilding(v.location || "");
          if (grouped[building]) grouped[building].push({ name, ...v });
        });
        return (
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
                University Centers — {Object.values(grouped).flat().length} vendors
              </h3>
              <button onClick={addVendor} style={{
                fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, border: "none",
                background: "#1a1a2e", color: "#fff", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>+ Add Vendor</button>
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
                <div key={n} onClick={() => setFilterPerson(filterPerson === n ? "" : n)} style={{
                  display: "flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "5px 10px 5px 6px", cursor: "pointer",
                  background: filterPerson === n ? MA_COLORS[n] + "18" : "#f8f8f6",
                  border: filterPerson === n ? `1px solid ${MA_COLORS[n]}60` : "1px solid transparent",
                }}>
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
                <div key={n} onClick={() => setFilterPerson(filterPerson === n ? "" : n)} style={{
                  display: "flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "5px 10px 5px 6px", cursor: "pointer",
                  background: filterPerson === n ? PA_COLORS[n] + "18" : "#f8f8f6",
                  border: filterPerson === n ? `1px solid ${PA_COLORS[n]}60` : "1px solid transparent",
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: PA_COLORS[n], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{n.charAt(0)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e" }}>{n}</span>
                  <span style={{ background: PA_COLORS[n], color: "#fff", borderRadius: 8, padding: "0 6px", fontSize: 9, fontWeight: 700 }}>{paCounts[n]||0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* OVERVIEW VIEW */}
      {view === "overview" && (() => {
        const done = posts.filter(p => p.status === "posted" || p.done).length;
        const byStatus = {};
        STATUS_OPTIONS.forEach(s => { byStatus[s] = posts.filter(p => (normalizeStatus(p.status)) === s).length; });
        const bySeries = {};
        SERIES_LIST.forEach(s => { bySeries[s] = { total: 0, done: 0 }; });
        posts.forEach(p => {
          if (!bySeries[p.series]) bySeries[p.series] = { total: 0, done: 0 };
          bySeries[p.series].total++;
          if (p.status === "posted" || p.done) bySeries[p.series].done++;
        });
        const maLoad = {}; const paLoad = {};
        posts.forEach(p => {
          [p.ma, p.ma2].filter(Boolean).forEach(n => { maLoad[n] = (maLoad[n]||0)+1; });
          [p.pa, p.pa2].filter(Boolean).forEach(n => { paLoad[n] = (paLoad[n]||0)+1; });
        });
        return (
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Progress bar */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>Quarter Progress</span>
                <span style={{ fontSize: 13, color: "#2E7D32", fontWeight: 700 }}>{done} / {posts.length} posted</span>
              </div>
              <div style={{ background: "#f0f0ee", borderRadius: 8, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${(done/posts.length)*100}%`, background: "#2E7D32", height: "100%", borderRadius: 8, transition: "width 0.4s" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map(s => { const sc = STATUS_COLORS[s]; return byStatus[s] > 0 && (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, background: sc.bg, borderRadius: 20, padding: "4px 10px" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
                    <span style={{ fontSize: 11, color: sc.text, fontWeight: 700, textTransform: "capitalize" }}>{s}</span>
                    <span style={{ fontSize: 11, color: sc.text, fontWeight: 700 }}>{byStatus[s]}</span>
                  </div>
                ); })}
              </div>
            </div>
            {/* Series breakdown */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 14 }}>By Series</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SERIES_LIST.map(s => {
                  const sc = SERIES_COLORS[s]; const d = bySeries[s] || { total: 0, done: 0 };
                  if (!d.total) return null;
                  return (
                    <div key={s}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: sc.accent }}>{s}</span>
                        <span style={{ fontSize: 11, color: "#999" }}>{d.done}/{d.total}</span>
                      </div>
                      <div style={{ background: sc.bg, borderRadius: 6, height: 7, overflow: "hidden" }}>
                        <div style={{ width: d.total ? `${(d.done/d.total)*100}%` : "0%", background: sc.accent, height: "100%", borderRadius: 6 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Budget estimate */}
            {(() => {
              const totalEst = Math.round(posts.reduce((sum, p) => sum + parseCost(p.cost), 0));
              const bySeriesCost = {};
              posts.forEach(p => { if (p.series) bySeriesCost[p.series] = (bySeriesCost[p.series] || 0) + parseCost(p.cost); });
              return (
                <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Budget Estimate</span>
                    <span style={{ fontSize: 14, color: "#E65100", fontWeight: 700 }}>${totalEst} est. total</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SERIES_LIST.map(s => {
                      const sc = SERIES_COLORS[s]; const cost = bySeriesCost[s];
                      if (!cost) return null;
                      return (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, background: sc.bg, borderRadius: 20, padding: "4px 10px" }}>
                          <span style={{ fontSize: 11, color: sc.accent, fontWeight: 700 }}>{s}</span>
                          <span style={{ fontSize: 11, color: sc.accent, fontWeight: 500 }}>${Math.round(cost)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 10 }}>Based on midpoint of cost ranges · actual costs may vary</div>
                </div>
              );
            })()}
            {/* Team workload */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["Marketing Assistants", maLoad, MA_COLORS], ["Photography Assistants", paLoad, PA_COLORS]].map(([title, load, colors]) => (
                <div key={title} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 14 }}>{title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(load).sort((a,b) => b[1]-a[1]).map(([name, count]) => (
                      <div key={name} onClick={() => setFilterPerson(filterPerson === name ? "" : name)} style={{
                        display: "flex", alignItems: "center", gap: 8, cursor: "pointer", borderRadius: 8, padding: "2px 6px",
                        background: filterPerson === name ? (colors[name] || "#999") + "14" : "transparent",
                        outline: filterPerson === name ? `1px solid ${colors[name] || "#999"}40` : "none",
                      }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: colors[name]||"#999", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{name.charAt(0)}</div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", flex: 1 }}>{name}</span>
                        <div style={{ width: 80, background: "#f0f0ee", borderRadius: 4, height: 6, overflow: "hidden" }}>
                          <div style={{ width: `${(count/Math.max(...Object.values(load)))*100}%`, background: colors[name]||"#999", height: "100%" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#999", fontWeight: 600, minWidth: 16, textAlign: "right" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* UNDO TOAST */}
      {undoStack && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a2e", color: "#fff", borderRadius: 12, padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 14, zIndex: 300,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)", fontFamily: "'DM Sans', sans-serif",
          animation: "slideIn 0.2s ease-out",
        }}>
          <span style={{ fontSize: 13 }}>{undoStack.msg}</span>
          <button onClick={undo} style={{
            background: "#fff", color: "#1a1a2e", border: "none", borderRadius: 8,
            padding: "5px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Undo</button>
          <button onClick={() => setUndoStack(null)} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16, padding: 0,
          }}>×</button>
        </div>
      )}

      {selectedPost && !activeVendor && <div onClick={() => setSelectedId(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 99 }} />}
      <EditPanel post={selectedPost} onClose={() => setSelectedId(null)} onUpdate={updatePost} onDelete={deletePost} onDuplicate={duplicatePost} onVendorClick={setActiveVendor} vendors={vendors} onPrev={prevPost ? () => setSelectedId(prevPost.id) : null} onNext={nextPost ? () => setSelectedId(nextPost.id) : null} />
      {activeVendor && <VendorPanel
        vendor={activeVendor}
        vendorData={vendors[activeVendor]}
        onClose={() => {
          if (creatingVendor) {
            setVendors(prev => { const next = { ...prev }; delete next["__new__"]; return next; });
            setCreatingVendor(false);
          }
          setActiveVendor(null);
        }}
        onUpdate={(data) => updateVendor(activeVendor, data)}
        isNew={creatingVendor}
        onCreateVendor={createVendor}
        posts={posts}
      />}
    </div>
  );
}
