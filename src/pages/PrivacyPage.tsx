import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function PrivacyPage() {
  // Sets the title, the description and — the part that matters for search —
  // a canonical link. Every route serves the same index.html, so without one
  // Google sees this page and the homepage as the same document.
  useDocumentMeta({
    title: 'Política de Privacidad - Oqupa',
    description: 'Cómo Oqupa recoge, usa y protege tus datos personales.',
    url: 'https://oqupa.com/privacy',
  })

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-[28px] font-normal text-text-primary">
        Política de Privacidad
      </h1>
      <p className="mt-2 font-serif italic font-light text-sm text-text-secondary">
        Última actualización: 31 de octubre de 2026
      </p>

      <div className="mt-8 space-y-8">
        {/* 1 — identity of the controller and its representative for Peru
            (DS 016-2024-JUS, art. 6.1 items 1 and 4, art. VII 7.1–7.2.1) */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            1. Quién es Responsable de tus Datos
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            El responsable del tratamiento de tus datos personales y titular
            de los bancos de datos donde se guardan es{' '}
            <strong>Oqupa LLC</strong>, una empresa registrada en Utah,
            Estados Unidos. Oqupa LLC no tiene establecimiento en el Perú, pero
            ofrece Oqupa a personas que están en el Perú; por eso cumple la{' '}
            <strong>Ley N° 29733</strong>, Ley de Protección de Datos
            Personales, y su Reglamento (Decreto Supremo N° 016-2024-JUS).
          </p>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Para cualquier asunto sobre tus datos — revocar tu consentimiento,
            ejercer tus derechos o hacer una consulta — escríbenos a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>
            .
          </p>

          <h3 className="mt-6 font-sans text-sm font-medium uppercase tracking-wide text-text-primary">
            Representante en el Perú
          </h3>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Conforme al artículo VII del Reglamento de la Ley N° 29733, Oqupa
            LLC designa como su representante para el territorio peruano a{' '}
            <strong>Jerson Garcia</strong>, quien actúa en nombre de Oqupa LLC.
            El representante es el punto de contacto con la{' '}
            <strong>
              Autoridad Nacional de Protección de Datos Personales
            </strong>{' '}
            y atiende las solicitudes de los titulares de datos personales —
            incluido el ejercicio de los derechos de acceso, rectificación,
            cancelación y oposición (derechos ARCO) — así como cualquier
            reclamación, denuncia o comunicación relacionada con el tratamiento
            de tus datos.
          </p>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Correo para comunicaciones y contacto con el representante:{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>
            .
          </p>

          <h3 className="mt-6 font-sans text-sm font-medium uppercase tracking-wide text-text-primary">
            Bancos de datos personales
          </h3>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Tus datos se guardan en los siguientes bancos de datos personales
            de Oqupa LLC:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
            <li>
              <strong>Usuarios:</strong> cuentas, perfiles, anuncios, guardados
              y actividad dentro de Oqupa.
            </li>
            <li>
              <strong>Asesores inmobiliarios:</strong> solicitudes para ser
              asesor y los anuncios que cada asesor reclama.
            </li>
            <li>
              <strong>Pagos:</strong> registros de las compras de boosts (sin
              datos de tarjetas).
            </li>
          </ul>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Estamos inscribiendo estos bancos de datos en el Registro Nacional
            de Protección de Datos Personales. Cuando la inscripción esté
            lista, publicaremos aquí sus códigos de inscripción.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            2. Información que Recopilamos
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Recopilamos la siguiente información cuando utilizas Oqupa:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
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
              identificador de la transacción, el monto, el método de pago (tarjeta, Link, Apple Pay o Google Pay) y el estado del pago.{' '}
              <strong>
                No almacenamos información de tarjetas de crédito ni datos
                financieros sensibles
              </strong>{' '}
              — esta información es procesada directamente por Stripe.
            </li>
            <li>
              <strong>Actividad de navegación:</strong> registramos qué anuncios
              visualizas y cuándo, para indicarte en la aplicación cuáles ya has
              visto y para llevar un conteo de vistas de cada anuncio. Esta
              información se conserva por un período limitado (hasta 45 días) y
              luego se elimina automáticamente.
            </li>
          </ul>

          {/* DS 016-2024-JUS art. 6.1 items 5 and 6: which answers are
              required, and what happens if you don't give them */}
          <h3 className="mt-6 font-sans text-sm font-medium uppercase tracking-wide text-text-primary">
            Qué datos son obligatorios
          </h3>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Puedes explorar el mapa y ver anuncios sin crear una cuenta y sin
            darnos ningún dato personal. Para crear una cuenta necesitas un
            correo electrónico y una contraseña, o iniciar sesión con Google o
            Apple; sin ellos no podemos crearla. Para publicar un anuncio o ver
            el contacto de un anunciante también debes confirmar tu correo y
            verificar tu número de teléfono; si no lo haces, puedes seguir
            explorando, pero no podrás publicar ni contactar. La foto de perfil
            y el acceso a tu ubicación son opcionales: si no los das, Oqupa
            funciona igual, solo que tu perfil no tendrá foto y el mapa no se
            centrará en tu ubicación.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            3. Uso de la Cámara
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Oqupa solicita acceso a la cámara de tu dispositivo{' '}
            <strong>únicamente</strong> para permitirte fotografiar propiedades
            que deseas publicar en tus anuncios. La cámara no se utiliza en
            segundo plano ni para ningún otro propósito.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            4. Uso de la Ubicación
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Oqupa solicita acceso a tu ubicación{' '}
            <strong>únicamente</strong> cuando seleccionas la ubicación de una
            propiedad en el mapa. Tu ubicación no se rastrea de forma continua,
            no se utiliza con fines analíticos y no se comparte con terceros.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            5. Notificaciones Push
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Oqupa utiliza Firebase Cloud Messaging (FCM) para enviarte
            notificaciones push relacionadas con eventos importantes de tu
            cuenta, tales como:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
            <li>Reclamos de leads por parte de asesores inmobiliarios.</li>
            <li>Cambios en el estado de tus anuncios.</li>
            <li>Revisiones de tu solicitud como asesor inmobiliario.</li>
            <li>Recordatorios de expiración de anuncios.</li>
          </ul>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Para enviarte notificaciones, almacenamos un token de dispositivo
            FCM asociado a tu cuenta. Puedes desactivar las notificaciones push
            en cualquier momento desde la configuración de tu dispositivo, lo
            que invalidará el token sin necesidad de eliminar tu cuenta.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            6. Procesamiento de Pagos
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Oqupa ofrece funciones de pago opcionales (como boosts para destacar
            tus anuncios). El procesamiento de pagos se realiza a través de{' '}
            <strong>Stripe, Inc.</strong>
          </p>
          <p className="mt-3 text-text-secondary leading-relaxed">
            <strong>Importante:</strong> Oqupa no recopila ni almacena
            información de tarjetas de crédito, datos bancarios ni credenciales
            financieras. Toda la información sensible de pago se ingresa
            directamente en formularios proporcionados por Stripe y queda en
            poder de Stripe, no de Oqupa. En nuestros sistemas únicamente
            guardamos el identificador de la transacción, el monto, el método de
            pago utilizado y el estado.
          </p>
          <p className="mt-3 text-text-secondary leading-relaxed">
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

        {/* 7 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            7. Cómo Usamos tu Información
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Utilizamos la información recopilada para:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
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

        {/* 8 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            8. Almacenamiento y Seguridad
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Tus datos de cuenta y de anuncios se almacenan en{' '}
            <strong>Cloud Firestore</strong> (Google Cloud, región Brasil
            <code className="ml-1">southamerica-east1</code>). Las imágenes de
            propiedades y de perfil se almacenan en{' '}
            <strong>Cloudflare R2</strong> y se entregan vía CDN de Cloudflare.
            Implementamos medidas de seguridad estándar de la industria para
            proteger tus datos contra acceso no autorizado, alteración o
            destrucción, incluyendo cifrado en tránsito (TLS) y reglas de
            seguridad servidor a nivel de Firestore que restringen el acceso
            según la propiedad del recurso. La sección 11 detalla en qué países
            se tratan tus datos.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            9. Servicios de Terceros
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Oqupa utiliza los siguientes servicios de terceros:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
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
              <strong>Mapbox:</strong> los mapas de la app y del sitio web.
              Recibe la zona del mapa que estás viendo y la dirección IP de tu
              dispositivo; no recibe tu nombre ni tu cuenta.{' '}
              <a
                href="https://www.mapbox.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de Mapbox
              </a>
            </li>
            <li>
              <strong>Google Maps (direcciones):</strong> cuando marcas la
              ubicación de una propiedad, nuestro servidor envía a Google solo
              las coordenadas de ese punto para obtener la dirección.
            </li>
            <li>
              <strong>Stripe, Inc.:</strong> procesamiento de pagos por
              funciones opcionales (boosts).{' '}
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
            <li>
              <strong>Google Analytics:</strong> medición de uso del sitio y de
              la app — páginas vistas, propiedades consultadas y registros.
              Solo recibe eventos anónimos: nunca tu nombre, correo, teléfono ni
              la dirección exacta de una propiedad.{' '}
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
              <strong>Meta (Facebook e Instagram):</strong> usamos las
              herramientas de medición de Meta — el píxel en la web y el SDK de
              Meta dentro de la app — para saber si nuestros anuncios funcionan.
              Meta recibe que ocurrió una acción — se vio una propiedad, se
              reveló un contacto, se creó una cuenta, se publicó un aviso —
              junto con el distrito de la propiedad. Desde la app, Meta también
              recibe un identificador publicitario del dispositivo (del
              teléfono, no tuyo) y el hecho de que la app se instaló o se abrió;
              eso es lo que permite saber si un anuncio produjo una instalación.
              Puedes restablecer o eliminar ese identificador desde los ajustes
              de tu teléfono.{' '}
              <strong>
                No enviamos tu nombre, correo, teléfono ni la dirección exacta
                de ninguna propiedad
              </strong>
              , y no usamos la función de emparejamiento avanzado de Meta. En
              iOS no mostramos la solicitud de seguimiento de Apple, así que
              Meta no recibe el identificador IDFA de tu iPhone.{' '}
              <a
                href="https://www.facebook.com/privacy/policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de Meta
              </a>
            </li>
            <li>
              <strong>TikTok:</strong> usamos el píxel de TikTok con el mismo
              criterio que el de Meta — para saber si nuestros anuncios
              funcionan. TikTok recibe que ocurrió una acción (se vio una
              propiedad, se creó una cuenta, se publicó un aviso) junto con el
              distrito.{' '}
              <strong>
                No enviamos tu nombre, correo, teléfono ni la dirección exacta
                de ninguna propiedad
              </strong>
              , y no usamos su función de emparejamiento avanzado.{' '}
              <a
                href="https://www.tiktok.com/legal/page/row/privacy-policy/es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de TikTok
              </a>
            </li>
            <li>
              <strong>Metricool:</strong> medición de visitas al sitio web
              (qué páginas se ven y de dónde llegan las visitas). No le
              enviamos tu nombre, correo ni teléfono.{' '}
              <a
                href="https://metricool.com/es/politica-privacidad/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover hover:underline"
              >
                Política de privacidad de Metricool
              </a>
            </li>
          </ul>

          <h3 className="mt-6 font-sans text-sm font-medium uppercase tracking-wide text-text-primary">
            Cómo supimos que llegaste
          </h3>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Guardamos en tu navegador una nota de cómo llegaste a Oqupa por
            primera vez — por ejemplo &quot;desde un anuncio de Facebook&quot; o
            &quot;desde una búsqueda en Google&quot; — para saber qué canales
            realmente nos traen personas. Si publicas una propiedad, esa nota se
            guarda junto al aviso. Contiene el nombre de la campaña y la fecha;
            no contiene ningún dato que te identifique. Se borra sola a los 90
            días y puedes eliminarla en cualquier momento borrando los datos del
            sitio en tu navegador.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            10. Compartición de Datos
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            No vendemos ni intercambiamos tu información personal con terceros.
            La información incluida en tus anuncios de propiedades (como fotos,
            descripción y datos de contacto) es visible para otros usuarios de la
            plataforma como parte del funcionamiento del servicio.
          </p>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Tu número de teléfono no aparece en los anuncios públicos: solo lo
            ven los usuarios con cuenta que confirmaron su correo y verificaron
            su teléfono, cuando piden el contacto de tu anuncio, y queda
            registrado quién lo pidió. Si un asesor inmobiliario verificado
            reclama tu anuncio, también puede ver tu número de WhatsApp, y tú
            ves su nombre y su teléfono.
          </p>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Compartimos información mínima e indispensable con los proveedores
            indicados en la sección 9 únicamente para que la aplicación funcione
            (por ejemplo, identificadores de pago con Stripe, claves de imagen
            con Cloudflare R2). Estos proveedores actúan como procesadores y
            están sujetos a sus propias políticas de privacidad.
          </p>
        </section>

        {/* 11 — cross-border flow (DS 016-2024-JUS art. 6.1 item 7,
            arts. 18–20). Every location below was checked against code and
            live config on 2026-10-31. */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            11. Transferencia Internacional (Flujo Transfronterizo)
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Oqupa no guarda tus datos en servidores ubicados en el Perú. Para
            que el servicio funcione, tus datos personales se envían y se
            tratan en otros países (flujo transfronterizo de datos personales):
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
            <li>
              <strong>Brasil (São Paulo):</strong> la base de datos principal
              (Cloud Firestore de Google Cloud, región{' '}
              <code>southamerica-east1</code>), donde están tu cuenta, tus
              anuncios y los registros de tus pagos, y la mayoría de nuestras
              funciones de servidor, incluido el envío de correos.
            </li>
            <li>
              <strong>Estados Unidos y otros países donde operan estos
              proveedores:</strong>
              <ul className="mt-2 list-[circle] space-y-2 pl-6">
                <li>
                  <strong>Google:</strong> inicio de sesión y verificación por
                  SMS (Firebase Authentication), notificaciones push (Firebase
                  Cloud Messaging), medición de uso (Google Analytics),
                  informes de errores de la app (Crashlytics), envío de correos
                  (Gmail) y obtención de direcciones (Google Maps).
                </li>
                <li>
                  <strong>Google Cloud, región Estados Unidos</strong> (
                  <code>us-central1</code>): algunas fotos de propiedades
                  antiguas guardadas en Firebase Storage, y el procesamiento
                  de las solicitudes para ser asesor inmobiliario, que se
                  envían por correo a nuestro equipo.
                </li>
                <li>
                  <strong>Cloudflare:</strong> almacenamiento y entrega de las
                  fotos (Cloudflare R2) y la red que sirve el sitio web.
                </li>
                <li>
                  <strong>Stripe:</strong> procesamiento de pagos.
                </li>
                <li>
                  <strong>Meta y TikTok:</strong> medición de anuncios, sin tu
                  nombre, correo ni teléfono.
                </li>
                <li>
                  <strong>Mapbox:</strong> mapas.
                </li>
                <li>
                  <strong>Apple:</strong> si inicias sesión con Apple, y para
                  entregar notificaciones en iPhone.
                </li>
              </ul>
            </li>
            <li>
              <strong>España:</strong> Metricool, medición de visitas al sitio
              web.
            </li>
          </ul>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Para proteger tus datos fuera del Perú aplicamos estas garantías:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
            <li>
              Cada proveedor trata los datos según los términos de protección
              de datos que forman parte de sus condiciones de servicio, y solo
              para prestarnos su servicio.
            </li>
            <li>
              Todo el tráfico entre tu dispositivo, nuestros servidores y los
              proveedores viaja cifrado (HTTPS/TLS).
            </li>
            <li>
              Enviamos a cada proveedor solo lo necesario para su función.
              Stripe recibe el monto y un identificador interno de tu cuenta,
              no tu nombre ni tu correo. Google Analytics, Meta, TikTok y
              Metricool no reciben tu nombre, correo, teléfono ni la dirección
              exacta de una propiedad.
            </li>
            <li>
              No guardamos datos de tarjetas: los ingresas directamente en el
              formulario de Stripe.
            </li>
            <li>
              Las reglas de seguridad de nuestra base de datos limitan quién
              puede leer cada dato.
            </li>
          </ul>
        </section>

        {/* 12 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            12. Eliminación de Cuenta y Datos
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Tienes dos formas de eliminar tu cuenta y todos los datos asociados:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
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
          <p className="mt-3 text-text-secondary leading-relaxed">
            Algunos registros pueden conservarse por períodos limitados cuando
            la ley lo exija (por ejemplo, registros contables de transacciones
            de pago). La sección 13 explica qué se conserva después de eliminar
            tu cuenta y por cuánto tiempo.
          </p>
        </section>

        {/* 13 — retention (DS 016-2024-JUS art. 6.1 item 9). Periods are the
            TTLs and cleanup jobs actually running on 2026-10-31; records with
            no TTL say so instead of inventing a period. */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            13. Plazo de Conservación
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
            <li>
              <strong>Tu cuenta y tu perfil:</strong> mientras tu cuenta exista.
            </li>
            <li>
              <strong>Cuentas sin terminar:</strong> las cuentas creadas con
              correo que nunca confirmaron el correo y no tienen anuncios se
              eliminan automáticamente a los 30 días.
            </li>
            <li>
              <strong>Anuncios que ya viste:</strong> 45 días.
            </li>
            <li>
              <strong>Registro de vistas de anuncios y de quién pidió cada
              contacto:</strong> 365 días.
            </li>
            <li>
              <strong>Nota de cómo llegaste a Oqupa</strong> (en tu navegador o
              teléfono): 90 días. Si se guardó en tu cuenta al registrarte, se
              conserva mientras tu cuenta exista.
            </li>
            <li>
              <strong>Registros de pagos:</strong> se conservan como registro
              contable y de auditoría, también después de eliminar tu cuenta.
            </li>
          </ul>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Cuando eliminas tu cuenta guardamos una constancia de la
            eliminación con tu nombre, correo, teléfono y una copia de tu
            perfil. También quedan los correos que te enviamos, tu solicitud
            para ser asesor inmobiliario si la hiciste, las respuestas a
            encuestas, los reportes que enviaste, los datos de las propiedades
            que publicaste y tus anuncios, que quedan desactivados. Hoy estos
            registros no tienen un plazo fijo de borrado: puedes pedir su
            supresión en cualquier momento escribiendo a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>
            .
          </p>
        </section>

        {/* 14 — automated decisions and profiling (DS 016-2024-JUS art. 6.1
            item 8, art. 87) */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            14. Decisiones Automatizadas
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Oqupa no toma decisiones automatizadas que produzcan efectos
            jurídicos sobre ti ni que te afecten de manera significativa. Estos
            son los procesos automáticos que existen:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
            <li>
              Cada noche agrupamos a los usuarios con cuenta según lo que hacen
              en Oqupa (por ejemplo, si publican, si buscan para comprar o
              alquilar, y su distrito) para medir cómo se usa el servicio. Estos
              grupos no se usan para negarte nada.
            </li>
            <li>
              Hay un límite automático de cuántos contactos de anunciantes
              puedes ver por día, para proteger sus números de teléfono.
            </li>
            <li>
              Las cuentas sin terminar se eliminan automáticamente a los 30
              días (sección 13).
            </li>
            <li>
              Google reCAPTCHA evalúa automáticamente el riesgo de abuso en
              algunas acciones del sitio web y en la verificación por teléfono.
            </li>
            <li>
              Los anuncios destacados con un boost aparecen antes que los demás.
            </li>
          </ul>
          <p className="mt-3 text-text-secondary leading-relaxed">
            La aprobación como asesor inmobiliario la decide una persona de
            nuestro equipo, no un sistema automático. Si crees que alguno de
            estos procesos te afectó, escríbenos a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>{' '}
            y una persona lo revisará.
          </p>
        </section>

        {/* 15 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            15. Tus Derechos (Ley 29733 - Perú)
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            En cumplimiento de la <strong>Ley N° 29733</strong> de Protección de
            Datos Personales del Perú y su Reglamento, como titular de los datos
            tienes los siguientes derechos:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-text-secondary leading-relaxed">
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
            <li>
              <strong>Información:</strong> saber para qué usamos tus datos, a
              quién se envían y por cuánto tiempo se conservan.
            </li>
            <li>
              <strong>Portabilidad:</strong> recibir los datos que nos diste en
              un formato estructurado y de uso común, para llevarlos a otro
              servicio.
            </li>
            <li>
              <strong>Tratamiento objetivo:</strong> no ser objeto de decisiones
              basadas solo en un tratamiento automatizado que te afecten de
              manera significativa (sección 14).
            </li>
            <li>
              <strong>Revocar tu consentimiento:</strong> en cualquier momento,
              sin dar explicaciones. Revocarlo no afecta lo que hicimos antes
              con tus datos.
            </li>
          </ul>

          {/* DS 016-2024-JUS art. 6.1 item 10; arts. 63–65 (request and
              identity), 69 (response times), 88–89 and the Fourth Final
              Complementary Provision (complaint to the ANPD) */}
          <h3 className="mt-6 font-sans text-sm font-medium uppercase tracking-wide text-text-primary">
            Cómo ejercer tus derechos
          </h3>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Escríbenos a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>
            , el correo que atiende nuestro representante en el Perú. Es
            gratuito. Indica tu nombre completo, qué derecho quieres ejercer y
            un correo o dirección para responderte. Si escribes desde el correo
            de tu cuenta de Oqupa, eso basta para identificarte; si no, podemos
            pedirte una copia de tu documento de identidad.
          </p>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Te responderemos dentro de los plazos del Reglamento de la Ley N°
            29733, contados desde el día siguiente a tu solicitud: 8 días para
            el derecho de información, 20 días para el derecho de acceso y 10
            días para rectificación, cancelación u oposición.
          </p>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Si no te respondemos a tiempo o la respuesta no te satisface, puedes
            presentar una reclamación ante la{' '}
            <strong>
              Autoridad Nacional de Protección de Datos Personales (Ministerio
              de Justicia y Derechos Humanos del Perú)
            </strong>
            , también a través de su plataforma digital &quot;Yo cuido mis
            datos personales&quot;. Guarda una copia de tu solicitud y de
            nuestra respuesta: la Autoridad las pide para tramitar la
            reclamación.
          </p>
        </section>

        {/* 16 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            16. Privacidad de los Niños
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Oqupa no está dirigida a menores de 18 años. No recopilamos
            intencionalmente información de menores de edad. Si descubrimos que
            hemos recopilado información de un menor de 18 años, tomaremos
            medidas para eliminar dicha información de nuestros sistemas.
          </p>
        </section>

        {/* 17 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            17. Cambios a esta Política
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Podemos actualizar esta Política de Privacidad periódicamente. Te
            notificaremos sobre cualquier cambio significativo a través de la
            aplicación o por correo electrónico. Te recomendamos revisar esta
            política regularmente.
          </p>
        </section>

        {/* 18 */}
        <section>
          <h2 className="font-serif text-xl font-normal text-text-primary">
            18. Contáctanos
          </h2>
          <p className="mt-3 text-text-secondary leading-relaxed">
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
          <p className="mt-3 text-text-secondary leading-relaxed">
            <strong>Oqupa LLC</strong> — Utah, Estados Unidos
            <br />
            Representante en el Perú: Jerson Garcia —{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              admin@oqupa.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
