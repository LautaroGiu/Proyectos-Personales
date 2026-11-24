export const taskStatus = [
  'No iniciada',
  'En pausa',
  'En espera',
  'En progreso',
  'Completada',
  'Cancelada',
] as const

export type TaskStatus = (typeof taskStatus)[number]

export const taskPriorities = ['Baja', 'Media', 'Alta'] as const

export type TaskPriority = (typeof taskPriorities)[number]

export type Project = {
  id: number
  name: string
}

export type Task = {
  id: number
  title: string
  project: Project | null
  priority: TaskPriority
  status: TaskStatus
  startDate: string | null
  dueDate: string
  completedDate: string | null
}
