import { ZodError } from "zod";

import { finalizeSessionResponse, validateUserSession } from "@/lib/auth/session";
import { emptyResponse, jsonResponse } from "@/lib/server/api-response";
import { getCardStore } from "@/lib/server/card-store";
import { cardListQuerySchema } from "@/lib/validation/card-api-schema";

export const dynamic = "force-dynamic";

type ApiErrorPayload = {
  error: string;
  issues?: string[];
};

function badRequest(message: string): Response {
  const payload: ApiErrorPayload = { error: message };
  return jsonResponse(payload, 400);
}

function forbidden(message: string): Response {
  const payload: ApiErrorPayload = { error: message };
  return jsonResponse(payload, 403);
}

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
    const { page, pageSize, search, team, rarity, position, fav } = cardListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search")?.trim() || undefined,
      team: searchParams.get("team")?.trim() || undefined,
      rarity: searchParams.get("rarity") ?? undefined,
      position: searchParams.get("position") ?? undefined,
      fav: searchParams.get("fav") ?? undefined,
    });

    const cards = await getCardStore().getPaginated(sessionResult.session.user.id, page, pageSize, {
      search,
      team,
      rarity,
      position,
      fav: typeof fav === "string" ? fav === "true" : undefined,
    });
    return finalizeSessionResponse(jsonResponse(cards, 200), sessionResult);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to fetch cards." } satisfies ApiErrorPayload, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const sessionResult = await validateUserSession(request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    if (sessionResult.session.user.role !== "ADMIN") {
      return finalizeSessionResponse(forbidden("Only admins can add cards."), sessionResult);
    }

    const payload = await request.json();
    const createdCard = await getCardStore().create(sessionResult.session.user.id, payload);

    return finalizeSessionResponse(jsonResponse(createdCard, 201), sessionResult);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Invalid JSON body.");
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to create card." } satisfies ApiErrorPayload, 500);
  }
}

export function OPTIONS(): Response {
  return emptyResponse(204);
}
