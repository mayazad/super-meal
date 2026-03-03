import { redirect } from "next/navigation";

export default async function ViewRootSlugPage(props: {
    params: Promise<{ slug: string }>
}) {
    const params = await props.params;
    const { slug } = params;

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    redirect(`/view/${slug}/${year}-${month}`);
}
