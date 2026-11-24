
import { Link } from 'react-router-dom'
import type { Project, Task } from './taskTypes'
import { formatDate, getLocalDate } from './taskDates'

// Define los datos que Home recibe desde App.
type HomeProps = {
  tasks: Task[]
  projects: Project[]
}

function Home({ tasks, projects }: HomeProps) {
  // Calcula las estadísticas generales a partir de la lista de tareas.
  const totalTasks = tasks.length

  const pendingTasks = tasks.filter((task) =>
    task.status === 'No iniciada' || task.status === 'En pausa' || task.status === 'En espera',
  ).length

  const inProgressTasks = tasks.filter((task) => task.status === 'En progreso').length
  const completedTasks = tasks.filter((task) => task.status === 'Completada').length

  // Evita dividir por cero cuando todavía no existen tareas.
  const progress = totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * 100)

  const today = getLocalDate()

  const overdueTasks = tasks.filter((task) =>
    task.status !== 'Completada'
    && task.dueDate < today,
  )
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  .slice(0, 5)

  // Selecciona las próximas cinco tareas no completadas ni canceladas.
  // Después las ordena por fecha de vencimiento, de la más próxima
  // a la más lejana.
  const upcomingTasks = tasks
    .filter((task) =>
      task.status !== 'Completada'
      && task.status !== 'Cancelada'
      && task.dueDate >= today,
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)

  return (
    <>
      <section className="welcome">
        <p className="eyebrow">TU ESPACIO DE TRABAJO</p>
        <h1>Un buen día para avanzar.</h1>
        <p>Organizá tus tareas y seguí progresando.</p>
      </section>

      {/* Tarjetas con el resumen de tareas. */}
      <section className="stats-grid">
        <article className="stat-card">
          <p>Tareas totales</p>
          <h2>{totalTasks}</h2>
        </article>

        <article className="stat-card">
          <p>Pendientes</p>
          <h2>{pendingTasks}</h2>
        </article>

        <article className="stat-card">
          <p>En progreso</p>
          <h2>{inProgressTasks}</h2>
        </article>

        <article className="stat-card">
          <p>Completadas</p>
          <h2>{completedTasks}</h2>
        </article>
      </section>

      {/* Barra que representa el porcentaje de tareas completadas. */}
      <section className="progress-section">
        <div className="progress-header">
          <h2>Progreso general</h2>
          <span>{progress}%</span>
        </div>

        <div
          className="progress-track"
          role="progressbar"
          aria-label="Progreso general de tareas"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <p>
          {completedTasks} de {totalTasks} tareas completadas
        </p>
      </section>

      <section className="dashboard-details">
        {/* Panel de tareas próximas a vencer. */}

        <div className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <h2>Próximos vencimientos</h2>
            <Link to="/tasks">Ver tareas</Link>
          </div>

          {upcomingTasks.length === 0 ? (
          <p className="dashboard-empty">
            No hay tareas próximas a vencer.
          </p> ) : (
          <ul className="upcoming-list">
            {upcomingTasks.map((task) => (
            <li key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>{task.project?.name ?? 'Sin proyecto'}</span>
              </div>

              <time dateTime={task.dueDate}>
                {task.dueDate === today ? 'Hoy' : formatDate(task.dueDate)}
              </time>
            </li> ))}
          </ul>
            )}
        </div>

          {/* Tareas vencidas */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <h2>Tareas vencidas</h2>
            <Link to="/tasks">Ver tareas</Link>
          </div>

            {overdueTasks.length === 0 ? (
              <p className="dashboard-empty">
                ¡Todo al día! No tenés tareas vencidas.
              </p> ) : (
            <ul className="upcoming-list">
              {overdueTasks.map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.project?.name ?? 'Sin proyecto'}</span>
                </div>

                <time dateTime={task.dueDate}>
                  Venció el {formatDate(task.dueDate)}
                </time>
              </li> ))}
            </ul>
            )}
          </div>

        {/* Panel con el porcentaje de finalización de cada proyecto. */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <h2>Resumen por proyecto</h2>
            <Link to="/projects">Ver proyectos</Link>
          </div>

          {projects.length === 0 ? (
            <p className="dashboard-empty">Todavía no hay proyectos.</p>
          ) : (
            <ul className="dashboard-project-list">
              {projects.map((project) => {
                // Obtiene solamente las tareas asociadas a este proyecto.
                const projectTasks = tasks.filter((task) => task.project?.id === project.id)

                const projectCompleted = projectTasks.filter(
                  (task) => task.status === 'Completada',
                ).length

                // Calcula el progreso individual del proyecto.
                const projectProgress = projectTasks.length === 0
                  ? 0
                  : Math.round((projectCompleted / projectTasks.length) * 100)

                return (
                  <li key={project.id}>
                    <div className="dashboard-project-heading">
                      <Link to={`/projects/${project.id}/tasks`}>{project.name}</Link>
                      <span>{projectProgress}%</span>
                    </div>

                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={`Progreso de ${project.name}`}
                      aria-valuenow={projectProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="progress-fill" style={{ width: `${projectProgress}%` }} />
                    </div>

                    <small>
                      {projectTasks.length} tareas · {projectCompleted} completadas
                    </small>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}

export default Home
