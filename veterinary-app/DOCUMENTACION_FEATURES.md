# 🐾 Documentación de Funcionalidades - VetCare Pro v1.0

VetCare Pro es un completo sistema de gestión veterinaria **100% local, seguro y autónomo** que corre directamente en el navegador del usuario utilizando **IndexedDB** como motor de base de datos local y permanente.

---

## 📊 1. Dashboard Principal (Panel de Control)
* **Estadísticas en Tiempo Real**: Visualización del total de pacientes registrados y de la cantidad de servicios médicos realizados durante el mes en curso.
* **Acciones Rápidas**: Accesos directos para registrar pacientes nuevos, asentar servicios en el historial y realizar respaldos de base de datos con un clic.
* **Agenda del Día**: Vista compacta de los turnos programados para la fecha actual, ordenados cronológicamente con indicador de estado.
* **Distribución de Especies**: Gráfico de distribución porcentual en tiempo real de los pacientes atendidos (Perros, Gatos, Aves, Reptiles, etc.).
* **Vacunas Próximas**: Panel de alerta temprana con alertas de dosis programadas para los próximos 30 días e indicadores destacados en color rojo para dosis vencidas.

---

## 🐶 2. Gestión de Pacientes (Fichero Clínico)
* **Ficha de Identificación Completa**:
  * **Datos del Animal**: Nombre, especie, raza, sexo, condición de esterilización/castración, edad calculada, peso, color, número de microchip y señas particulares.
  * **Fotografía**: Permite cargar y almacenar de forma segura la foto de la mascota de forma local (en Base64).
  * **Datos del Propietario**: Nombre del tutor, número telefónico principal (para comunicación rápida por WhatsApp), correo electrónico y domicilio.
* **Alertas Médicas Destacadas**: Sección visual destacada en rojo permanente para registrar condiciones críticas como alergias graves a medicamentos o patologías crónicas.
* **Pestañas de Historial Navegables**:
  * **Historial Clínico**: Tabla cronológica completa con todos los servicios y observaciones del animal.
  * **Calendario de Vacunas**: Registro de vacunas recibidas, lotes y dosis de refuerzo agendadas.
  * **Recetario Médico**: Historial de fórmulas médicas expedidas y tratamientos recetados.

---

## 📅 3. Agenda Integrada de Turnos
* **Programación de Citas**: Modal de registro detallando paciente, fecha, hora, tipo de turno (Consulta, Cirugía, Estética, etc.) y observaciones.
* **Filtros Inteligentes**: Segmentación rápida de la agenda por marcos de tiempo (*Hoy, Esta Semana, Este Mes*) o por estado de la cita.
* **Gestión de Estados**: Selector premium y espacioso (`w-32` para evitar sobrelapamientos) para actualizar de forma rápida el estado del turno:
  * **Pendiente** (Color amarillo)
  * **Confirmado** (Color azul)
  * **Atendido** (Color verde)
  * **Cancelado** (Color gris)

---

## 🩺 4. Registro y Reportes de Servicios Veterinarios
* **Historial Completo**: Registro unificado de prestaciones médicas con asignación del profesional a cargo y observaciones del caso.
* **Descuento de Insumos Automático**: Sección opcional para elegir un producto del inventario consumido en la sesión (ej. Shampoo en un baño, jeringa o antibiótico en un tratamiento), **descontándolo de forma automática y en tiempo real** de la base de datos al guardar la consulta.
* **Buscador Universal**: Filtrado dinámico por tipo de servicio, profesional o nombre del paciente.

---

## 📦 5. Sistema de Inventario de Productos y Reportes
* **Panel de Control del Inventario**:
  * **Total de Productos**: Contador de ítems en el catálogo.
  * **Alerta de Stock Bajo**: Indicador con icono de advertencia amarillo si un producto queda con existencias iguales o inferiores a su stock mínimo.
  * **Alerta Sin Stock**: Contador con icono de error rojo para insumos agotados.
* **Catálogo de Insumos**: Tabla organizada con nombre del insumo, stock disponible, stock mínimo (límite de alerta), precio unitario y etiquetas automáticas de nivel de stock (Normal 🟢, Bajo 🟡, Agotado 🔴).
* **Administrador de Stock**: Permite registrar y modificar ítems especificando sus existencias de seguridad, precio e indicaciones de uso.

---

## 💬 6. Integración Inteligente con WhatsApp (100% Local y Gratuita)
* **Indicador de Urgencia por Colores**: Los botones de WhatsApp (💬) en los listados se pintan de forma dinámica en base al cálculo de días restantes para el evento:
  * 🔴 **Rojo**: El turno es hoy, mañana, o la vacuna ya está vencida (1 día o menos restante).
  * 🟡 **Amarillo**: Faltan exactamente 2 días para el turno o dosis.
  * 🟢 **Verde**: El evento es a mediano plazo (3 días o más de anticipación).
* **Avisos de Vacunación**: Genera una plantilla con el nombre de la mascota y la dosis de refuerzo correspondiente (avisando si está vencida o próxima a vencer) y abre WhatsApp Web/Desktop con el texto pre-cargado.
* **Recordatorios de Turnos**: Genera plantillas con fecha, hora y tipo de cita de forma automática para agilizar la confirmación.
* **Reportes de Servicios (Procedimientos)**: Botón rápido de compartir (Icono de Compartir 🔗/💬) en los servicios y fichas clínicas que recopila el tipo de procedimiento realizado, el profesional a cargo y todas las observaciones médicas, enviándoselas al propietario de forma inmediata y formateada.

---

## 📄 7. Exportación en PDF (Calidad Profesional A4)
* **Ficha de Paciente**: Generación de documentos tamaño A4 que integran el logotipo personalizado, datos de contacto de la veterinaria, alertas médicas resaltadas, datos del paciente, datos del tutor e historial clínico completo.
* **Recetario Médico (Fórmula)**: Generación de prescripciones profesionales con grilla ordenada de medicamentos prescritos (dosis, frecuencia, duración), indicaciones adicionales y campos punteados específicos para la firma física del veterinario y del propietario.

---

## ⚙️ 8. Configuración Avanzada y Seguridad
* **Datos Corporativos**: Personalización de nombre comercial, dirección, número telefónico, correo e identificador fiscal (VAT / RUTA / CUIT).
* **Diseño Personalizado de Marca**: Carga interactiva del logo de la veterinaria y selector de paletas cromáticas preestablecidas (Azul Clásico, Bosque Verde, Naranja Atardecer, etc.) o ingreso de colores corporativos personalizados por código HEX.
* **Selector de Tema**: Switch interactivo para cambiar entre el **Modo Claro** y el **Modo Oscuro** (Dark Mode).
* **Respaldo de Datos Seguro**: Descarga manual en un solo clic de la base de datos completa como archivo `.json` de seguridad, y módulo de importación para restaurar la información en cualquier computadora.
* **Zona de Peligro**: Opción protegida mediante confirmación para realizar un formateo total de la base de datos IndexedDB local.
