import { useEffect } from 'react'

export default function TermsPage() {
  useEffect(() => {
    document.title = 'Términos de Servicio - Oqupa'
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text-primary">
        Términos de Servicio
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Última actualización: 15 de febrero de 2026
      </p>

      <div className="mt-8 space-y-8">
        {/* 1 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
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
          <h2 className="text-xl font-semibold text-text-primary">
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
          <h2 className="text-xl font-semibold text-text-primary">
            3. Elegibilidad
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Para utilizar Oqupa, debes tener al menos 18 años de edad. Al
            registrarte, confirmas que cumples con este requisito.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            4. Registro de Cuenta
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Al crear una cuenta en Oqupa, te comprometes a:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>Proporcionar información veraz y actualizada.</li>
            <li>
              Ser responsable de mantener la confidencialidad de tus
              credenciales de acceso.
            </li>
            <li>
              Notificar inmediatamente a Oqupa sobre cualquier uso no autorizado
              de tu cuenta enviando un correo a{' '}
              <a
                href="mailto:admin@oqupa.com"
                className="text-primary hover:underline"
              >
                admin@oqupa.com
              </a>
              .
            </li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
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
          <h2 className="text-xl font-semibold text-text-primary">
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
          <h2 className="text-xl font-semibold text-text-primary">
            7. Tarifas y Pagos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Actualmente, el uso de Oqupa es <strong>gratuito</strong>. Nos
            reservamos el derecho de introducir funciones de pago en el futuro.
            En caso de implementar tarifas, los usuarios serán notificados con
            antelación suficiente.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            8. Propiedad Intelectual
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            La marca Oqupa, su logotipo, diseño de la aplicación y código fuente
            son propiedad exclusiva de <strong>Oqupa LLC</strong>. Queda
            prohibida su reproducción, distribución o modificación sin
            autorización expresa por escrito.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            9. Descargo de Responsabilidad
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa es únicamente una plataforma tecnológica. No garantizamos la
            exactitud, veracidad o legalidad de los anuncios publicados por los
            usuarios. El servicio se proporciona "tal cual" (<em>as is</em>) sin
            garantías de ningún tipo, ya sean expresas o implícitas.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            10. Limitación de Responsabilidad
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            En la máxima medida permitida por la ley, Oqupa LLC no será
            responsable por daños indirectos, incidentales, especiales,
            consecuentes o punitivos, ni por cualquier pérdida de beneficios o
            ingresos, ya sea directa o indirecta, derivada del uso o la
            imposibilidad de uso del servicio.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            11. Terminación de Cuenta
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa se reserva el derecho de suspender o cancelar cuentas que
            violen estos Términos de Servicio. Los usuarios pueden solicitar la
            eliminación de su cuenta en cualquier momento enviando un correo
            electrónico a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:underline"
            >
              admin@oqupa.com
            </a>
            .
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            12. Ley Aplicable
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Estos Términos de Servicio se rigen por las leyes del estado de
            Utah, Estados Unidos. Asimismo, Oqupa cumple con las regulaciones
            peruanas aplicables en relación con la operación del servicio en
            Perú.
          </p>
        </section>

        {/* 13 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            13. Cambios a estos Términos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Podemos modificar estos Términos de Servicio en cualquier momento. Te
            notificaremos sobre cambios significativos a través de la aplicación
            o por correo electrónico. El uso continuado de Oqupa después de
            dichos cambios constituye tu aceptación de los términos
            actualizados.
          </p>
        </section>

        {/* 14 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            14. Contáctanos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Si tienes preguntas sobre estos Términos de Servicio, puedes
            contactarnos en{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:underline"
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
