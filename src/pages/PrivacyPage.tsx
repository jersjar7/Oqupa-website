import { useEffect } from 'react'

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Política de Privacidad - Oqupa'
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-text-primary">
        Política de Privacidad
      </h1>
      <p className="mt-2 font-serif italic font-light text-sm text-text-secondary">
        Última actualización: 28 de abril de 2026
      </p>

      <div className="mt-8 space-y-8">
        {/* 1 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            1. Información que Recopilamos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Recopilamos la siguiente información cuando utilizas Oqupa:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>
              <strong>Nombre:</strong> utilizado para tu perfil dentro de la
              aplicación.
            </li>
            <li>
              <strong>Correo electrónico:</strong> utilizado para autenticación y
              comunicación relacionada con tu cuenta.
            </li>
            <li>
              <strong>Número de teléfono:</strong> utilizado para verificación de
              cuenta mediante código SMS y para facilitar la comunicación entre
              usuarios a través de WhatsApp.
            </li>
            <li>
              <strong>Foto de perfil:</strong> opcional, utilizada únicamente
              para mostrarse en tu perfil de usuario.
            </li>
            <li>
              <strong>Fotografías de propiedades:</strong> las fotos que tomas o
              seleccionas se utilizan exclusivamente para los anuncios de
              propiedades que publicas.
            </li>
            <li>
              <strong>Ubicación:</strong> utilizada únicamente para centrar el
              mapa cuando el usuario selecciona la ubicación de una propiedad. No
              rastreamos la ubicación de forma continua ni en segundo plano.
            </li>
            <li>
              <strong>Identificadores del dispositivo (token FCM):</strong>{' '}
              utilizado únicamente para enviarte notificaciones push relacionadas
              con tu cuenta y tus anuncios.
            </li>
            <li>
              <strong>Metadatos de pagos:</strong> cuando realizas una compra
              dentro de la aplicación (por ejemplo, un boost), almacenamos el
              identificador de la transacción, el monto y el estado del pago.{' '}
              <strong>
                No almacenamos información de tarjetas de crédito ni datos
                financieros sensibles
              </strong>{' '}
              — esta información es procesada directamente por Stripe.
            </li>
          </ul>
        </section>

        {/* 2 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            2. Uso de la Cámara
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa solicita acceso a la cámara de tu dispositivo{' '}
            <strong>únicamente</strong> para permitirte fotografiar propiedades
            que deseas publicar en tus anuncios. La cámara no se utiliza en
            segundo plano ni para ningún otro propósito.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            3. Uso de la Ubicación
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa solicita acceso a tu ubicación{' '}
            <strong>únicamente</strong> cuando seleccionas la ubicación de una
            propiedad en el mapa. Tu ubicación no se rastrea de forma continua,
            no se utiliza con fines analíticos y no se comparte con terceros.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            4. Notificaciones Push
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa utiliza Firebase Cloud Messaging (FCM) para enviarte
            notificaciones push relacionadas con eventos importantes de tu
            cuenta, tales como:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>Reclamos de leads por parte de asesores inmobiliarios.</li>
            <li>Cambios en el estado de tus anuncios.</li>
            <li>Revisiones de tu solicitud como asesor inmobiliario.</li>
            <li>Recordatorios de expiración de anuncios.</li>
          </ul>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Para enviarte notificaciones, almacenamos un token de dispositivo
            FCM asociado a tu cuenta. Puedes desactivar las notificaciones push
            en cualquier momento desde la configuración de tu dispositivo, lo
            que invalidará el token sin necesidad de eliminar tu cuenta.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            5. Procesamiento de Pagos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa ofrece funciones de pago opcionales (como boosts para destacar
            tus anuncios). El procesamiento de pagos se realiza a través de{' '}
            <strong>Stripe, Inc.</strong>, incluyendo métodos locales como{' '}
            <strong>Yape</strong> y <strong>Plin</strong>.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            <strong>Importante:</strong> Oqupa no recopila ni almacena
            información de tarjetas de crédito, datos bancarios ni credenciales
            financieras. Toda la información sensible de pago se ingresa
            directamente en formularios proporcionados por Stripe y queda en
            poder de Stripe, no de Oqupa. En nuestros sistemas únicamente
            guardamos el identificador de la transacción, el monto, el método de
            pago utilizado y el estado.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Para más información sobre cómo Stripe protege tu información,
            consulta la{' '}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              Política de Privacidad de Stripe
            </a>
            .
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            6. Cómo Usamos tu Información
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Utilizamos la información recopilada para:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>Gestionar y mantener tu cuenta.</li>
            <li>Verificar tu identidad mediante el código SMS enviado a tu número de teléfono.</li>
            <li>Publicar y mostrar tus anuncios de propiedades.</li>
            <li>
              Facilitar la comunicación entre usuarios interesados en
              propiedades.
            </li>
            <li>Procesar pagos por funciones opcionales como boosts.</li>
            <li>Enviar notificaciones push relacionadas con el servicio.</li>
            <li>Mejorar la funcionalidad y experiencia de la aplicación.</li>
            <li>Detectar y prevenir fraudes o usos indebidos.</li>
          </ul>
        </section>

        {/* 7 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            7. Almacenamiento y Seguridad
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Tus datos de cuenta y de anuncios se almacenan en{' '}
            <strong>Cloud Firestore</strong> (Google Cloud, región Brasil
            <code className="ml-1">southamerica-east1</code>). Las imágenes de
            propiedades y de perfil se almacenan en{' '}
            <strong>Cloudflare R2</strong> y se entregan vía CDN de Cloudflare.
            Implementamos medidas de seguridad estándar de la industria para
            proteger tus datos contra acceso no autorizado, alteración o
            destrucción, incluyendo cifrado en tránsito (TLS) y reglas de
            seguridad servidor a nivel de Firestore que restringen el acceso
            según la propiedad del recurso.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            8. Servicios de Terceros
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa utiliza los siguientes servicios de terceros:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>
              <strong>Firebase Authentication:</strong> para gestión de cuentas,
              autenticación con teléfono y federación con proveedores externos.{' '}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de Firebase
              </a>
            </li>
            <li>
              <strong>Cloud Firestore:</strong> base de datos para almacenamiento
              de datos de la aplicación.
            </li>
            <li>
              <strong>Cloudflare R2:</strong> almacenamiento de imágenes de
              propiedades y fotos de perfil.{' '}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de Cloudflare
              </a>
            </li>
            <li>
              <strong>Firebase Cloud Messaging (FCM):</strong> envío de
              notificaciones push.
            </li>
            <li>
              <strong>Google Maps:</strong> visualización y selección de
              ubicaciones de propiedades.
            </li>
            <li>
              <strong>Stripe, Inc.:</strong> procesamiento de pagos por
              funciones opcionales (boosts), incluyendo Yape y Plin para el
              mercado peruano.{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de Stripe
              </a>
            </li>
            <li>
              <strong>Google Sign-In:</strong> método de inicio de sesión
              opcional.{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de Google
              </a>
            </li>
            <li>
              <strong>Apple Sign-In:</strong> método de inicio de sesión
              opcional.{' '}
              <a
                href="https://www.apple.com/legal/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de Apple
              </a>
            </li>
          </ul>
        </section>

        {/* 9 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            9. Compartición de Datos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            No vendemos ni intercambiamos tu información personal con terceros.
            La información incluida en tus anuncios de propiedades (como fotos,
            descripción y datos de contacto) es visible para otros usuarios de la
            plataforma como parte del funcionamiento del servicio.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Compartimos información mínima e indispensable con los proveedores
            indicados en la sección 8 únicamente para que la aplicación funcione
            (por ejemplo, identificadores de pago con Stripe, claves de imagen
            con Cloudflare R2). Estos proveedores actúan como procesadores y
            están sujetos a sus propias políticas de privacidad.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            10. Eliminación de Cuenta y Datos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Tienes dos formas de eliminar tu cuenta y todos los datos asociados:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>
              <strong>Desde la aplicación:</strong> ingresa a tu perfil y
              selecciona la opción <strong>"Eliminar mi cuenta"</strong>. La
              eliminación se realiza de forma inmediata y borra tus datos
              personales, anuncios, fotos y tokens de notificación.
            </li>
            <li>
              <strong>Por correo electrónico:</strong> envía un correo a{' '}
              <a
                href="mailto:admin@oqupa.com"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                admin@oqupa.com
              </a>{' '}
              con el asunto <strong>"Eliminar mi cuenta"</strong>. Procesaremos
              tu solicitud dentro de un plazo razonable.
            </li>
          </ul>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Algunos registros pueden conservarse por períodos limitados cuando
            la ley lo exija (por ejemplo, registros contables de transacciones
            de pago).
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            11. Tus Derechos (Ley 29733 - Perú)
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            En cumplimiento de la <strong>Ley N° 29733</strong> de Protección de
            Datos Personales del Perú y su Reglamento, como titular de los datos
            tienes los siguientes derechos:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>
              <strong>Acceso:</strong> conocer qué datos personales tuyos
              tratamos.
            </li>
            <li>
              <strong>Rectificación:</strong> solicitar la corrección de datos
              inexactos.
            </li>
            <li>
              <strong>Cancelación / supresión:</strong> solicitar la eliminación
              de tus datos cuando dejen de ser necesarios o hayas retirado tu
              consentimiento.
            </li>
            <li>
              <strong>Oposición:</strong> oponerte al tratamiento de tus datos
              en supuestos previstos por la ley.
            </li>
          </ul>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Para ejercer cualquiera de estos derechos, contáctanos a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>
            . Si consideras que no hemos atendido adecuadamente tu solicitud,
            puedes presentar una reclamación ante la{' '}
            <strong>
              Autoridad Nacional de Protección de Datos Personales (Ministerio
              de Justicia y Derechos Humanos del Perú)
            </strong>
            .
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            12. Privacidad de los Niños
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa no está dirigida a menores de 18 años. No recopilamos
            intencionalmente información de menores de edad. Si descubrimos que
            hemos recopilado información de un menor de 18 años, tomaremos
            medidas para eliminar dicha información de nuestros sistemas.
          </p>
        </section>

        {/* 13 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            13. Cambios a esta Política
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Podemos actualizar esta Política de Privacidad periódicamente. Te
            notificaremos sobre cualquier cambio significativo a través de la
            aplicación o por correo electrónico. Te recomendamos revisar esta
            política regularmente.
          </p>
        </section>

        {/* 14 */}
        <section>
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            14. Contáctanos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Si tienes preguntas o inquietudes sobre esta Política de Privacidad,
            puedes contactarnos en{' '}
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
