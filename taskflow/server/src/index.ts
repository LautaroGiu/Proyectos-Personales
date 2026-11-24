  import express from 'express'
  import cors from 'cors'
  import { pool } from './db.js'

  const app = express()
  const PORT = Number(process.env.PORT) || 3000

  app.use(cors({ origin: 'http://localhost:5173' }))
  app.use(express.json())

  function isISODate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false
    }

  const date = new Date(`${value}T00:00:00Z`)

  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
  }

  function getTodayISODate(): string {
    const today = new Date()

    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  
type TaskInput = {
  title: string
  projectId: number | null
  priority: 'Baja' | 'Media' | 'Alta'
  status:
    | 'No iniciada'
    | 'En pausa'
    | 'En espera'
    | 'En progreso'
    | 'Completada'
    | 'Cancelada'
  startDate: string | null
  dueDate: string
  completedDate: string | null
}

type TaskValidation =
  | { ok: true; value: TaskInput }
  | { ok: false; message: string }

  function validateTask(data: unknown): TaskValidation {
    if (
      typeof data !== 'object' ||
      data === null ||
      Array.isArray(data)
    ) {
      return { ok: false, message: 'Los datos de la tarea no son válidos.' }
    }

    const body = data as Record<string, unknown>

    const title = body.title
    const projectId = body.projectId ?? null
    const priority = body.priority
    const status = body.status
    const startDate = body.startDate ?? null
    const dueDate = body.dueDate
    const completedDate = body.completedDate ?? null

    const priorities = ['Baja', 'Media', 'Alta'] as const

    const statuses = [
      'No iniciada',
      'En pausa',
      'En espera',
      'En progreso',
      'Completada',
      'Cancelada',
    ] as const

    if (typeof title !== 'string' || !title.trim()) {
      return { ok: false, message: 'El título de la tarea es obligatorio.' }
    }

    if (
      projectId !== null &&
      (typeof projectId !== 'number' ||
        !Number.isInteger(projectId) ||
        projectId < 1)
    ) {
      return { ok: false, message: 'El proyecto seleccionado no es válido.' }
    }

    if (
      typeof priority !== 'string' ||
      !priorities.includes(priority as TaskInput['priority'])
    ) {
      return { ok: false, message: 'La prioridad no es válida.' }
    }

    if (
      typeof status !== 'string' ||
      !statuses.includes(status as TaskInput['status'])
    ) {
      return { ok: false, message: 'El estado de la tarea no es válido.' }
    }

    if (!isISODate(dueDate)) {
      return { ok: false, message: 'La fecha límite no es válida.' }
    }

    if (startDate !== null && !isISODate(startDate)) {
      return { ok: false, message: 'La fecha de inicio no es válida.' }
    }

    if (completedDate !== null && !isISODate(completedDate)) {
      return { ok: false, message: 'La fecha de finalización no es válida.' }
    }

    if (startDate !== null && dueDate < startDate) {
      return {
        ok: false,
        message: 'La fecha de inicio no puede ser posterior al vencimiento.',
      }
    }

    if (
      status === 'No iniciada' &&
      (startDate !== null || completedDate !== null)
    ) {
      return {
        ok: false,
        message: 'Una tarea no iniciada no puede tener fechas de inicio o finalización.',
      }
    }

    if (
      status === 'En progreso' &&
      (startDate === null || completedDate !== null)
    ) {
      return {
        ok: false,
        message: 'Una tarea en progreso debe tener fecha de inicio y no tener fecha de finalización.',
      }
    }

    if (
      status === 'Completada' &&
      (
        startDate === null ||
        completedDate === null ||
        completedDate < startDate ||
        completedDate > getTodayISODate()
      )
    ) {
      return {
        ok: false,
        message: 'Una tarea completada debe tener fechas de inicio y finalización coherentes.',
      }
    }

    if (
      ['En pausa', 'En espera', 'Cancelada'].includes(status) &&
      completedDate !== null
    ) {
      return {
        ok: false,
        message: 'Solo una tarea completada puede tener fecha de finalización.',
      }
    }

    return {
      ok: true,
      value: {
        title: title.trim(),
        projectId,
        priority: priority as TaskInput['priority'],
        status: status as TaskInput['status'],
        startDate,
        dueDate,
        completedDate,
      },
    }
  }


  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'TaskFlow API is running',
    })
  })

  app.get('/api/db-health', async (_req, res) => {
    try {
      const result = await pool.query(
        'SELECT current_database() AS database',
      )

      res.status(200).json({
        status: 'ok',
        database: result.rows[0].database,
      })
    } catch (error) {
      console.error('Error al consultar PostgreSQL:', error)

      res.status(500).json({
        status: 'error',
        message: 'No se pudo conectar con la base de datos.',
      })
    }
  })

  app.get('/api/tasks', async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          t.id,
          t.title,
          CASE
            WHEN p.id IS NULL THEN NULL
            ELSE json_build_object(
              'id', p.id,
              'name', p.name
            )
          END AS project,
          t.priority,
          t.status,
          TO_CHAR(t.start_date, 'YYYY-MM-DD') AS "startDate",
          TO_CHAR(t.due_date, 'YYYY-MM-DD') AS "dueDate",
          TO_CHAR(t.completed_date, 'YYYY-MM-DD') AS "completedDate"
          FROM tasks AS t
          LEFT JOIN projects AS p ON p.id = t.project_id
          ORDER BY t.id ASC
      `)

      res.status(200).json(result.rows)
    } catch (error) {
      console.error('Error al consultar las tareas:', error)

      res.status(500).json({
        status: 'error',
        message: 'No se pudieron recuperar las tareas.',
      })
    }
  })

  app.get('/api/projects', async (_req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name FROM projects ORDER BY id ASC',
      )

      res.status(200).json(result.rows)
    } catch (error) {
      console.error('Error al consultar los proyectos:', error)

      res.status(500).json({
        message: 'No se pudieron recuperar los proyectos.',
      })
    }
  })

  app.post('/api/projects', async (req, res) => {
    const name: unknown = req.body?.name

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        message: 'El nombre del proyecto es obligatorio.',
      })
    }

    const cleanName = name.trim()

    if (cleanName.length > 60) {
      return res.status(400).json({
        message: 'El nombre no puede superar los 60 caracteres.',
      })
    }

    try {
      const result = await pool.query(
        'INSERT INTO projects (name) VALUES ($1) RETURNING id, name',
        [cleanName],
      )

      return res.status(201).json(result.rows[0])
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : null

      if (code === '23505') {
        return res.status(409).json({
          message: 'Ya existe un proyecto con ese nombre.',
        })
      }

      console.error('Error al crear el proyecto:', error)

      return res.status(500).json({
        message: 'No se pudo crear el proyecto.',
      })
    }
  })

  
app.post('/api/tasks', async (req, res) => {
  const validation = validateTask(req.body)

  if (!validation.ok) {
    return res.status(400).json({
      message: validation.message,
    })
  }

  const {
    title,
    projectId,
    priority,
    status,
    startDate,
    dueDate,
    completedDate,
  } = validation.value

  try {
    const result = await pool.query(
      `WITH inserted AS (
        INSERT INTO tasks
          (title, project_id, priority, status, start_date, due_date, completed_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      )
      SELECT
        t.id,
        t.title,
        CASE
          WHEN p.id IS NULL THEN NULL
          ELSE json_build_object('id', p.id, 'name', p.name)
        END AS project,
        t.priority,
        t.status,
        TO_CHAR(t.start_date, 'YYYY-MM-DD') AS "startDate",
        TO_CHAR(t.due_date, 'YYYY-MM-DD') AS "dueDate",
        TO_CHAR(t.completed_date, 'YYYY-MM-DD') AS "completedDate"
      FROM inserted AS t
      LEFT JOIN projects AS p ON p.id = t.project_id`,
      [
        title,
        projectId,
        priority,
        status,
        startDate,
        dueDate,
        completedDate,
      ],
    )

    return res.status(201).json(result.rows[0])
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : null

    if (code === '23503') {
      return res.status(400).json({
        message: 'El proyecto seleccionado no existe.',
      })
    }

    console.error('Error al crear la tarea:', error)

    return res.status(500).json({
      message: 'No se pudo crear la tarea.',
    })
  }
})


  
app.put('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      message: 'El ID de la tarea no es válido.',
    })
  }

  const validation = validateTask(req.body)

  if (!validation.ok) {
    return res.status(400).json({
      message: validation.message,
    })
  }

  const {
    title,
    projectId,
    priority,
    status,
    startDate,
    dueDate,
    completedDate,
  } = validation.value

  try {
    const result = await pool.query(
      `WITH updated AS (
        UPDATE tasks
        SET
          title = $1,
          project_id = $2,
          priority = $3,
          status = $4,
          start_date = $5,
          due_date = $6,
          completed_date = $7
        WHERE id = $8
        RETURNING *
      )
      SELECT
        t.id,
        t.title,
        CASE
          WHEN p.id IS NULL THEN NULL
          ELSE json_build_object('id', p.id, 'name', p.name)
        END AS project,
        t.priority,
        t.status,
        TO_CHAR(t.start_date, 'YYYY-MM-DD') AS "startDate",
        TO_CHAR(t.due_date, 'YYYY-MM-DD') AS "dueDate",
        TO_CHAR(t.completed_date, 'YYYY-MM-DD') AS "completedDate"
      FROM updated AS t
      LEFT JOIN projects AS p ON p.id = t.project_id`,
      [
        title,
        projectId,
        priority,
        status,
        startDate,
        dueDate,
        completedDate,
        id,
      ],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'No se encontró la tarea.',
      })
    }

    return res.status(200).json(result.rows[0])
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : null

    if (code === '23503') {
      return res.status(400).json({
        message: 'El proyecto seleccionado no existe.',
      })
    }

    console.error('Error al actualizar la tarea:', error)

    return res.status(500).json({
      message: 'No se pudo actualizar la tarea.',
    })
  }
})


  app.delete('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      message: 'El ID de la tarea no es válido.',
    })
  }

  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [id],
    )

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'No se encontró la tarea.',
      })
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Tarea eliminada correctamente.',
      id: result.rows[0].id,
    })
  } catch (error) {
    console.error('Error al eliminar la tarea:', error)

    return res.status(500).json({
      message: 'No se pudo eliminar la tarea.',
      })
    }
  })

  app.put('/api/projects/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      message: 'El ID del proyecto no es válido.',
    })
  }

  const name: unknown = req.body?.name

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      message: 'El nombre del proyecto es obligatorio.',
    })
  }

  const cleanName = name.trim()

  if (cleanName.length > 60) {
    return res.status(400).json({
      message: 'El nombre no puede superar los 60 caracteres.',
    })
  }

  try {
    const result = await pool.query(
      `UPDATE projects
       SET name = $1
       WHERE id = $2
       RETURNING id, name`,
      [cleanName, id],
    )

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'No se encontró el proyecto.',
      })
    }

    return res.status(200).json(result.rows[0])
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : null

    if (code === '23505') {
      return res.status(409).json({
        message: 'Ya existe un proyecto con ese nombre.',
      })
    }

    console.error('Error al renombrar el proyecto:', error)

    return res.status(500).json({
      message: 'No se pudo renombrar el proyecto.',
      })
    }
  })

  app.delete('/api/projects/:id', async (req, res) => {
  const id = Number(req.params.id)
  const deleteTasksParam = req.query.deleteTasks

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      message: 'El ID del proyecto no es válido.',
    })
  }

  if (
    deleteTasksParam !== 'true'
    && deleteTasksParam !== 'false'
  ) {
    return res.status(400).json({
      message: 'Indicá deleteTasks=true o deleteTasks=false.',
    })
  }

  const deleteTasks = deleteTasksParam === 'true'

  try {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Si se eligió eliminar las tareas, las borramos primero.
      if (deleteTasks) {
        await client.query(
          'DELETE FROM tasks WHERE project_id = $1',
          [id],
        )
      }

      const result = await client.query(
        'DELETE FROM projects WHERE id = $1 RETURNING id, name',
        [id],
      )

      if (result.rowCount === 0) {
        await client.query('ROLLBACK')

        return res.status(404).json({
          message: 'No se encontró el proyecto.',
        })
      }

      await client.query('COMMIT')

      return res.status(200).json({
        status: 'ok',
        message: 'Proyecto eliminado correctamente.',
        project: result.rows[0],
        tasksDeleted: deleteTasks,
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error al eliminar el proyecto:', error)

    return res.status(500).json({
      message: 'No se pudo eliminar el proyecto.',
      })
    }
  })


  app.use((
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    // Express requiere los cuatro parámetros para reconocer este middleware.
    void _next
    console.error('Error no controlado en la API:', error)

    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : 500

    res.status(status).json({
      status: 'error',
      message:
        status === 400
          ? 'El cuerpo de la solicitud no es válido.'
          : 'Ocurrió un error interno del servidor.',
    })
  })


  app.listen(PORT, () => {
    console.log(`TaskFlow API escuchando en http://localhost:${PORT}`)
  })