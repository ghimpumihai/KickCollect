import { ZodError } from "zod";

import { finalizeSessionResponse, validateUserSession } from "@/lib/auth/session";
import { emptyResponse, jsonResponse } from "@/lib/server/api-response";
import { getCardStore } from "@/lib/server/card-store";
import { cardIdParamSchema } from "@/lib/validation/card-api-schema";

export const dynamic = "force-dynamic";

type RouteParams = {
  id: string;
};

type CardRouteContext = {
  params: Promise<RouteParams>;
};

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

function notFound(message: string): Response {
  return jsonResponse({ error: message } satisfies ApiErrorPayload, 404);
}

async function parseCardId(context: CardRouteContext): Promise<number> {
  const { id } = await context.params;
  return cardIdParamSchema.parse(id);
}

export async function GET(_request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const sessionResult = await validateUserSession(_request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const id = await parseCardId(context);
      const card = await getCardStore().getById(sessionResult.session.user.id, id);

    if (!card) {
      return notFound("Card not found.");
    }

    return finalizeSessionResponse(jsonResponse(card, 200), sessionResult);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to fetch card." } satisfies ApiErrorPayload, 500);
  }
}

export async function PUT(request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const sessionResult = await validateUserSession(request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const id = await parseCardId(context);
    const payload = await request.json();
      const updated = await getCardStore().update(sessionResult.session.user.id, id, payload);

    if (!updated) {
      return notFound("Card not found.");
    }

    return finalizeSessionResponse(jsonResponse(updated, 200), sessionResult);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonResponse({ error: "Invalid JSON body." } satisfies ApiErrorPayload, 400);
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to update card." } satisfies ApiErrorPayload, 500);
  }
}

export async function DELETE(_request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const sessionResult = await validateUserSession(_request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const id = await parseCardId(context);
      const deleted = await getCardStore().delete(sessionResult.session.user.id, id);

    if (!deleted) {
      return notFound("Card not found.");
    }

    return finalizeSessionResponse(emptyResponse(204), sessionResult);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return jsonResponse({ error: "Unable to delete card." } satisfies ApiErrorPayload, 500);
  }
}

export function OPTIONS(): Response {
  return emptyResponse(204);
}
