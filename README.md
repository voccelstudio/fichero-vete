# VetCare Pro 🐾

Sistema de gestión para clínicas veterinarias. Corre **100% local** en tu computadora — sin necesidad de internet (excepto la primera carga).

## Requisitos

- **Google Chrome**, **Microsoft Edge** o **Firefox** (actualizado)
- No necesitas instalar nada más

## Cómo usar

### Opción 1: Servidor local (recomendado)

1. Abre una terminal en esta carpeta
2. Ejecuta uno de estos comandos:

```bash
# Si tienes Node.js instalado
npx serve .

# O con Python
python -m http.server 8000

# O con Python 3
python3 -m http.server 8000
```

3. Abrí tu navegador en `http://localhost:8000`

### Opción 2: Abrir directamente (más simple)

Hacé doble click en `index.html` y se abre en el navegador. Algunas funciones (como el PDF) pueden requerir el servidor local.

## Funciones principales

### 📊 Dashboard
- Resumen de pacientes, servicios del mes
- Acciones rápidas: nuevo paciente, registrar servicio, respaldar
- Servicios recientes y distribución por especie

### 🐶 Pacientes
- Registrar, editar y eliminar fichas de pacientes
- Datos del animal: nombre, especie, raza, edad, peso, color, microchip
- Datos del propietario: nombre, teléfono, email, dirección
- Alertas médicas y notas
- Historial clínico completo con todos los servicios realizados
- Exportar ficha individual como **PDF tamaño A4**

### 🩺 Servicios
- Registrar servicios médicos: consultas, vacunación, baños, cirugías, etc.
- Vinculados automáticamente al paciente
- Buscador por tipo de servicio o paciente

### ⚙️ Configuración
- **Datos de la clínica**: nombre, dirección, teléfono, email, ID fiscal
- **Logo**: subí el logo de tu clínica (PNG o SVG recomendado)
- **PDF**: elegí si mostrar logo e ID fiscal en los documentos
- **Respaldo**: exportá todos los datos como JSON y restáuralos cuando quieras

## Respaldo de datos

⚠️ **Importante**: Todos los datos se guardan localmente en tu navegador.

- Hacé un respaldo **una vez por semana** (la app te lo recuerda)
- Andá a *Configuración > Respaldo & Restaurar*
- Descargá el archivo `.json` y guardalo en un lugar seguro (USB, Drive, etc.)
- Si perdés los datos del navegador, podés restaurarlos desde ese archivo

## Exportar PDF

Cada ficha de paciente se puede exportar como PDF:
1. Abrí la ficha del paciente
2. Hacé click en el botón **PDF**
3. Se descarga un archivo PDF tamaño A4 con el logo de la clínica y los datos del paciente

Ese PDF lo podés:
- **Imprimir** directamente
- **Enviar por WhatsApp** como archivo
- **Adjuntar en un correo electrónico**

## Tecnología

- HTML, CSS (Tailwind), JavaScript vanilla
- IndexedDB (base de datos local en el navegador)
- html2pdf.js (generación de PDF)
- Sin servidor, sin backend, sin conexión a internet requerida
