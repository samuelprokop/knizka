"use server";

import { revalidatePath } from "next/cache";

import { approveBookAction, returnBookAction } from "../server/queue";
import { adminAction, type ActionResult } from "./common";

export async function approveQueueItemAction(projectId: string): Promise<ActionResult> {
  return adminAction("fronta", async (admin) => {
    await approveBookAction(projectId, admin.email);
    revalidatePath("/admin/fronta");
  });
}

export async function returnQueueItemAction(projectId: string, note: string): Promise<ActionResult> {
  return adminAction("fronta", async (admin) => {
    if (!note.trim()) throw new Error("Vrátenie potrebuje poznámku pre výrobu.");
    await returnBookAction(projectId, admin.email, note.trim());
    revalidatePath("/admin/fronta");
  });
}
