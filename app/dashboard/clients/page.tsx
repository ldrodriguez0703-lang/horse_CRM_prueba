import { fetchProyectos, fmt, type Proyecto } from "@/lib/airtable";
import ClientsView from "./ClientsView";

export default async function ClientsPage() {
  const proyectos = await fetchProyectos();
  return <ClientsView proyectos={proyectos} />;
}
