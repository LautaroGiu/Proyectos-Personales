
import { useState } from 'react'
import {
  taskPriorities,
  taskStatus,
  type Project,
  type TaskPriority,
  type TaskStatus,
} from './taskTypes'
import { getLocalDate, isISODate } from './taskDates'

// Estructura de los datos que el formulario entrega al guardar una tarea.
export type TaskFormData = {
  title: string
  dueDate: string
  priority: TaskPriority
  status: TaskStatus
  project: string
}

type TaskFormProps = {
  initialData?: TaskFormData
  onSave: (data: TaskFormData) => Promise<string | null>
  onCancel: () => void
  isEditing: boolean
  projects: Project[]
  initialStartDate?: string | null
}

export default function TaskForm({
  initialData,
  onSave,
  onCancel,
  isEditing,
  projects,
  initialStartDate,
}: TaskFormProps) {
  // Cada estado representa el valor actual de un campo del formulario.
  // Si recibimos initialData, los campos se inicializan con esos valores.
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? '')
  const [priority, setPriority] = useState(initialData?.priority ?? 'Media')

  const [status, setStatus] = useState<TaskStatus>(
    initialData?.status ?? 'No iniciada',
  )

  const [project, setProject] = useState(initialData?.project ?? '')
  const [error, setError] = useState('')

  const [isSaving, setIsSaving] = useState(false)

  // Define la fecha mínima permitida para el vencimiento.
  // Si hay una fecha de inicio existente, la utiliza.
  // De lo contrario, ciertos estados requieren que no sea anterior a hoy.
  const minimumDueDate = initialStartDate
    ?? (status === 'En progreso' || status === 'Completada' ? getLocalDate() : undefined)

  return (
    <form
      className="task-form"
      onSubmit={async (event) => {
        event.preventDefault()

        if (isSaving) return

        setError('')

        if (!title.trim()) {
          setError('El título no puede estar vacío.')
          return
        }

        if (!dueDate) {
          setError('Tenés que elegir una fecha límite.')
          return
        }

        if (!isISODate(dueDate)) {
          setError('La fecha límite no es válida.')
          return
        }

        if (minimumDueDate && dueDate < minimumDueDate) {
          setError('La fecha límite no puede ser anterior al inicio de la tarea.')
          return
        }

        setIsSaving(true)

        try {
          const saveError = await onSave({
          title: title.trim(),
          dueDate,
          priority,
          status,
          project: project.trim(),
        })

          if (saveError) {
            setError(saveError)
          }
        } catch {
          setError('Ocurrió un error inesperado al guardar la tarea.')
        } finally {
          setIsSaving(false)
        } 
      }}>
      <h2>{initialData ? 'Editar tarea' : 'Nueva tarea'}</h2>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <label>
        Título
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej. Terminar mi portfolio"
          required
        />
      </label>

      <label>
        Fecha límite
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          min={minimumDueDate}
          required
        />
      </label>

      <label>
        Prioridad
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority)}>
          {taskPriorities.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {/* El estado inicial solo se puede elegir al crear una tarea. */}
      {!isEditing && (
        <label>
          Estado inicial
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
          >
            {taskStatus.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Proyecto
        <select value={project}
          onChange={(event) => setProject(event.target.value)}>
          <option value="">Sin proyecto</option>

          {/* Las opciones se generan a partir de los proyectos existentes. */}
          {projects.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </button>

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Guardando...' : initialData 
            ? 'Guardar cambios' : 'Crear tarea'}
        </button>
      </div>
    </form>
  )
}
