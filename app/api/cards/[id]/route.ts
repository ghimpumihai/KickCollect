import { ZodError } from "zod";

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
  return Response.json(
    {
      error: "Validation failed.",
      issues: error.issues.map((issue) => issue.message),
    } satisfies ApiErrorPayload,
    { status: 400 },
  );
}

function notFound(message: string): Response {
  return Response.json({ error: message } satisfies ApiErrorPayload, { status: 404 });
}

async function parseCardId(context: CardRouteContext): Promise<number> {
  const { id } = await context.params;
  return cardIdParamSchema.parse(id);
}

export async function GET(_request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const id = await parseCardId(context);
    const card = getCardStore().getById(id);

    if (!card) {
      return notFound("Card not found.");
    }

    return Response.json(card, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return Response.json({ error: "Unable to fetch card." } satisfies ApiErrorPayload, {
      status: 500,
    });
  }
}

export async function PUT(request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const id = await parseCardId(context);
    const payload = await request.json();
    const updated = getCardStore().update(id, payload);

    if (!updated) {
      return notFound("Card not found.");
    }

    return Response.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON body." } satisfies ApiErrorPayload, {
        status: 400,
      });
    }

    if (error instanceof ZodError) {
      return validationError(error);
    }

    return Response.json({ error: "Unable to update card." } satisfies ApiErrorPayload, {
      status: 500,
    });
  }
}

export async function DELETE(_request: Request, context: CardRouteContext): Promise<Response> {
  try {
    const id = await parseCardId(context);
    const deleted = getCardStore().delete(id);

    if (!deleted) {
      return notFound("Card not found.");
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    return Response.json({ error: "Unable to delete card." } satisfies ApiErrorPayload, {
      status: 500,
    });
  }
}
