export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details: unknown = null,
) {
  return Response.json(
    { success: false, error: { code, message, details, requestId: null } },
    { status },
  );
}
