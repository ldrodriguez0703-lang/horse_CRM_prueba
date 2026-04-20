"use server";

import { patchProyecto } from "@/lib/airtable";
import { revalidatePath } from "next/cache";

export async function updatePorcentaje(recordId: string, porcentaje: number) {
  const ok = await patchProyecto(recordId, { Porcentaje: porcentaje });
  if (ok) revalidatePath("/dashboard/pipeline");
  return ok;
}

export async function updateTareasPendientes(recordId: string, tareas: string) {
  const ok = await patchProyecto(recordId, { "Tareas pendientes": tareas });
  if (ok) revalidatePath("/dashboard/pipeline");
  return ok;
}
