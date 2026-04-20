import { fetchProyectos } from "@/lib/airtable";
import { notFound } from "next/navigation";
import ProyectoFullView from "./ProyectoFullView";

export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proyectos = await fetchProyectos();
  const proyecto = proyectos.find((p) => p.id === id);
  if (!proyecto) notFound();
  return <ProyectoFullView proyecto={proyecto} />;
}
