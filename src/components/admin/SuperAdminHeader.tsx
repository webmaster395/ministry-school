import ManagementPageHeader from "@/components/management/ManagementPageHeader";

export default function SuperAdminHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <ManagementPageHeader eyebrow="ADMIN" title={title} subtitle={subtitle} />;
}
