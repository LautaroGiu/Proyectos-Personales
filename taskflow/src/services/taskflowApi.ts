import type { Project, Task, TaskStatus } from '../../components/taskTypes'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '')

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}


async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response

  // 1. Enviamos la petición al backend.
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: options.body === undefined
        ? undefined
        : { 'Content-Type': 'application/json' },
      body: options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Comprobá que el backend esté funcionando.',
    )
  }

  // 2. Leemos el contenido de la respuesta.
  const responseText = await response.text()

  let data: unknown = null

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(
        'El servidor devolvió una respuesta inválida.',
      )
    }
  }

  // 3. Comprobamos si la petición fue exitosa.
  if (!response.ok) {
    const message =
      typeof data === 'object'
      && data !== null
      && 'message' in data
      && typeof data.message === 'string'
        ? data.message
        : `Error HTTP ${response.status}`

    throw new Error(message)
  }

  // 4. Devolvemos los datos recibidos.
  return data as T
}


export type TaskWritePayload = {
  title: string
  projectId: number | null
  priority: Task['priority']
  status: TaskStatus
  startDate: string | null
  dueDate: string
  completedDate: string | null
}

export function getTasks(): Promise<Task[]> {
  return request<Task[]>('/tasks')
}

export function getProjects(): Promise<Project[]> {
  return request<Project[]>('/projects')
}

export function createProject(name: string): Promise<Project> {
  return request<Project>('/projects', {
    method: 'POST',
    body: { name },
  })
}

export function renameProject(
  id: number,
  name: string,
): Promise<Project> {
  return request<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: { name },
  })
}

export function deleteProject(
  id: number,
  deleteTasks: boolean,
) {
  return request<{
    status: string
    message: string
    project: Project
    tasksDeleted: boolean
  }>(`/projects/${id}?deleteTasks=${deleteTasks}`, {
    method: 'DELETE',
  })
}

export function createTask(data: TaskWritePayload): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    body: data,
  })
}

export function updateTask(
  id: number,
  data: TaskWritePayload,
): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export function deleteTask(id: number) {
  return request<{
    status: string
    message: string
    id: number
  }>(`/tasks/${id}`, {
    method: 'DELETE',
  })
}