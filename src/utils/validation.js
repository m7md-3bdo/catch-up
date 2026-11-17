import { firstSeriesDay, seriesIncludes, validDay, validTime } from './time.js'

export const maxNameLength = 80
export const maxDuration = 1440
export const maxTravel = 720
export const maxBackupSize = 1_000_000
const maxItems = 500
const maxExceptions = 2000
const minInstant = Date.UTC(1999, 0, 1)
const maxInstant = Date.UTC(2102, 0, 1)

export function cleanName(value) {
  if (typeof value !== 'string') return null
  const name = value.trim()
  if (!name || name.length > maxNameLength ||
      /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(name)) return null
  return name
}

export function validInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max
}

function validId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(id)
}

function validInstant(value) {
  return validInteger(value, minInstant, maxInstant - 1) && value % 60_000 === 0
}

function cleanTiming(appointment) {
  const name = cleanName(appointment.name)
  const { duration, travel } = appointment
  if (!name || !validInteger(duration, 1, maxDuration) ||
      !validInteger(travel, 0, maxTravel)) return null
  return { name, duration, travel }
}

function cleanException(exception, series) {
  if (!exception || !seriesIncludes(series, exception.date)) return null
  const { date, kind } = exception
  if (kind === 'cancel') return { date, kind }

  const timing = cleanTiming(exception)
  if (kind !== 'edit' || !timing || !validInstant(exception.startAt)) return null
  return { date, kind, ...timing, startAt: exception.startAt }
}

function cleanAppointment(appointment) {
  if (!appointment || !validId(appointment.id)) return null
  const timing = cleanTiming(appointment)
  if (!timing) return null
  const { id, kind, startAt, weekday, time, startDate, endDate } = appointment

  if (kind === 'once') {
    return validInstant(startAt) ? { id, kind, startAt, ...timing } : null
  }

  if (kind !== 'weekly' || !validInteger(weekday, 0, 6) || !validTime(time) ||
      !validDay(startDate) || (endDate !== '' && (!validDay(endDate) || endDate < startDate)) ||
      !Array.isArray(appointment.exceptions) || appointment.exceptions.length > maxExceptions) return null

  const series = { id, kind, ...timing, weekday, time, startDate, endDate }
  if (!firstSeriesDay(series, startDate)) return null
  const dates = new Set()
  const exceptions = []
  for (const exception of appointment.exceptions) {
    const clean = cleanException(exception, series)
    if (!clean || dates.has(clean.date)) return null
    dates.add(clean.date)
    exceptions.push(clean)
  }
  return { ...series, exceptions }
}

function cleanTask(task) {
  if (!task || !validId(task.id)) return null
  const { id, duration, priority, deadline, done } = task
  const name = cleanName(task.name)
  if (!name || !validInteger(duration, 1, maxDuration) || !validInteger(priority, 1, 3) ||
      (deadline !== '' && !validDay(deadline)) || typeof done !== 'boolean') return null
  return { id, name, duration, priority, deadline, done }
}

export function validateSchedule(schedule) {
  if (!schedule || schedule.version !== 1 || !Array.isArray(schedule.appointments) ||
      !Array.isArray(schedule.tasks) || schedule.appointments.length > maxItems ||
      schedule.tasks.length > maxItems) return null

  const appointments = schedule.appointments.map(cleanAppointment)
  const tasks = schedule.tasks.map(cleanTask)
  if (appointments.includes(null) || tasks.includes(null)) return null

  const ids = [...appointments, ...tasks].map(item => item.id)
  const exceptionCount = appointments.reduce((total, item) => total + (item.exceptions?.length || 0), 0)
  if (new Set(ids).size !== ids.length || exceptionCount > maxExceptions) return null
  return { version: 1, appointments, tasks }
}
