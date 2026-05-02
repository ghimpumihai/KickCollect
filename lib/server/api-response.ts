const allowedOrigin = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin && allowedOrigin.length > 0 ? allowedOrigin : "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

export function emptyResponse(status = 204): Response {
  return new Response(null, { status, headers: corsHeaders });
}