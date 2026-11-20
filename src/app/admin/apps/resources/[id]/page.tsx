import { notFound } from "next/navigation";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import ManagedResourceForm from "@/components/admin/ManagedResourceForm";
import { createClient } from "@/lib/supabase/server";
export default async function Page({params}:{params:Promise<{id:string}>}){ const {id}=await params; const supabase=await createClient(); const {data}=await supabase.from("managed_resources").select("*").eq("id",id).single(); if(!data)notFound(); return <AppsStudioShell active="applications"><StudioPageHeader eyebrow="GESTION DES RESSOURCES" title={data.title} description="Le fichier, les emplacements et les droits sont synchronisés après l’enregistrement."/><ManagedResourceForm resource={data}/></AppsStudioShell>; }
