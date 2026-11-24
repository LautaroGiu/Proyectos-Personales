
import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Project, Task } from './taskTypes'

// Propiedades que recibe la página desde App.tsx.
// Las operaciones se ejecutan en el padre para mantener un estado compartido.
type ProjectsPageProps = {
  projects: Project[]
  tasks: Task[]
  onCreateProject: (name: string) => Promise<string | null>
  onRenameProject: (projectId: number, name: string) => Promise<string | null>
  onDeleteProject: (
  projectId: number,
  deleteTasks: boolean,
  ) => Promise<string | null>
}

export default function ProjectsPage({
  projects,
  tasks,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectsPageProps) {
  // Estados locales de los formularios y los mensajes de la interfaz.
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [editedProjectName, setEditedProjectName] = useState('')
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isRenamingProject, setIsRenamingProject] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)

  // Cierra el modal al presionar Escape.
  useEffect(() => {
    if (!projectToDelete) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectToDelete(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [projectToDelete])

  // Envía el formulario de creación y muestra el resultado.
  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isCreatingProject) return
    setIsCreatingProject(true)

    try {
      const saveError = await onCreateProject(newProjectName)

      if (saveError) {
        setError(saveError)
        setSuccess(null)
        return
      }

      setNewProjectName('')
      setError(null)
      setSuccess('Proyecto creado correctamente.')
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleDeleteProject = async (deleteTasks: boolean) => {
    if (isDeletingProject) return
    setIsDeletingProject(true)

    try {
      if (!projectToDelete) return

      setError(null)
      setSuccess(null)

      const deleteError = await onDeleteProject(
        projectToDelete.id,
        deleteTasks,
      )

      setProjectToDelete(null)

      if (deleteError) {
        setError(deleteError)
        return
      }

      setSuccess(
        deleteTasks
          ? 'El proyecto y sus tareas fueron eliminados.'
          : 'Proyecto eliminado. Las tareas se conservaron sin proyecto.',
      )
    } finally {
      setIsDeletingProject(false)
    }
  }

  // Envía el formulario de edición para renombrar un proyecto.
  const renameProject = async (
    event: FormEvent<HTMLFormElement>,
    projectId: number,
  ) => {
    event.preventDefault()

    if (isRenamingProject) return
    setIsRenamingProject(true)

    try {
      const saveError = await onRenameProject(projectId, editedProjectName)

      if (saveError) {
        setError(saveError)
        setSuccess(null)
        return
      }

      setEditingProjectId(null)
      setEditedProjectName('')
      setError(null)
      setSuccess('Proyecto renombrado correctamente.')
    } finally {
      setIsRenamingProject(false)
    }
  }

  return (
    <section className="projects-section page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PLANIFICACIÓN</p>
          <h1>Mis proyectos</h1>
          <p>Administrá tus proyectos y consultá el avance de sus tareas.</p>
        </div>
      </div>

      {/* Formulario para crear un proyecto nuevo. */}
      <form className="project-create-form" onSubmit={createProject}>
        <input
          type="text"
          value={newProjectName}
          onChange={(event) => setNewProjectName(event.target.value)}
          placeholder="Nombre del proyecto"
          aria-label="Nombre del proyecto"
          maxLength={60}
          required
        />

        <button type="submit" disabled={isCreatingProject}>
          Crear proyecto
        </button>
      </form>

      {/* Mensajes de error y éxito de las operaciones. */}
      {error && <p className="project-message error" role="alert">{error}</p>}
      {success && <p className="project-message success" role="status">{success}</p>}

      {projects.length === 0 ? (
        <div className="empty-state project-empty">
          <h2>Todavía no hay proyectos</h2>
          <p>Creá un proyecto para empezar a organizar tus tareas.</p>
        </div>
      ) : (
        <div className="project-card-grid">
          {projects.map((project) => {
            // Obtiene las tareas que pertenecen al proyecto actual.
            const projectTasks = tasks.filter((task) => task.project?.id === project.id)

            const completedTasks = projectTasks.filter(
              (task) => task.status === 'Completada',
            ).length

            // Calcula el porcentaje de tareas completadas.
            // Si el proyecto no tiene tareas, el progreso es cero.
            const progress = projectTasks.length === 0
              ? 0
              : Math.round((completedTasks / projectTasks.length) * 100)

            return (
              <article className="project-card" key={project.id}>
                {/* Al editar, reemplaza la tarjeta por el formulario correspondiente. */}
                {editingProjectId === project.id ? (
                  <form
                    className="project-edit-form"
                    onSubmit={(event) => renameProject(event, project.id)}>
                    <input
                      type="text"
                      value={editedProjectName}
                      onChange={(event) => setEditedProjectName(event.target.value)}
                      aria-label={`Nuevo nombre para ${project.name}`}
                      maxLength={60}
                      required
                      autoFocus
                    />

                    <button type="submit" disabled={isRenamingProject}>
                      Guardar
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setEditingProjectId(null)
                        setEditedProjectName('')
                        setError(null)
                      }}>
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="project-card-heading">
                      <h2>{project.name}</h2>
                      <span>
                        {projectTasks.length} {projectTasks.length === 1 ? 'tarea' : 'tareas'}
                      </span>
                    </div>

                    <div className="progress-header">
                      <span>Progreso</span>
                      <strong>{progress}%</strong>
                    </div>

                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={`Progreso de ${project.name}`}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>

                    <p className="project-completion">
                      {completedTasks} de {projectTasks.length} tareas completadas
                    </p>

                    <div className="project-card-actions">
                      <Link className="project-open-link" to={`/projects/${project.id}/tasks`}>
                        Ver tareas
                      </Link>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setEditingProjectId(project.id)
                          setEditedProjectName(project.name)
                          setError(null)
                          setSuccess(null)
                        }}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => setProjectToDelete(project)}>
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* Permite elegir qué hacer con las tareas al eliminar un proyecto. */}
      {projectToDelete && (
        <div className="modal-overlay" onClick={() => setProjectToDelete(null)}>
          <div
            className="modal-content delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            onClick={(event) => event.stopPropagation()}>
            <div className="delete-modal-icon" aria-hidden="true">
              !
            </div>

            <h2 id="delete-project-title">Eliminar proyecto</h2>

            <p>
              ¿Qué querés hacer con las tareas de{' '}
              <strong>{projectToDelete.name}</strong>?
            </p>

            <div className="delete-modal-options">
              <button
                  type="button"
                  className="delete-button"
                  disabled={isDeletingProject}
                  onClick={() => {
                    void handleDeleteProject(true)
                  }}>
                  Eliminar el proyecto y sus tareas
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={isDeletingProject}
                onClick={() => {
                  void handleDeleteProject(false)
                }}>
                  Eliminar proyecto y conservar las tareas
              </button>

              <button
                type="button"
                className="secondary-button"
                autoFocus
                onClick={() => setProjectToDelete(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
