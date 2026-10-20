import { unstable_noStore as noStore } from "next/cache";
import { Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export async function SetupBanner() {
  // Never bake a stale setup warning into an ISR page.
  noStore();

  try {
    const supabase = await createClient();
    const { error: villageError } = await supabase.from("villages").select("id").limit(1);
    if (isMissingTable(villageError)) {
      return (
        <Surface className="mb-8 border-dashed !border-[#e5d7b8] !bg-[#fffbf2]">
          <p className="text-[14px] font-semibold tracking-[-0.02em]">Veritabanı henüz kurulmadı</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            Supabase SQL Editor’da önce <code className="rounded bg-white/80 px-1 font-mono text-[12px]">supabase/migrations/001_init.sql</code> dosyasını çalıştırın.
          </p>
        </Surface>
      );
    }

    const { error: archiveError } = await supabase.from("heritage_entries").select("id").limit(1);
    if (isMissingTable(archiveError)) {
      return (
        <Surface className="mb-8 border-dashed !border-[#d6dfd3] !bg-[#f6faf4]">
          <p className="text-[14px] font-semibold tracking-[-0.02em]">Hafıza Arşivi kurulmayı bekliyor</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            Yeni arşiv, çift adlı köy kayıtları ve ilişki güvenliği için sırayla <code className="rounded bg-white/80 px-1 font-mono text-[12px]">004_heritage_archive.sql</code> ve <code className="rounded bg-white/80 px-1 font-mono text-[12px]">005_relation_integrity.sql</code> dosyalarını Supabase SQL Editor’da çalıştırın.
          </p>
        </Surface>
      );
    }
  } catch {
    // Missing local credentials should not block the public shell.
  }

  return null;
}
