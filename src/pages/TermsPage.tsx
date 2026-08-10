import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function TermsPage() {
  // Sets the title, the description and — the part that matters for search —
  // a canonical link. Every route serves the same index.html, so without one
  // Google sees this page and the homepage as the same document.
  useDocumentMeta({
    title: 'Términos de Servicio - Oqupa',
    description: 'Condiciones de uso de Oqupa, el catálogo de propiedades de Piura.',
    url: 'https://oqupa.com/terms',
  })

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-text-primary">
        Términos de Servicio
      </h1>
      <p className="mt-2 font-serif italic font-light text-sm text-text-secondary">
        Última actualización: 28 de abril de 2026
      </p>

      <div className="mt-8 space-y-8">
        {/* 1 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            1. Introducción
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Bienvenido a Oqupa, un servicio proporcionado por{' '}
            <strong>Oqupa LLC</strong>, una empresa registrada en Utah, Estados
            Unidos. Al acceder o utilizar la aplicación Oqupa, aceptas estos
            Términos de Servicio en su totalidad. Si no estás de acuerdo con
            estos términos, no debes utilizar el servicio.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            2. Descripción del Servicio
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa es una plataforma que permite a los usuarios publicar y buscar
            anuncios de propiedades inmobiliarias en Perú. Oqupa actúa
            únicamente como intermediario tecnológico y no es parte de ninguna
            transacción inmobiliaria entre usuarios.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            3. Elegibilidad
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Para utilizar Oqupa, debes tener al menos 18 años de edad. Al
            registrarte, confirmas que cumples con este requisito.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            4. Registro de Cuenta
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Al crear una cuenta en Oqupa, te comprometes a:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>Proporcionar información veraz y actualizada.</li>
            <li>
              Verificar tu número de teléfono mediante el código SMS que
              enviamos como parte del proceso de registro.
            </li>
            <li>
              Ser responsable de mantener la confidencialidad de tus
              credenciales de acceso.
            </li>
            <li>
              Notificar inmediatamente a Oqupa sobre cualquier uso no autorizado
              de tu cuenta enviando un correo a{' '}
              <a
                href="mailto:admin@oqupa.com"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                admin@oqupa.com
              </a>
              .
            </li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            5. Contenido del Usuario y Anuncios
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Los usuarios son propietarios del contenido que publican en Oqupa. Al
            publicar contenido, otorgas a Oqupa una licencia no exclusiva,
            mundial y libre de regalías para mostrar, distribuir y promover dicho
            contenido dentro de la plataforma.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            El contenido publicado debe cumplir con las siguientes condiciones:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>Ser veraz y representar propiedades reales.</li>
            <li>
              Que el publicante sea propietario o tenga autorización del
              propietario para publicar la propiedad.
            </li>
            <li>
              No infringir derechos de propiedad intelectual de terceros.
            </li>
            <li>Cumplir con la legislación peruana aplicable.</li>
          </ul>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa se reserva el derecho de eliminar cualquier contenido que viole
            estos términos o que considere inapropiado.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            6. Uso Aceptable
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Al utilizar Oqupa, te comprometes a no:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>Publicar anuncios falsos o engañosos.</li>
            <li>Suplantar la identidad de otra persona o entidad.</li>
            <li>Acosar, amenazar o intimidar a otros usuarios.</li>
            <li>Utilizar la plataforma para actividades ilegales.</li>
            <li>
              Realizar scraping, extracción automatizada de datos u otras
              técnicas similares.
            </li>
            <li>
              Intentar acceder de forma no autorizada a los sistemas de Oqupa.
            </li>
            <li>Publicar contenido ofensivo, discriminatorio o difamatorio.</li>
            <li>Enviar spam o comunicaciones no solicitadas a otros usuarios.</li>
          </ul>
        </section>

        {/* 7 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            7. Tarifas y Pagos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            El uso básico de Oqupa para publicar y buscar anuncios es{' '}
            <strong>gratuito</strong>. Oqupa ofrece adicionalmente funciones de
            pago opcionales:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>
              <strong>Boosts:</strong> permiten destacar un anuncio dentro de
              los resultados de búsqueda durante un período determinado, por una
              tarifa fija indicada en la aplicación al momento de la compra.
            </li>
          </ul>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Los pagos se procesan a través de <strong>Stripe, Inc.</strong> Los
            precios se muestran en la aplicación antes de confirmar la compra. Al
            completar un pago, autorizas a
            Stripe a cargar el monto correspondiente en tu método de pago
            seleccionado.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa no almacena información de tarjetas de crédito ni datos
            financieros sensibles — esta información es procesada y custodiada
            directamente por Stripe.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa se reserva el derecho de modificar los precios, introducir
            nuevas funciones de pago o cambiar las condiciones de las
            existentes, notificando a los usuarios con antelación razonable.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            8. Política de Reembolsos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Puedes solicitar el reembolso de un boost dentro de las{' '}
            <strong>48 horas</strong> posteriores a la compra, siempre que el
            servicio no haya sido consumido en su totalidad. Las solicitudes de
            reembolso se realizan desde la aplicación o enviando un correo a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>{' '}
            indicando el identificador de la transacción.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Transcurridas las 48 horas, los pagos se consideran no reembolsables,
            salvo en los casos en que la legislación peruana de protección al
            consumidor lo exija. Los reembolsos se acreditan al método de pago
            original a través de Stripe; el plazo de acreditación depende del
            emisor.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            9. Programa de Asesores Inmobiliarios
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa permite a usuarios verificados solicitar acceso al programa de
            asesores inmobiliarios. Al ser aprobado, podrás reclamar leads
            disponibles y contactar a usuarios interesados en propiedades. Los
            asesores se comprometen a:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>
              Proporcionar un servicio profesional, honesto y respetuoso a los
              usuarios cuyos leads sean reclamados.
            </li>
            <li>
              No utilizar los datos de contacto obtenidos para fines distintos a
              la atención del lead específico.
            </li>
            <li>
              Cumplir con la legislación peruana aplicable a la actividad
              inmobiliaria.
            </li>
          </ul>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa se reserva el derecho de revocar el acceso al programa ante
            quejas razonables, comportamiento no profesional o uso indebido de
            la información de los leads.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            10. Propiedad Intelectual
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            La marca Oqupa, su logotipo, diseño de la aplicación y código fuente
            son propiedad exclusiva de <strong>Oqupa LLC</strong>. Queda
            prohibida su reproducción, distribución o modificación sin
            autorización expresa por escrito.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            11. Descargo de Responsabilidad
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa es únicamente una plataforma tecnológica. No garantizamos la
            exactitud, veracidad o legalidad de los anuncios publicados por los
            usuarios. El servicio se proporciona "tal cual" (<em>as is</em>) sin
            garantías de ningún tipo, ya sean expresas o implícitas.
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            12. Limitación de Responsabilidad
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            En la máxima medida permitida por la ley, Oqupa LLC no será
            responsable por daños indirectos, incidentales, especiales,
            consecuentes o punitivos, ni por cualquier pérdida de beneficios o
            ingresos, ya sea directa o indirecta, derivada del uso o la
            imposibilidad de uso del servicio.
          </p>
        </section>

        {/* 13 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            13. Terminación de Cuenta
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa se reserva el derecho de suspender o cancelar cuentas que
            violen estos Términos de Servicio. Los usuarios pueden eliminar su
            cuenta en cualquier momento desde la opción{' '}
            <strong>"Eliminar mi cuenta"</strong> dentro de la aplicación, o
            enviando un correo electrónico a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>
            .
          </p>
        </section>

        {/* 14 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            14. Ley Aplicable
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Estos Términos de Servicio se rigen por las leyes del estado de
            Utah, Estados Unidos. Asimismo, Oqupa cumple con las regulaciones
            peruanas aplicables en relación con la operación del servicio en
            Perú, incluyendo la <strong>Ley N° 29733</strong> de Protección de
            Datos Personales y las normas de protección al consumidor.
          </p>
        </section>

        {/* 15 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            15. Cambios a estos Términos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Podemos modificar estos Términos de Servicio en cualquier momento. Te
            notificaremos sobre cambios significativos a través de la aplicación
            o por correo electrónico. El uso continuado de Oqupa después de
            dichos cambios constituye tu aceptación de los términos
            actualizados.
          </p>
        </section>

        {/* 16 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            16. Contáctanos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Si tienes preguntas sobre estos Términos de Servicio, puedes
            contactarnos en{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>
            .
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            <strong>Oqupa LLC</strong>
          </p>
        </section>
      </div>
    </div>
  )
}
