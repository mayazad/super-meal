import { redirect } from "next/navigation";

export default async function LegacySummaryRedirect(props: {
    params: Promise<{ month_year: string }>
}) {
    const params = await props.params;
    // Redirect Old /summary to the new slug-based tenant URL using the main master-mess alias
    redirect(`/view/master-mess/${params.month_year}`);
}
