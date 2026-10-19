import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-20 text-center animate-fade-up">
      <h1 className="text-[32px] font-semibold tracking-[-0.04em]">Bulunamadı</h1>
      <p className="mt-2 text-text-secondary">Bu kayıt yok veya kaldırılmış olabilir.</p>
      <Link href="/villages" className="mt-6 inline-block">
        <Button>Köylere dön</Button>
      </Link>
    </div>
  );
}
