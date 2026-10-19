import { createClient } from "@/lib/supabase/client";

export async function uploadPersonAvatar(file: File, personId?: string): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Giriş gerekli");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/${personId ?? "new"}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("person-avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("person-avatars").getPublicUrl(path);
  return data.publicUrl;
}
