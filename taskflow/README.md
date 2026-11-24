# TaskFlow

TaskFlow es una aplicación para organizar tareas y proyectos. PostgreSQL es la fuente de datos; el frontend consulta y actualiza la información a través de la API.

## Funcionalidades

- Inicio con totales por estado, porcentaje completado, próximos vencimientos y progreso por proyecto.
- Búsqueda por título y filtros combinables por proyecto, prioridad y estado.
- Orden ascendente o descendente por fecha de vencimiento.
- Indicadores para tareas vencidas y tareas que vencen hoy.
- Gestión de proyectos: crear, renombrar y eliminar, con cantidad de tareas y progreso.
- Vista de tareas independiente para cada proyecto.
- Validación de fechas y de la relación entre inicio, vencimiento y finalización.

## Desarrollo

Configura PostgreSQL y las variables de conexión requeridas en `server/.env` (al menos `DB_PASSWORD`). En una terminal, inicia la API:

```sh
cd server
npm install
npm run dev
```

En otra terminal, desde la carpeta raíz de TaskFlow, inicia el frontend:

```sh
cd ..
npm install
npm run dev
```

Para verificar el proyecto:

```sh
npm run build
npm run lint
```
