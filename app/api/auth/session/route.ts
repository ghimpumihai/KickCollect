import { finalizeSessionResponse, validateUserSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

async function resolveSession(request: Request): Promise<Response> {
  const result = await validateUserSession(request);

  if (!result.ok) {
    return result.response;
  }

  return finalizeSessionResponse(Response.json(result.session, { status: 200 }), result);
}

export async function GET(request: Request): Promise<Response> {
  return resolveSession(request);
}

export async function POST(request: Request): Promise<Response> {
  return resolveSession(request);
}
