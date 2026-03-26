export default async function handler(req: Request): Promise<Response> {
  return Response.json({
    status: "ok",
    city: "Dasmariñas",
    system: "DRRM IoT",
  });
}