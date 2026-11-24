
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Home from '../components/home'
import ProjectsPage from '../components/projectsPage'
import { getLocalDate, isISODate } from '../components/taskDates'
import TaskPage from '../components/tasksPage'
import type { TaskFormData } from '../components/taskForm'
import {
  taskPriorities,
  taskStatus,
  type Project,
  type Task,
  type TaskStatus,
} from '../components/taskTypes'
import {
  createProject,
  createTask,
  deleteProject as deleteProjectApi,
  getProjects,
  getTasks,
  renameProject as renameProjectApi,
  updateTask,
  deleteTask as deleteTaskApi,
  type TaskWritePayload,
} from './services/taskflowApi'
import './App.css'

// Comprueba que un valor tenga la estructura de una tarea válida.
// El predicado "value is Task" permite que TypeScript reconozca
// el valor como Task cuando todas las comprobaciones son correctas.
function isTask(value: unknown): value is Task {
  // Una tarea debe ser un objeto, no null ni un array.
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }


  // Permite acceder a las propiedades sin asumir que ya son válidas.
  const task = value as Record<string, unknown>

  // Comprueba el formato de las fechas opcionales.
  const hasValidStartDate = task.startDate === null || isISODate(task.startDate)
  const hasValidCompletedDate = task.completedDate === null || isISODate(task.completedDate)

  // Comprueba que el estado y la prioridad estén entre los valores permitidos.
  const validStatus = taskStatus.includes(task.status as TaskStatus)
  const validPriority = taskPriorities.includes(task.priority as (typeof taskPriorities)[number])

  // Valida los campos principales de la tarea.
  if (
    !Number.isInteger(task.id)
    || (task.id as number) < 1
    || typeof task.title !== 'string'
    || !task.title.trim()
    || !validPriority
    || !validStatus
    || !hasValidStartDate
    || !isISODate(task.dueDate)
    || !hasValidCompletedDate
  ) {
    return false
  }

  // Comprueba que el proyecto asociado tenga datos válidos.
  if (task.project !== null) {
    if (
      typeof task.project !== 'object'
      || Array.isArray(task.project)
    ) {
      return false
    }

    const project = task.project as Record<string, unknown>

    if (
      !Number.isInteger(project.id)
      || (project.id as number) < 1
      || typeof project.name !== 'string'
      || !project.name.trim()
    ) {
      return false
    }
  }

  // Comprueba que las fechas de inicio y vencimiento sean coherentes.
  const startDate = task.startDate as string | null
  const completedDate = task.completedDate as string | null
  const dueDate = task.dueDate as string

  if (startDate && dueDate < startDate) {
    return false
  }

  // Una tarea no iniciada no debe tener fecha de inicio.
  if (task.status === 'No iniciada' && startDate !== null) {
    return false
  }

  // Una tarea en progreso debe tener fecha de inicio.
  if (task.status === 'En progreso' && startDate === null) {
    return false
  }

  // Una tarea completada debe tener fechas de inicio y finalización.
  // La finalización no puede ser anterior al inicio ni posterior a hoy.
  if (task.status === 'Completada') {
    return startDate !== null
      && completedDate !== null
      && completedDate >= startDate
      && completedDate <= getLocalDate()
  }

  // Los estados distintos de Completada no deben tener fecha de finalización.
  return completedDate === null
}

// Define las propiedades que necesita la página de tareas.
// Así podemos reutilizarla para todas las tareas o para un proyecto específico.
type TaskPageProps = {
  tasks: Task[]
  projects: Project[]
  taskError: string | null
  onSaveTask: (data: TaskFormData, editingTaskId: number | null) => Promise<string | null>
  onChangeTaskStatus: (taskId: number, status: TaskStatus) => Promise<string | null>
  onChangeTaskProject: (taskId: number, projectId: number | null) => Promise<string | null>
  onDeleteTask: (taskId: number) => Promise<string | null>
}

// Obtiene el ID del proyecto desde la URL y muestra sus tareas.
function ProjectTasksRoute(props: TaskPageProps) {
  const { projectId } = useParams()
  const parsedProjectId = Number(projectId)

  return <TaskPage {...props} fixedProjectId={parsedProjectId} />
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    Promise.all([getTasks(), getProjects()])
      .then(([apiTasks, apiProjects]) => {
        if (cancelled) return

        setTasks(apiTasks)
        setProjects(apiProjects)
      })
      .catch((error: unknown) => {
        if (cancelled) return

        setLoadError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los datos desde la API.',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  // Permite conocer la ruta actual para actualizar el título de la cabecera.
  const location = useLocation()

  // Crea un proyecto después de validar su nombre.
  const saveProject = async (name: string): Promise<string | null> => {
  const cleanName = name.trim()

  if (!cleanName) {
    return 'El nombre del proyecto es obligatorio.'
  }

  if (
    projects.some(
      (project) => project.name.toLowerCase() === cleanName.toLowerCase(),
    )
  ) {
    return 'Ya existe un proyecto con ese nombre.'
  }

  try {
    const newProject = await createProject(cleanName)

      setProjects((currentProjects) => [
        ...currentProjects,
        newProject,
      ])

      return null
    } catch (error) {
      return error instanceof Error
        ? error.message
        : 'No se pudo crear el proyecto.'
    } 
  }

  // Cambia el nombre de un proyecto y actualiza también
  // el nombre almacenado en todas sus tareas asociadas.
  
  // Cambia el nombre de un proyecto y actualiza también
  // el nombre almacenado en todas sus tareas asociadas.
  const renameProject = async (
    projectId: number,
    name: string,
  ): Promise<string | null> => {
    const cleanName = name.trim()

    if (!cleanName) {
      return 'El nombre del proyecto es obligatorio.'
    }

    if (
      projects.some(
        (project) =>
          project.id !== projectId &&
          project.name.toLowerCase() === cleanName.toLowerCase(),
      )
    ) {
      return 'Ya existe un proyecto con ese nombre.'
    }

    const project = projects.find((item) => item.id === projectId)

    if (!project) {
      return 'No se encontró el proyecto que querés renombrar.'
    }

    try {
      // Primero actualizamos el proyecto en PostgreSQL.
      await renameProjectApi(projectId, cleanName)

      // Solo actualizamos React cuando el servidor confirma el cambio.
      setProjects((currentProjects) =>
        currentProjects.map((item) =>
          item.id === projectId
            ? { ...item, name: cleanName }
            : item,
        ),
      )

      // Actualizamos también el nombre del proyecto en las tareas asociadas.
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.project?.id === projectId
            ? {
                ...task,
                project: { ...task.project, name: cleanName },
              }
            : task,
        ),
      )

      return null
    } catch (error) {
      return error instanceof Error
        ? error.message
        : 'No se pudo renombrar el proyecto.'
    }
  }


  // Elimina el proyecto y todas las tareas asociadas a su ID.
  const deleteProject = async (
  projectId: number,
  deleteTasks: boolean,
): Promise<string | null> => {
  const project = projects.find((item) => item.id === projectId)

  if (!project) {
    return 'No se encontró el proyecto que querés eliminar.'
  }

  try {
    await deleteProjectApi(projectId, deleteTasks)

    setProjects((currentProjects) =>
      currentProjects.filter((item) => item.id !== projectId),
    )

    setTasks((currentTasks) =>
      deleteTasks
        ? currentTasks.filter((task) => task.project?.id !== projectId)
        : currentTasks.map((task) =>
            task.project?.id === projectId
              ? { ...task, project: null }
              : task,
          ),
    )

    return null
  } catch (error) {
    return error instanceof Error
      ? error.message
      : 'No se pudo eliminar el proyecto.'
    }
  }

  // Calcula las fechas correspondientes al estado elegido.
  // Conserva las fechas anteriores cuando corresponde y registra
  // el inicio o la finalización según las reglas actuales de TaskFlow.
  const getStatusDates = (
    status: TaskStatus,
    previousTask?: Pick<Task, 'startDate' | 'completedDate'>,
  ) => {
    if (status === 'No iniciada') {
      return { startDate: null, completedDate: null }
    }

    const today = getLocalDate()

    const startDate = previousTask?.startDate
      ?? (status === 'En progreso' || status === 'Completada' ? today : null)

    const completedDate = status === 'Completada'
      ? previousTask?.completedDate ?? today
      : null

    return { startDate, completedDate }
  }

  // Valida los datos recibidos del formulario y comprueba el proyecto.
  // Después crea una tarea nueva o reemplaza la tarea que se está editando.
  // Devuelve un mensaje si detecta algún error.
  const saveTask = async (
  taskData: TaskFormData,
  editingTaskId: number | null,
): Promise<string | null> => {
  if (!isISODate(taskData.dueDate)) {
    return 'La fecha límite no es válida.'
  }

  const existingTask = tasks.find(
    (task) => task.id === editingTaskId,
  )

  if (editingTaskId !== null && !existingTask) {
    return 'No se encontró la tarea que querés editar.'
  }

  // Resolvemos el nombre del proyecto a partir de su ID.
  const matchingProject = taskData.project
    ? projects.find(
        (project) => project.name === taskData.project,
      ) ?? null
    : null

  if (taskData.project && !matchingProject) {
    return 'Seleccioná un proyecto válido para la tarea.'
  }

  // Al editar, conservamos el estado anterior.
  // Al crear, utilizamos el estado elegido en el formulario.
  const status = existingTask?.status ?? taskData.status

  const { startDate, completedDate } = getStatusDates(
    status,
    existingTask,
  )

  // Preparamos el objeto que espera la API.
  const payload: TaskWritePayload = {
    title: taskData.title.trim(),
    projectId: matchingProject?.id ?? null,
    priority: taskData.priority,
    status,
    startDate,
    dueDate: taskData.dueDate,
    completedDate,
  }

  setTaskError(null)

  try {
    // Elegimos POST para crear o PUT para editar.
    const savedTask = existingTask
      ? await updateTask(existingTask.id, payload)
      : await createTask(payload)

    // Actualizamos React con la tarea que devolvió PostgreSQL.
    setTasks((currentTasks) =>
      existingTask
        ? currentTasks.map((task) =>
            task.id === savedTask.id ? savedTask : task,
          )
        : [...currentTasks, savedTask],
    )

    setTaskError(null)

    return null
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'No se pudo guardar la tarea.'

    setTaskError(message)

      return message
    }
  }

  // Elimina una tarea y persiste la lista actualizada.
  const deleteTask = async (taskId: number): Promise<string | null> => {
    const taskExists = tasks.some((task) => task.id === taskId)

    if (!taskExists) {
      return 'No se encontró la tarea que querés eliminar.'
    }

    setTaskError(null)

    try {
      // Primero eliminamos el registro de PostgreSQL.
      await deleteTaskApi(taskId)

      // Solo si el servidor confirmó el borrado, actualizamos React.
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskId)
      )

      return null
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo eliminar la tarea.'

      setTaskError(message)

      return message
    }
  }

    // Cambia el estado de una tarea y actualiza sus fechas.
  const changeTaskStatus = async (
    taskId: number,
    newStatus: TaskStatus,
  ): Promise<string | null> => {
    const currentTask = tasks.find((task) => task.id === taskId)

    if (!currentTask) {
      return 'No se encontró la tarea que querés actualizar.'
    }

    // Calculamos el nuevo estado y sus fechas correspondientes.
    const updatedTask: Task = {
      ...currentTask,
      status: newStatus,
      ...getStatusDates(newStatus, currentTask),
    }

    // Comprobamos que la tarea siga cumpliendo nuestras reglas.
    if (!isTask(updatedTask)) {
      const message = 'No se puede cambiar el estado: revisá la fecha límite y las fechas de la tarea.'
      setTaskError(message)
      return message
    }

    // Preparamos todos los datos que necesita el backend.
    const payload: TaskWritePayload = {
      title: updatedTask.title,
      projectId: updatedTask.project?.id ?? null,
      priority: updatedTask.priority,
      status: updatedTask.status,
      startDate: updatedTask.startDate,
      dueDate: updatedTask.dueDate,
      completedDate: updatedTask.completedDate,
    }

    setTaskError(null)

    try {
      // Actualizamos primero PostgreSQL.
      const savedTask = await updateTask(taskId, payload)

      // React recibe la versión confirmada por el servidor.
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === savedTask.id ? savedTask : task
        )
      )

      setTaskError(null)

      return null
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo actualizar el estado de la tarea.'

      setTaskError(message)

      return message
    }
  }

  const changeTaskProject = async (
    taskId: number,
    projectId: number | null,
  ): Promise<string | null> => {
  const currentTask = tasks.find((task) => task.id === taskId)

  if (!currentTask) {
    return 'No se encontró la tarea.'
  }

  const selectedProject = projectId === null
    ? null
    : projects.find((project) => project.id === projectId)

    if (projectId !== null && !selectedProject) {
      const message = 'No se encontró el proyecto seleccionado.'
      setTaskError(message)
      return message
    }

    const updatedTask: Task = {
      ...currentTask,
      project: selectedProject ?? null,
    }

    if (!isTask(updatedTask)) {
      const message = 'No se pudo cambiar el proyecto de la tarea.'
      setTaskError(message)
      return message
    }

    const payload: TaskWritePayload = {
      title: updatedTask.title,
      projectId: updatedTask.project?.id ?? null,
      priority: updatedTask.priority,
      status: updatedTask.status,
      startDate: updatedTask.startDate,
      dueDate: updatedTask.dueDate,
      completedDate: updatedTask.completedDate,
    }

    setTaskError(null)

    try {
      const savedTask = await updateTask(taskId, payload)

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === savedTask.id ? savedTask : task
        )
      )

      setTaskError(null)

      return null
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo cambiar el proyecto de la tarea.'

      setTaskError(message)
      return message
    }
  }

  // Agrupa las propiedades y acciones necesarias para la página de tareas.
  const taskPageProps: TaskPageProps = {
    tasks,
    projects,
    taskError,
    onSaveTask: saveTask,
    onChangeTaskStatus: changeTaskStatus,
    onChangeTaskProject: changeTaskProject,
    onDeleteTask: deleteTask,
  }

  // Determina el nombre que aparece en la cabecera según la ruta actual.
  const pageName = location.pathname === '/'
    ? 'Inicio'
    : location.pathname === '/tasks'
      ? 'Tareas'
      : location.pathname.startsWith('/projects')
        ? 'Proyectos'
        : 'Inicio'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2 className="brand">TaskFlow.</h2>

        {/* NavLink permite navegar y aplicar estilos al enlace activo. */}
        <nav>
          <NavLink to="/" end className="nav-link">Inicio</NavLink>
          <NavLink to="/tasks" className="nav-link">Tareas</NavLink>
          <NavLink to="/projects" className="nav-link">Proyectos</NavLink>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>Mi espacio / {pageName}</span>
          <span>TaskFlow</span>
        </header>

        {isLoading ? (
          <div className="app-alert warning" role="status">
            Cargando datos desde PostgreSQL...
          </div>
        ) : loadError ? (
          <div className="app-alert error" role="alert">
            <p>No se pudieron cargar los datos: {loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null)
                setIsLoading(true)
                setLoadAttempt((attempt) => attempt + 1)
              }}
            >
              Reintentar conexión
            </button>
          </div>
        ) : (
          /* React Router muestra la página que coincide con la URL. */
          <Routes>
          <Route path="/" element={<Home tasks={tasks} projects={projects} />} />

          <Route path="/tasks" element={<TaskPage {...taskPageProps} />} />

          <Route
            path="/projects"
            element={
              <ProjectsPage
                projects={projects}
                tasks={tasks}
                onCreateProject={saveProject}
                onRenameProject={renameProject}
                onDeleteProject={deleteProject}
              />
            }/>

          <Route
            path="/projects/:projectId/tasks"
            element={<ProjectTasksRoute {...taskPageProps} />}
          />

          {/* Redirige las rutas desconocidas al Inicio. */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}

export default App
