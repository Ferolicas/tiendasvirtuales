import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "vendor" | "customer" } & DefaultSession["user"];
  }
  interface User {
    role?: "vendor" | "customer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "vendor" | "customer";
  }
}
