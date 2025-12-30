// /server/src/middleware/notFoundHandler.js
// 404 handler
// Returns a JSON response when no matching route is found.

export function notFoundHandler(_req, res, _next) {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Route not found"
  });
}
