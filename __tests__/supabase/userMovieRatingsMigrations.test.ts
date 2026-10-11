/**
 * Struktur-Tests fuer die Phase-0-Migrationen von ADR 0014 (user_movie_ratings).
 * Sie parsen die SQL-Dateien (kein DB-Zugriff). Verhalten gegen eine echte DB
 * prueft supabase/tests/user_movie_ratings.sql (manuell gegen DEV).
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(process.cwd(), "supabase", "migrations");
const all = fs.readdirSync(DIR).filter((f: string) => f.endsWith(".sql")).sort();

function find(suffix: string): string {
  const f = all.find((n: string) => n.endsWith(suffix));
  if (!f) throw new Error(`migration *${suffix} missing`);
  return f;
}
function read(suffix: string): string {
  return fs.readFileSync(path.join(DIR, find(suffix)), "utf8").toLowerCase();
}
/** SQL ohne Kommentare, damit Kommentartext keine Treffer erzeugt. */
function code(suffix: string): string {
  return read(suffix)
    .split("\n")
    .map((l: string) => l.replace(/--.*$/, ""))
    .join("\n");
}

describe("migration files", () => {
  const NEW = [
    "_user_movie_ratings.sql",
    "_user_movie_ratings_backfill.sql",
    "_account_deletion_fk_fixes.sql",
    "_realtime_publication.sql",
  ];

  it("exist with timestamp prefix after the last pre-existing migration, in order", () => {
    const files = NEW.map(find);
    const prefixes = files.map((f) => f.split("_")[0]);
    prefixes.forEach((p) => expect(p).toMatch(/^\d{14}$/));
    expect([...prefixes].sort()).toEqual(prefixes);
    const old = all.filter((f: string) => !files.includes(f));
    const lastOld = old[old.length - 1].split("_")[0];
    prefixes.forEach((p) => expect(p > lastOld).toBe(true));
  });

  it("contain no destructive statements on existing tables", () => {
    for (const s of NEW) {
      const c = code(s);
      expect(c).not.toMatch(/drop\s+table/);
      expect(c).not.toMatch(/truncate/);
      expect(c).not.toMatch(/delete\s+from\s+public\.ratings/);
    }
  });
});

describe("user_movie_ratings migration", () => {
  const c = code("_user_movie_ratings.sql");

  it("creates the table idempotently with cascading FKs and unique key", () => {
    expect(c).toMatch(/create table if not exists public\.user_movie_ratings/);
    expect(c).toMatch(/user_id\s+uuid not null references auth\.users\(id\) on delete cascade/);
    expect(c).toMatch(/movie_id\s+uuid not null references public\.movies\(id\) on delete cascade/);
    expect(c).toMatch(/primary key \(user_id, movie_id\)/);
    expect(c).toMatch(/rating\s+numeric\(2,1\) check \(rating is null or \(rating >= 0 and rating <= 5\)\)/);
    expect(c).toMatch(/liked\s+boolean not null default false/);
    for (const col of ["seen_at", "rated_at", "created_at", "updated_at"]) expect(c).toContain(col);
  });

  it("creates the supporting indexes idempotently", () => {
    expect(c).toMatch(/create index if not exists user_movie_ratings_movie_user_idx\s+on public\.user_movie_ratings \(movie_id, user_id\)/);
    expect(c).toMatch(/create index if not exists watchlist_entries_movie_group_idx\s+on public\.watchlist_entries \(movie_id, group_id\)/);
    expect(c).toMatch(/create index if not exists watch_group_members_user_group_idx\s+on public\.watch_group_members \(user_id, group_id\)/);
  });

  it("enables RLS and defines select/insert/update/delete policies", () => {
    expect(c).toMatch(/alter table public\.user_movie_ratings enable row level security/);
    expect(c).toMatch(/create policy "umr_select_own_or_shared_group"[\s\S]*?for select[\s\S]*?can_read_user_movie_rating\(user_id, movie_id\)/);
    expect(c).toMatch(/create policy "umr_insert_own"[\s\S]*?for insert[\s\S]*?with check \(user_id = \(select auth\.uid\(\)\)\)/);
    expect(c).toMatch(/create policy "umr_update_own"[\s\S]*?for update[\s\S]*?using \(user_id = \(select auth\.uid\(\)\)\)[\s\S]*?with check \(user_id = \(select auth\.uid\(\)\)\)/);
    expect(c).toMatch(/create policy "umr_delete_own"[\s\S]*?for delete[\s\S]*?using \(user_id = \(select auth\.uid\(\)\)\)/);
    expect(c.match(/drop policy if exists/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("grants authenticated select/insert/update/delete and service_role full access", () => {
    expect(c).toMatch(/grant select, insert, update, delete on public\.user_movie_ratings to authenticated/);
    expect(c).toMatch(/grant select, insert, update, delete on public\.user_movie_ratings to service_role/);
  });

  it("defines the read helper as stable security definer with fixed search_path", () => {
    const m = c.match(/create or replace function public\.can_read_user_movie_rating[\s\S]*?\$\$;/);
    expect(m).not.toBeNull();
    const fn = m![0];
    expect(fn).toContain("security definer");
    expect(fn).toContain("stable");
    expect(fn).toContain("set search_path = public");
    expect(fn).toContain("(select auth.uid())");
  });

  it("defines get_group_member_ratings RPC checking membership once", () => {
    const m = c.match(/create or replace function public\.get_group_member_ratings[\s\S]*?\$\$;/);
    expect(m).not.toBeNull();
    const fn = m![0];
    expect(fn).toContain("security definer");
    expect(fn).toContain("set search_path = public");
    expect(fn).toContain("is_group_member(p_group_id)");
    expect(c).toMatch(/grant execute on function public\.get_group_member_ratings\(uuid\) to authenticated/);
  });

  it("maintains updated_at with a before-update trigger", () => {
    expect(c).toMatch(/create or replace function public\.set_user_movie_ratings_updated_at/);
    expect(c).toMatch(/drop trigger if exists trg_user_movie_ratings_updated_at/);
    expect(c).toMatch(/create trigger trg_user_movie_ratings_updated_at\s+before update/);
  });

  it("does NOT attach a push trigger in phase 0", () => {
    expect(c).not.toContain("enqueue_push_notification");
    expect(c).not.toContain("notify_first_rating");
  });

  it("leaves legacy ratings untouched", () => {
    expect(c).not.toMatch(/(alter|drop)\s+table\s+(if exists\s+)?public\.ratings/);
  });
});

describe("backfill migration", () => {
  const c = code("_user_movie_ratings_backfill.sql");

  it("reads ratings joined to watchlist_entries and inserts idempotently", () => {
    expect(c).toMatch(/from public\.ratings/);
    expect(c).toMatch(/join public\.watchlist_entries/);
    expect(c).toMatch(/insert into public\.user_movie_ratings/);
    expect(c).toMatch(/on conflict \(user_id, movie_id\) do nothing/);
  });

  it("applies the conflict rule: newest rating wins, liked = OR, seen_at = earliest", () => {
    expect(c).toMatch(/bool_or\(\s*\w+\.liked\s*\)/);
    expect(c).toMatch(/min\(\s*\w+\.seen_at\s*\)/);
    expect(c).toMatch(/order by[\s\S]*rated_at desc/);
    expect(c).toMatch(/row_number\(\)/);
  });

  it("reports conflicts via notice before inserting", () => {
    const notice = c.indexOf("raise notice");
    const insert = c.indexOf("insert into public.user_movie_ratings");
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(insert);
  });

  it("does not fire push notifications", () => {
    expect(c).not.toContain("enqueue_push_notification");
  });
});

describe("account deletion FK fixes", () => {
  const c = code("_account_deletion_fk_fixes.sql");

  it("sets added_by / paid_by_member_id to SET NULL and makes added_by nullable", () => {
    expect(c).toMatch(/alter table public\.watchlist_entries\s+alter column added_by drop not null/);
    expect(c).toMatch(/drop constraint if exists watchlist_entries_added_by_fkey/);
    expect(c).toMatch(/foreign key \(added_by\) references auth\.users\(id\) on delete set null/);
    expect(c).toMatch(/drop constraint if exists watchlist_entries_paid_by_member_id_fkey/);
    expect(c).toMatch(/foreign key \(paid_by_member_id\) references auth\.users\(id\) on delete set null/);
  });

  it("makes ratings.member_id cascade", () => {
    expect(c).toMatch(/drop constraint if exists ratings_member_id_fkey/);
    expect(c).toMatch(/foreign key \(member_id\) references auth\.users\(id\) on delete cascade/);
  });
});

describe("all FKs onto auth.users are cascade or set null (account deletion)", () => {
  it("no migration leaves a plain FK on auth.users without ON DELETE action, unless later fixed", () => {
    const fixed = code("_account_deletion_fk_fixes.sql");
    for (const f of all) {
      const text = fs
        .readFileSync(path.join(DIR, f), "utf8")
        .toLowerCase()
        .split("\n")
        .map((l: string) => l.replace(/--.*$/, ""))
        .join("\n");
      const re = /(\w+)\s+uuid[^,;]*references auth\.users\(id\)(?!\s+on delete)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        // muss in der Fix-Migration neu gesetzt werden
        expect(fixed).toContain(`foreign key (${m[1]}) references auth.users(id)`);
      }
    }
  });
});

describe("realtime publication migration", () => {
  const c = code("_realtime_publication.sql");

  it("adds the three tables idempotently (only if not already a member)", () => {
    for (const t of ["watchlist_entries", "ratings", "user_movie_ratings"]) {
      expect(c).toContain(`'${t}'`);
    }
    expect(c).toContain("pg_publication_tables");
    expect(c).toMatch(/alter publication supabase_realtime add table/);
  });

  it("sets REPLICA IDENTITY FULL so filtered/DELETE events carry old row values", () => {
    for (const t of ["watchlist_entries", "ratings", "user_movie_ratings"]) {
      expect(c).toMatch(new RegExp(`alter table public\\.${t} replica identity full`));
    }
  });
});

describe("manual SQL test script", () => {
  it("exists and rolls back", () => {
    const p = path.join(process.cwd(), "supabase", "tests", "user_movie_ratings.sql");
    const s = fs.readFileSync(p, "utf8").toLowerCase();
    expect(s).toContain("begin;");
    expect(s).toMatch(/rollback;\s*$/);
    expect(s).toContain("set local role authenticated");
  });
});
