import { Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export async function SetupBanner() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("villages").select("id").limit(1);
    if (!error) return null;

    const missing =
      error.message.includes("schema cache") ||
      error.code === "PGRST205" ||
      error.message.toLowerCase().includes("does not exist");

    if (!missing) return null;

    return (
      <Surface className="mb-8 border-dashed !border-[#e5d7b8] !bg-[#fffbf2]">
        <p className="text-[14px] font-semibold tracking-[-0.02em]">Veritabanı henüz kurulmadı</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          Supabase SQL Editor’da{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-[12px]">
            supabase/migrations/001_init.sql
          </code>{" "}
          dosyasını çalıştır. Sonra Google Auth redirect’ine{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-[12px]">
            /auth/callback
          </code>{" "}
          ekle. Yerelde: <code className="font-mono text-[12px]">npm run db:setup</code>
        </p>
      </Surface>
    );
  } catch {
    return null;
  }
}
