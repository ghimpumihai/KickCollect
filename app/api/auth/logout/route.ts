import { destroySession } from "@/lib/auth/session";

export async function POST(request: Request): Promise<Response> {
  const clearedCookie = await destroySession(request);
  const response = new Response(null, { status: 204 });
  response.headers.append("set-cookie", clearedCookie);
  return response;
}
