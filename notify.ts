import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

webpush.setVapidDetails("mailto:" + Deno.env.get("VAPID_EMAIL"), Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const L: Record<string, string> = { events: "een afspraak", tasks: "een taak", items: "iets op de lijst" };

Deno.serve(async (req) => {
  const p = await req.json();
  if (p.type === "DELETE" || p.table !== "docs") return new Response("skip");
  const r = p.record, d = r.data || {}, by = d.by || "";
  if (!L[r.collection]) return new Response("skip");
  if (r.collection !== "events" && p.type !== "INSERT") return new Response("skip");
  const t = d.title || d.text || "";
  const who = by ? by.charAt(0).toUpperCase() + by.slice(1) : "Iemand";
  const body = who + " heeft " + (p.type === "INSERT" ? L[r.collection] + " toegevoegd" : "een afspraak aangepast") + ": " + t;
  const { data: subs } = await sb.from("push_subs").select("endpoint,sub,name");
  await Promise.all((subs || []).filter((s) => s.name !== by).map(async (s) => {
    try {
      await webpush.sendNotification(s.sub, JSON.stringify({ title: "Gezinsagenda", body }));
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint);
    }
  }));
  return new Response("ok");
});
