export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/customers/:path*",
    "/users/:path*",
    "/vehicles/:path*",
    "/notifications/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/activity-log/:path*",
    "/profile/:path*",
  ],
};
