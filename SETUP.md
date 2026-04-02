# PC Plates — Deploy Guide (Supabase + Vercel)

Everything you need to get the calendar live and shared with your team. Total time: about 15 minutes.

---

## STEP 1: Set up Supabase (free database — 7 min)

### Create the project

1. Go to https://supabase.com and click "Start your project"
2. Sign up with GitHub (fastest) or email
3. Click "New project"
4. Name it `pc-plates`
5. Set a database password (save it somewhere, you won't need it in the app but Supabase requires it)
6. Region: pick the closest to you (West US is fine)
7. Click "Create new project" and wait about 2 minutes

### Create the table

1. In the left sidebar, click "SQL Editor"
2. Click "New query"
3. Paste this SQL and click "Run":

```sql
create table calendar (
  id int primary key default 1,
  posts jsonb not null default '[]'::jsonb
);

insert into calendar (id, posts) values (1, '[]');

alter table calendar enable row level security;

create policy "Allow all access" on calendar
  for all
  using (true)
  with check (true);

create table vendors (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb
);

insert into vendors (id, data) values (1, '{}');

alter table vendors enable row level security;

create policy "Allow all access" on vendors
  for all
  using (true)
  with check (true);
```

4. You should see "Success" in green

### Enable real-time

1. In the left sidebar, click "Database" then "Replication"
2. Find the `calendar` table and toggle Realtime ON
3. Find the `vendors` table and toggle Realtime ON
4. (If you don't see them, click the "Tables" tab, find each table, enable it)

### Get your credentials

1. Click "Project Settings" (gear icon, bottom of left sidebar)
2. Click "API"
3. Copy two things:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (long string under "Project API keys")

### Paste credentials into the project

1. Open `src/supabase.js`
2. Replace the placeholder URL with your Project URL
3. Replace the placeholder key with your anon key
4. Save

---

## STEP 2: Test locally (optional — 3 min)

1. Open Terminal and navigate to the `pc-plates` folder
2. Run `npm install`
3. Run `npm run dev`
4. Open the URL shown (usually http://localhost:5173)
5. Green "Synced" dot = working. First load seeds the database with all 29 posts.

---

## STEP 3: Deploy to Vercel (free hosting — 5 min)

### Option A: Drag and drop (easiest)

1. Run `npm install` then `npm run build` in Terminal
2. Go to https://vercel.com, sign up
3. Click "Add New" then "Project"
4. Drag the `dist` folder onto the page
5. Vercel gives you a URL like `pc-plates.vercel.app`

### Option B: GitHub (auto-deploys on every push)

1. Create a GitHub repo called `pc-plates`
2. Push the code:
   ```
   cd pc-plates
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pc-plates.git
   git push -u origin main
   ```
3. On Vercel, import from GitHub, select `pc-plates`, set Framework to "Vite"
4. Add environment variables (Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click Deploy

---

## STEP 4: Share with your team

Send the Vercel URL. Everyone can view, edit, add, and delete posts. Changes sync live. No logins needed.

---

## Troubleshooting

**"Synced" doesn't show green:**
Check URL and anon key in `src/supabase.js`.

**Changes don't sync between browsers:**
Verify Realtime is enabled for the `calendar` table in Supabase Dashboard.

**Permission errors:**
Re-run the RLS policy SQL from Step 1.

**View/edit raw data:**
Supabase Dashboard > Table Editor > `calendar` table. You can edit the JSON directly.

**Reset everything:**
Click "Reset" in the app, or run in SQL Editor:
`update calendar set posts = '[]' where id = 1;`
