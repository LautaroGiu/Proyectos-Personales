
// Devuelve la fecha actual en formato AAAA-MM-DD.
// Se construye utilizando la fecha local para evitar que la zona horaria
// cambie el día que se utiliza en la aplicación.
export function getLocalDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// Comprueba que el valor sea una fecha real con formato AAAA-MM-DD.
// No alcanza con revisar la expresión regular: también hay que comprobar
// que el día exista dentro del mes y que el mes sea válido.
export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)

  // Evita aceptar años demasiado antiguos para el uso previsto.
  if (year < 1000) {
    return false
  }

  // UTC permite comprobar los componentes sin depender de la hora local.
  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  return parsedDate.getUTCFullYear() === year
    && parsedDate.getUTCMonth() === month - 1
    && parsedDate.getUTCDate() === day
}

// Convierte una fecha AAAA-MM-DD al formato DD/MM/AAAA
// para mostrarla de una forma más familiar al usuario.
export function formatDate(date: string) {
  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
}
