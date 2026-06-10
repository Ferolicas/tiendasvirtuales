import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateStoreForm } from "@/components/shared/create-store-form";

export const metadata = { title: "Panel" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const own = await db
    .select()
    .from(stores)
    .where(eq(stores.ownerId, session.user.id));

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tus tiendas</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tus tiendas, productos y pedidos.
        </p>
      </div>

      {own.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {own.map((store) => (
            <Card key={store.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{store.name}</CardTitle>
                  <Badge variant={store.plan === "pro" ? "default" : "secondary"}>
                    {store.plan}
                  </Badge>
                </div>
                <CardDescription>
                  {store.description ?? "Sin descripción"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" asChild>
                  <Link href={`/dashboard/stores/${store.id}`}>Gestionar</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/s/${store.slug}`} target="_blank">
                    Ver tienda
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavía no tienes ninguna tienda. Crea la primera:
        </p>
      )}

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Nueva tienda</CardTitle>
          <CardDescription>
            Dale un nombre y empieza a vender en minutos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateStoreForm />
        </CardContent>
      </Card>
    </div>
  );
}
