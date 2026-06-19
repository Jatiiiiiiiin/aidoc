import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  let targetSlug: string | null = null;
  try {
    const { data } = await supabase
      .from("docs")
      .select("slug")
      .order("created_at", { ascending: true })
      .limit(1);

    if (data && data.length > 0 && data[0].slug) {
      targetSlug = data[0].slug;
    }
  } catch (e) {
    console.warn("Redirect home failed to query Supabase:", e);
  }

  if (targetSlug) {
    redirect(`/docs/${targetSlug}`);
  }

  redirect("/docs/wearable-health-insights-pipeline");
}
