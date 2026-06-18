import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  try {
    const { data } = await supabase
      .from("docs")
      .select("slug")
      .order("created_at", { ascending: true })
      .limit(1);

    if (data && data.length > 0 && data[0].slug) {
      redirect(`/docs/${data[0].slug}`);
    }
  } catch (e) {
    console.warn("Redirect home failed to query Supabase:", e);
  }

  redirect("/docs/wearable-health-insights-pipeline");
}
