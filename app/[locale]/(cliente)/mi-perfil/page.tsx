import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { CustomerProfileForm } from "@/components/shared/customer-profile-form";

export const dynamic = "force-dynamic";

export default async function MiPerfilPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [me] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      address: users.address,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Tu dirección se usa como envío predeterminado en tus compras.
        </p>
      </div>
      <div className="max-w-md rounded-3xl border bg-card p-6 shadow-soft">
        <CustomerProfileForm
          initial={{
            name: me?.name ?? "",
            email: me?.email ?? "",
            phone: me?.phone ?? "",
            address: me?.address ?? "",
          }}
        />
      </div>
    </div>
  );
}
