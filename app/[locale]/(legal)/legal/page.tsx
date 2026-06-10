import { getLocale } from "next-intl/server";
import { LegalShell } from "@/components/shared/legal-page";

export const metadata = { title: "Aviso legal · Legal notice" };

export default async function LegalNoticePage() {
  const locale = await getLocale();

  if (locale === "en") {
    return (
      <LegalShell title="Legal notice" updated="Last updated: June 2026">
        <h2>Site owner</h2>
        <p>
          Vendi (vendi.olcas.app) is a service operated by Olcas Apps
          ("Olcas"), tax ID [NIF], registered address [DIRECCIÓN FISCAL],
          Spain. Contact: vendi@olcas.app.
        </p>
        <h2>Purpose</h2>
        <p>
          Vendi is a platform that lets businesses create online stores,
          manage catalogs and orders, and accept card payments through
          Stripe. Each store published on Vendi is owned and operated by its
          respective merchant, who is solely responsible for its products,
          prices, shipping and customer service.
        </p>
        <h2>Intellectual property</h2>
        <p>
          The Vendi brand, design and software are property of Olcas. Content
          uploaded by merchants (texts, images, prices) belongs to its
          owners, who declare they hold the necessary rights.
        </p>
        <h2>Liability</h2>
        <p>
          Olcas provides the technical platform and is not a party to sales
          contracts between merchants and their customers. Olcas is not
          responsible for the accuracy of store content or for the goods and
          services sold by merchants.
        </p>
        <h2>Applicable law</h2>
        <p>
          These terms are governed by Spanish law. Any dispute will be
          submitted to the courts of the owner's registered address, without
          prejudice to mandatory consumer rules.
        </p>
      </LegalShell>
    );
  }

  return (
    <LegalShell title="Aviso legal" updated="Última actualización: junio 2026">
      <h2>Titular del sitio</h2>
      <p>
        Vendi (vendi.olcas.app) es un servicio operado por Olcas Apps
        ("Olcas"), NIF [NIF], con domicilio en [DIRECCIÓN FISCAL], España.
        Contacto: vendi@olcas.app.
      </p>
      <h2>Objeto</h2>
      <p>
        Vendi es una plataforma que permite a negocios crear tiendas online,
        gestionar catálogos y pedidos, y aceptar pagos con tarjeta a través
        de Stripe. Cada tienda publicada en Vendi pertenece a su comerciante,
        único responsable de sus productos, precios, envíos y atención al
        cliente.
      </p>
      <h2>Propiedad intelectual</h2>
      <p>
        La marca Vendi, su diseño y su software son propiedad de Olcas. Los
        contenidos subidos por los comerciantes (textos, imágenes, precios)
        pertenecen a sus titulares, que declaran disponer de los derechos
        necesarios.
      </p>
      <h2>Responsabilidad</h2>
      <p>
        Olcas presta la plataforma técnica y no es parte de los contratos de
        compraventa entre los comerciantes y sus clientes. Olcas no responde
        de la exactitud del contenido de las tiendas ni de los bienes y
        servicios vendidos por los comerciantes.
      </p>
      <h2>Ley aplicable</h2>
      <p>
        Este aviso se rige por la legislación española. Cualquier
        controversia se someterá a los juzgados del domicilio del titular,
        sin perjuicio de las normas imperativas de consumo.
      </p>
    </LegalShell>
  );
}
