import { fetchProyectos } from "@/lib/airtable";
import PipelineView from "./PipelineView";

export default async function PipelinePage() {
  const proyectos = await fetchProyectos();
  return <PipelineView proyectos={proyectos} />;
}
