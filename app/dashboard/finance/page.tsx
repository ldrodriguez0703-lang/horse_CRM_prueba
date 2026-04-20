import { fetchProyectos } from "@/lib/airtable";
import FinanceView from "./FinanceView";

export default async function FinancePage() {
  const proyectos = await fetchProyectos();
  return <FinanceView proyectos={proyectos} />;
}
