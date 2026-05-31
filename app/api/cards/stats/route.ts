import { ZodError } from "zod";

import { finalizeSessionResponse, validateUserSession } from "@/lib/auth/session";
import { emptyResponse, jsonResponse } from "@/lib/server/api-response";
import { getCardStore } from "@/lib/server/card-store";
import { cardStatsQuerySchema } from "@/lib/validation/card-api-schema";

export const dynamic = "force-dynamic";

type ApiErrorPayload = {
  error: string;
  issues?: string[];
};

function validationError(error: ZodError): Response {
  return jsonResponse(
    {
      error: "Validation failed.",
      issues: error.issues.map((issue) => issue.message),
    } satisfies ApiErrorPayload,
    400,
  );
}

export async function GET(request: Request): Promise<Response> {
  try {
    const sessionResult = await validateUserSession(request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const searchParams = new URL(request.url).searchParams;
    const { search, team, rarity, position, fav } = cardStatsQuerySchema.parse({
      search: searchParams.get("search")?.trim() || undefined,
      team: searchParams.get("team")?.trim() || undefined,
      rarity: searchParams.get("rarity") ?? undefined,
      position: searchParams.get("position") ?? undefined,
      fav: searchParams.get("fav") ?? undefined,
    });

    const stats = await getCardStore().getStats(sessionResult.session.user.id, {
      search,
      team,
      rarity,
      position,
      fav: typeof fav === "string" ? fav === "true" : undefined,
    });

    return finalizeSessionResponse(jsonResponse(stats, 200), sessionResult);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to fetch stats." } satisfies ApiErrorPayload, 500);
  }
}

export function OPTIONS(): Response {
  return emptyResponse(204);
}
