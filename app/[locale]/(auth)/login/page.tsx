import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Si ya hay sesión activa, no pedimos login otra vez: directo a su espacio.
  const session = await auth();
  if (session?.user) {
    redirect(
      session.user.role === "customer" ? "/explorar" : "/dashboard/orders"
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-24">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
