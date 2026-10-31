# Orlando — IA para Maestros

**Orlando** es una Inteligencia Artificial diseñada específicamente para profesores.  
Permite gestionar múltiples colegios de forma aislada, registrar asistencias, tareas, calificaciones y conducta, calcular promedios, explicar notas y generar exámenes/tareas en PDF, Word o imagen.

## Características principales

- **Múltiples colegios aislados**: Cada colegio tiene su propio historial y memoria. La información de un colegio nunca se mezcla con otro.
- **Chat inteligente** con memoria persistente (Firestore).
- **Registro de asistencia, tareas y conducta** en lenguaje natural.
- **Cálculo de promedios** (escala configurable 1-5, 1-7, 1-10, etc.).
- **Explicación de calificaciones** basada en el historial real.
- **Generación de material**:
  - Exámenes
  - Tareas / ejercicios
  - Verdadero / Falso
  - Opción múltiple
  - Completar espacios
- **Exportación** a PDF, Word (.docx) e imagen PNG.
- Autenticación con Firebase Auth.
- Diseño moderno y responsive.

## Stack

- HTML + CSS + JavaScript (vanilla)
- Firebase Authentication + Cloud Firestore
- Google Gemini 1.5 Flash
- jsPDF + docx + html2canvas (exportación)

## Estructura del proyecto

```
orlando-ai/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── firebase-config.js
│   ├── gemini.js
│   ├── utils.js
│   └── app.js
├── assets/
└── README.md
```

## Configuración necesaria

### 1. Firebase

Ya tienes el proyecto `profefacil-9318a`.  
Asegúrate de que las **reglas de Firestore** permitan:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /schools/{schoolId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      
      match /messages/{messageId} {
        allow read, write: if request.auth != null 
          && get(/databases/$(database)/documents/schools/$(schoolId)).data.ownerId == request.auth.uid;
      }
      
      match /students/{studentId} {
        allow read, write: if request.auth != null 
          && get(/databases/$(database)/documents/schools/$(schoolId)).data.ownerId == request.auth.uid;
      }
    }
  }
}
```

También habilita **Authentication → Email/Password** en la consola de Firebase.

### 2. Gemini API Key

La clave ya está incluida en `js/gemini.js`.  
Si necesitas cambiarla, edita la constante `GEMINI_API_KEY`.

> **Nota de seguridad**: En producción real se recomienda mover la llamada a Gemini a un backend (Cloud Functions o Render) para no exponer la API key en el cliente.

## Despliegue en Render

1. Sube este repositorio a GitHub.
2. En [Render](https://render.com) crea un nuevo **Static Site**.
3. Conecta el repositorio.
4. Configuración:
   - **Build Command**: (dejar vacío)
   - **Publish Directory**: `.` (o la carpeta raíz del proyecto)
5. ¡Listo! Render servirá los archivos estáticos.

Alternativa rápida con CLI:

```bash
# Si usas Netlify / Vercel también funciona igual (static site)
```

## Uso local

Simplemente abre `index.html` con un servidor local (no funciona bien con `file://` por CORS y módulos):

```bash
# Con Python
python -m http.server 8080

# O con Node
npx serve .
```

Luego ve a `http://localhost:8080`.

## Cómo funciona el flujo

1. El profesor inicia sesión / se registra.
2. En la pantalla de inicio puede **Agregar colegio**.
3. Cada colegio aparece como una tarjeta.
4. Al entrar a un colegio se abre un chat dedicado **solo a ese colegio**.
5. El profesor escribe en lenguaje natural (asistencias, tareas, etc.).
6. Orlando recuerda todo el historial de ese colegio.
7. Puede pedir promedios, explicaciones o generar material pedagógico y exportarlo.

## Ejemplo de uso en el chat

```
Marta vino hoy. Entregó la tarea de ciencias (3 puntos) pero no entregó matemáticas (6 puntos).
Mateo no vino y no trajo justificativo.
La conducta de Marta fue buena, pero le resté 1.5 puntos por llegar tarde la semana pasada.
```

Luego:

```
¿Cuál es el promedio de Marta este mes?
¿Por qué Marta sacó 4?
Genera un examen de verdadero/falso de ciencias naturales para 4to básico con 12 preguntas.
```

## Licencia

Proyecto creado para uso educativo.  
Orlando © 2026
