
import { useState } from 'react'
import { Link } from 'react-router-dom'
import TaskForm, { type TaskFormData } from './taskForm'
import { formatDate, getLocalDate } from './taskDates'
import {
  taskPriorities,
  taskStatus,
  type Project,
  type Task,
  type TaskStatus,
} from './taskTypes'

type TasksPageProps = {
  tasks: Task[]
  projects: Project[]
  fixedProjectId?: number
  taskError: string | null
  onSaveTask: (data: TaskFormData, editingTaskId: number | null) => Promise<string | null>
  onChangeTaskStatus: (taskId: number, status: TaskStatus) => Promise<string | null>
  onChangeTaskProject: (taskId: number, projectId: number | null) => Promise<string | null>
  onDeleteTask: (taskId: number) => Promise<string | null>
}

// Define qué estados se consideran pendientes.
const isPendingTask = (task: Task) =>
  task.status === 'No iniciada'
  || task.status === 'En pausa'
  || task.status === 'En espera'

export default function TasksPage({
  tasks,
  projects,
  fixedProjectId,
  taskError,
  onSaveTask,
  onChangeTaskStatus,
  onChangeTaskProject,
  onDeleteTask,
}: TasksPageProps) {
  // Estados que controlan la búsqueda, los filtros y el ordenamiento.
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('Todas')
  const [priorityFilter, setPriorityFilter] = useState('Todas')
  const [statusFilter, setStatusFilter] = useState('Todas')
  const [sortOrder, setSortOrder] = useState('dueDate-asc')

  // Estados para controlar los formularios, las confirmaciones y el menú.
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const [isDeletingTask, setIsDeletingTask] = useState(false)

  const [projectPickerTaskId, setProjectPickerTaskId] = useState<number | null>(null)

  const [isSavingTask, setIsSavingTask] = useState(false)

  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isChangingProject, setIsChangingProject] = useState(false)

  // Si la página pertenece a un proyecto, busca sus datos.
  const currentProject = projects.find((project) => project.id === fixedProjectId)


  // Combina los filtros: una tarea debe cumplir todas las condiciones.
  const visibleTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())

    // Si se está viendo un proyecto concreto, ese proyecto tiene prioridad
    // sobre el filtro general de proyectos.
    const matchesProject = fixedProjectId !== undefined
      ? task.project?.id === fixedProjectId
      : projectFilter === 'Todas' || task.project?.id === Number(projectFilter)

    const matchesPriority = priorityFilter === 'Todas' || task.priority === priorityFilter

    // El filtro Pendientes agrupa varios estados.
    const matchesStatus = statusFilter === 'Todas'
      || (statusFilter === 'Pendientes'
        ? isPendingTask(task)
        : task.status === statusFilter)

    return matchesSearch && matchesProject && matchesPriority && matchesStatus
  })

  // Ordena una copia de los resultados para no modificar el array original.
  // Si dos tareas tienen la misma fecha, usa el ID como segundo criterio.
  const sortedTasks = [...visibleTasks].sort((a, b) => {
    const dateOrder = a.dueDate.localeCompare(b.dueDate)
    const orderedDate = sortOrder === 'dueDate-asc' ? dateOrder : -dateOrder

    return orderedDate || a.id - b.id
  })

  const today = getLocalDate()

  // Cierra el formulario y limpia la tarea que se estaba editando.
  const closeTaskForm = () => {
    setIsFormOpen(false)
    setEditingTask(null)
  }

  // Envía los datos al padre y cierra el formulario solo si no hay error.
  const saveTask = async (data: TaskFormData): Promise<string | null> => {
    if (isSavingTask) return 'Ya se está guardando una tarea.'

    setIsSavingTask(true)

  try {
    const error = await onSaveTask(data, editingTask?.id ?? null)

      if (!error) {
        closeTaskForm()
      }

      return error
    } finally {
      setIsSavingTask(false)
    }
  }

  const changeTaskStatus = async (taskId: number, status: TaskStatus) => {
  if (isChangingStatus) return

  setIsChangingStatus(true)

  try {
    const error = await onChangeTaskStatus(taskId, status)

    if (!error) {
      setOpenMenuId(null)
    }
  } finally {
    setIsChangingStatus(false)
  }
}

  const changeTaskProject = async (taskId: number, projectValue: string) => {
    if (isChangingProject) return

    setIsChangingProject(true)

    try {
      const projectId = projectValue === '' ? null : Number(projectValue)
      const error = await onChangeTaskProject(taskId, projectId)

      if (!error) {
        setProjectPickerTaskId(null)
      }
    } finally {
      setIsChangingProject(false)
    }
  }

  return (
    <section className="tasks-section page-section">
      <div className="page-heading">
        <div>
          {currentProject && (
            <Link className="back-link" to="/projects">
              &larr; Volver a proyectos
            </Link>
          )}


          <p className="eyebrow">{currentProject ? 'PROYECTO' : 'ORGANIZACIÓN'}</p>
          <h1>{currentProject ? `Tareas: ${currentProject.name}` : 'Mis tareas'}</h1>
          <p>Buscá, filtrá y ordená tus tareas por vencimiento.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTask(null)
            setIsFormOpen(true)
          }}>
          + Nueva tarea
        </button>
      </div>

      {/* Si el ID de la URL no corresponde a un proyecto existente,
          muestra un mensaje en lugar de las tareas. */}
      {fixedProjectId !== undefined && !currentProject ? (
        <div className="empty-state">
          <h2>No se encontró el proyecto</h2>
          <p>El proyecto pudo haber sido eliminado.</p>
          <Link to="/projects">Volver a proyectos</Link>
        </div>
      ) : (
        <>
          {projects.length === 0 && (
            <p className="project-message">
              Podés crear tareas sin proyecto o crear uno para organizarlas.
            </p>
          )}

          {taskError && <p className="app-alert error" role="alert">{taskError}</p>}

          {/* Cada control actualiza su estado y provoca que los filtros
              se vuelvan a calcular con los nuevos valores. */}
          <div className="task-filter-panel">
            <label className="task-search">
              Buscar por título
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ej. Terminar portfolio"/>
            </label>

            <label>
              Proyecto
              {currentProject ? (
                <input type="text" value={currentProject.name} readOnly />
              ) : (
                <select
                  value={projectFilter}
                  onChange={(event) => setProjectFilter(event.target.value)}>
                    
                  <option value="Todas">Todos los proyectos</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label>
              Prioridad
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="Todas">Todas</option>
                {taskPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Estado
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="Todas">Todos</option>
                <option value="Pendientes">Pendientes</option>

                {taskStatus.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ordenar por
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}>

                <option value="dueDate-asc">Vencimiento más próximo</option>
                <option value="dueDate-desc">Vencimiento más lejano</option>
              </select>
            </label>
          </div>

          {/* Informa cuántas tareas cumplen con los filtros actuales. */}
          <div className="task-results-header">
            <div>
              <p className="eyebrow">RESULTADOS</p>
              <p className="task-result-count" aria-live="polite">
                {sortedTasks.length} {sortedTasks.length === 1 ? 'tarea' : 'tareas'}
              </p>
            </div>

              <span className="task-results-hint">
                Ordenadas por vencimiento
              </span>
            </div>

          <div className="task-list">
            {sortedTasks.length === 0 ? (
              <div className="empty-state">
                <h2>
                  {tasks.length === 0
                    ? 'Todavía no hay tareas'
                    : 'No hay tareas para estos filtros'}
                </h2>
                <p>
                  {tasks.length === 0
                    ? 'Creá una tarea para empezar a organizar tu trabajo.'
                    : 'Probá con otra búsqueda o combinación de filtros.'}
                </p>
              </div>
            ) : sortedTasks.map((task) => {
              // Identifica las tareas vencidas y las que vencen hoy.
              const isOverdue = task.status !== 'Completada'
                && task.status !== 'Cancelada'
                && task.dueDate < today

              const isDueToday = task.status !== 'Completada'
                && task.status !== 'Cancelada'
                && task.dueDate === today

              return (
                <article className="task-row" key={task.id}>
                  <div className="task-info">
                    <h2>{task.title}</h2>
                    <p>{task.project?.name ?? 'Sin proyecto'}</p>

                {projects.length > 0 && (
  <div className="task-project-control">
    <button
      type="button"
      className="project-action-button"
      disabled={isChangingProject}
      aria-expanded={projectPickerTaskId === task.id}
      onClick={() => {
        setProjectPickerTaskId(
          projectPickerTaskId === task.id ? null : task.id
        )
      }}>
      {task.project ? 'Cambiar proyecto' : 'Asignar proyecto'}
    </button>

    {projectPickerTaskId === task.id && (
      <div className="project-picker">
        <label>
          Proyecto
          <select
            value={task.project?.id ?? ''}
            onChange={(event) => {
              void changeTaskProject(task.id, event.target.value)
            }}
            disabled={isChangingProject}>
            <option value="">Sin proyecto</option>

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="cancel-project-picker"
          disabled={isChangingProject}
          onClick={() => setProjectPickerTaskId(null)}>
          Cancelar
        </button>
      </div>
    )}
  </div>
)}

                <div className="task-dates">
                  <span className={
                    isOverdue
                    ? 'due-date overdue'
                    : isDueToday
                    ? 'due-date due-today'
                    : 'due-date'
                  }>
                    {isOverdue ? 'Vencida: ' : isDueToday ? 'Vence hoy: ' : 'Vence: '}
                    {formatDate(task.dueDate)}
                  </span>

                    {task.startDate && (
                      <span>Inicio: {formatDate(task.startDate)}</span>
                    )}

                    {task.completedDate && (
                      <span>Finalizada: {formatDate(task.completedDate)}</span>
                    )}
                  </div>
                </div>

                <span className={`priority priority-${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>

                <span className={task.status === 'Completada' ? 'status completed' : 'status'}>
                  {task.status}
                </span>

                <div className="task-actions">
                  {/* Abre o cierra el menú para cambiar el estado. */}
                  <div className="status-control">
                    <button
                      type="button"
                      disabled={isChangingStatus}
                      aria-expanded={openMenuId === task.id}
                      onClick={() => {
                        setOpenMenuId(openMenuId === task.id ? null : task.id)
                      }}>
                      Cambiar estado
                    </button>

                      {openMenuId === task.id && (
                    <div className="status-menu">
                      {taskStatus.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={isChangingStatus}
                        onClick={() => {
                          void changeTaskStatus(task.id, status)
                        }}>
                        {status}
                      </button>
                      ))}
                    </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(task)
                      setIsFormOpen(true)
                    }}>
                    Editar
                  </button>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => setTaskToDelete(task)}>
                    Eliminar
                  </button>
                </div>
              </article>
              )
            })}
          </div>
        </>
      )}

      {/* Modal reutilizado para crear y editar tareas. */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <TaskForm
              key={editingTask?.id ?? 'new'}
              initialData={editingTask
                ? { ...editingTask, project: editingTask.project?.name ?? '' }
                : undefined}
              initialStartDate={editingTask?.startDate}
              isEditing={editingTask !== null}
              onSave={saveTask}
              onCancel={closeTaskForm}
              projects={projects}
            />
          </div>
        </div>
      )}

      {/* Confirmación previa a la eliminación definitiva de una tarea. */}
      {taskToDelete && (
        <div className="modal-overlay">
          <div
            className="modal-content delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-title">
            <div className="delete-modal-icon" aria-hidden="true">!</div>
            <h2 id="delete-task-title">¿Eliminar esta tarea?</h2>
            <p>
              Estás por eliminar <strong>{taskToDelete.title}</strong>.
              Esta acción no se puede deshacer.
            </p>

            {taskError && (
              <p className="app-alert error" role="alert">
              {taskError}
            </p>
            )}

          <div className="delete-modal-actions">
            <button
              type="button"
              disabled={isDeletingTask}
              onClick={() => setTaskToDelete(null)}>
            Cancelar
            </button>

            <button
              type="button"
              className="delete-button"
              disabled={isDeletingTask}
              onClick={async () => {
                if (isDeletingTask) return

                  setIsDeletingTask(true)
              try {
                const error = await onDeleteTask(taskToDelete.id)

                if (!error) {
                  setTaskToDelete(null)
                  }
                } finally {
                  setIsDeletingTask(false)
                }
              }}>
                {isDeletingTask ? 'Eliminando...' : 'Eliminar tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
