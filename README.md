# Our House

## Descripción

Our House PI es una plataforma web orientada a facilitar la organización y administración del hogar compartido. El sistema ayuda a gestionar gastos comunes, ingresos mensuales, tareas domésticas y la convivencia entre integrantes de una vivienda, reduciendo la necesidad de coordinar estas actividades de forma manual y evitando errores en el reparto de responsabilidades.

La solución está diseñada para familias, roommates o grupos de convivencia que necesitan un espacio centralizado para llevar el control financiero y operativo del hogar. Entre sus principales funcionalidades se encuentran la creación y unión a viviendas, registro de gastos, cálculo de saldos, seguimiento de tareas, gestión de integrantes y control de ingresos mensuales por usuario.

## Stack Tecnológico

### Frontend
- Framework: React + TypeScript + Vite.
- Estilos: CSS Personalizado / diseño modular, con componentes reutilizables.

### Backend
- Framework: Firebase (Authentication + Firestore) como Backend-as-a-Service (BaaS).
- Autenticación: Firebase Authentication, validaciones de formularios y seguridad basada en reglas de Firestore.

### Base de Datos y Persistencia: 
- Motor de BD: Firestore
- ORM / ODM: SDK nativo de Firebase / Firestore sin ORM

### Herramientas y Entorno:
- Control de Versiones: Git & GitHub.
- Gestión de Paquetes: npm

## Arquitectura del Sistema

![Diagrama de Arquitectura](./docs/arquitectura.png)

### Descripción
- El usuario accede a la aplicación web desde el navegador.
- La capa frontend consume servicios para autenticación, gestión de vivienda, gastos, ingresos y tareas.
- Firebase Auth gestiona la autenticación de usuarios.
- Firestore almacena la información de viviendas, usuarios, gastos, tareas e ingresos.
- La lógica de negocio se implementa en servicios del frontend para mantener una experiencia ágil y centralizada.
- La interfaz se actualiza en tiempo real según la información recuperada de Firebase.

## Estrategia de Ramas

Para este proyecto adoptamos una estrategia basada en Feature Branching que garantiza la trazabilidad y la calidad del código mediante la revisión entre pares.

### Reglas Principales:
1. Rama main: Representa el código estable y listo para producción/despliegue. Nadie hace commits directos sobre esta rama.
2. Ramas feature: Se crea una rama dedicada por cada Historia de Usuario (HU) a desarrollar.
- Nomenclatura recomendada: feature/HU-[Número]-[NombreBreve].
- Ejemplo: feature/HU-01-login-usuario.
3. Flujo de Integración:
- Cada ingeniero trabaja en su rama de feature asignada.
- Al finalizar, se solicita la integración mediante un Pull Request (PR) hacia la rama principal.
- Todo PR debe ser revisado y aprobado por otro integrante del equipo antes de realizar el merge.

## Convención de Commits

Para mantener un historial claro, descriptivo y estructurado, utilizamos Conventional Commits:

| Prefijo | Uso / Significado | Ejemplo |
| :--- | :--- | :--- |
| `feat:` | Incorporación de una nueva funcionalidad o Historia de Usuario | `feat(HU-01): agregar formulario de registro de usuarios` |
| `fix:` | Corrección de un error o bug en el código | `fix(HU-02): corregir validación del campo correo` |
| `docs:` | Modificaciones en documentación (README, comentarios) | `docs: actualizar guía de instalación en README` |
| `style:` | Cambios de formato, espacios o estilos CSS que no afectan la lógica | `style: ajustar márgenes del botón principal` |
| `refactor:`| Reorganización de código que no añade funcionalidades ni corrige bugs | `refactor: optimizar función de autenticación` |
| `test:` | Adición o corrección de pruebas unitarias o de integración | `test: agregar pruebas para el servicio de usuarios` |

## Integrantes del Equipo

- **Yenaro Samuel Gracia Ruiz**
- **Gabriela Chavez Aguilera** 
- **Santiago Morales Suarez** 
- **Alan Basante Portilla** 

## Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/yenaro-design/our-house-PI.git
   cd our-house-PI
2. **Entrar al proyecto frontend:**
   ```bash
   cd our-house
3. **Instalar dependencias:**
   ```bash
   npm install
4. **Instalar dependencias:**
   Crea un archivo .env en la raíz del proyecto con las siguientes variables:
   ```bash
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
   VITE_FIREBASE_PROJECT_ID=tu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id

5. **Ejecutar la aplicación en modo desarrollo:**
   ```bash
   npm run dev

6. **Abrir la app en el navegador:**
   ```bash
   http://localhost:3000

7. **Compilar para producción:**
   ```bash
   npm run build

## Funcionalidades Principales

- Registro e inicio de sesión de usuarios
- Creación de viviendas y generación de códigos de invitación
- Unión a viviendas existentes
- Registro de gastos compartidos
- Cálculo automático de deudas y saldos
- Gestión de ingresos mensuales
- Asignación y seguimiento de tareas domésticas
- Visualización del estado general del hogar

## Objetivo del Proyecto

Our House PI busca simplificar la administración doméstica mediante una herramienta digital intuitiva que permita mejorar la organización financiera y operativa del hogar compartido. La aplicación ofrece una experiencia centralizada para que cada integrante pueda colaborar de manera ordenada, transparente y eficiente.

## Despliegue en Netlify

El repositorio incluye la configuración de Netlify en `netlify.toml`. Al conectar el repositorio en Netlify, no es necesario completar manualmente los ajustes de build:

- **Base directory:** `our-house`
- **Build command:** `npm run build`
- **Publish directory:** `dist`

Antes del despliegue, agrega en Netlify las variables de entorno `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_PROJECT_ID` y `VITE_FIREBASE_STORAGE_BUCKET`, usando los valores de tu archivo `.env` local. No subas el archivo `.env` al repositorio.
