import { useEffect } from 'react'

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Política de Privacidad - Oqupa'
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text-primary">
        Política de Privacidad
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Última actualización: 13 de febrero de 2026
      </p>

      <div className="mt-8 space-y-8">
        {/* 1 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
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
              cuenta y para facilitar la comunicación entre usuarios a través de
              WhatsApp.
            </li>
            <li>
              <strong>Fotografías:</strong> las fotos que tomas o seleccionas se
              utilizan exclusivamente para los anuncios de propiedades que
              publicas.
            </li>
            <li>
              <strong>Ubicación:</strong> utilizada únicamente para centrar el
              mapa cuando el usuario selecciona la ubicación de una propiedad.
            </li>
          </ul>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
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
          <h2 className="text-xl font-semibold text-text-primary">
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
          <h2 className="text-xl font-semibold text-text-primary">
            4. Cómo Usamos tu Información
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Utilizamos la información recopilada para:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>Gestionar y mantener tu cuenta.</li>
            <li>Publicar y mostrar tus anuncios de propiedades.</li>
            <li>
              Facilitar la comunicación entre usuarios interesados en
              propiedades.
            </li>
            <li>Enviar notificaciones relacionadas con el servicio.</li>
            <li>Mejorar la funcionalidad y experiencia de la aplicación.</li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            5. Almacenamiento y Seguridad
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Tu información se almacena de forma segura en Google Cloud a través
            de Firebase. Implementamos medidas de seguridad estándar de la
            industria para proteger tus datos contra acceso no autorizado,
            alteración o destrucción.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            6. Servicios de Terceros
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa utiliza los siguientes servicios de terceros:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-600 leading-relaxed">
            <li>
              <strong>Firebase Authentication:</strong> para gestión de cuentas y
              autenticación de usuarios.{' '}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Política de privacidad de Firebase
              </a>
            </li>
            <li>
              <strong>Cloud Firestore:</strong> para almacenamiento de datos de
              la aplicación.{' '}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Política de privacidad de Firebase
              </a>
            </li>
            <li>
              <strong>Firebase Cloud Storage:</strong> para almacenamiento de
              imágenes de propiedades.{' '}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Política de privacidad de Firebase
              </a>
            </li>
            <li>
              <strong>Google Maps:</strong> para la visualización y selección de
              ubicaciones de propiedades.
            </li>
            <li>
              <strong>Google Sign-In:</strong> como método de inicio de sesión.{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Política de privacidad de Google
              </a>
            </li>
            <li>
              <strong>Apple Sign-In:</strong> como método de inicio de sesión.{' '}
              <a
                href="https://www.apple.com/legal/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Política de privacidad de Apple
              </a>
            </li>
          </ul>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            7. Compartición de Datos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            No vendemos ni intercambiamos tu información personal con terceros.
            La información incluida en tus anuncios de propiedades (como fotos,
            descripción y datos de contacto) es visible para otros usuarios de la
            plataforma como parte del funcionamiento del servicio.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            8. Eliminación de Cuenta y Datos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Si deseas eliminar tu cuenta y todos los datos asociados, puedes
            enviar un correo electrónico a{' '}
            <a
              href="mailto:admin@oqupa.com"
              className="text-primary hover:underline"
            >
              admin@oqupa.com
            </a>{' '}
            con el asunto <strong>"Eliminar mi cuenta"</strong>. Procesaremos tu
            solicitud y eliminaremos tus datos de nuestros sistemas.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            9. Privacidad de los Niños
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Oqupa no está dirigida a menores de 18 años. No recopilamos
            intencionalmente información de menores de edad. Si descubrimos que
            hemos recopilado información de un menor de 18 años, tomaremos
            medidas para eliminar dicha información de nuestros sistemas.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            10. Cambios a esta Política
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Podemos actualizar esta Política de Privacidad periódicamente. Te
            notificaremos sobre cualquier cambio significativo a través de la
            aplicación o por correo electrónico. Te recomendamos revisar esta
            política regularmente.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary">
            11. Contáctanos
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Si tienes preguntas o inquietudes sobre esta Política de Privacidad,
            puedes contactarnos en{' '}
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
