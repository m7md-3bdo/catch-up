const numberFormat = new Intl.NumberFormat('ar-EG')
const minuteMs = 60_000

export const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function calendarDate(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function validDay(key) {
  return typeof key === 'string' &&
    /^(20\d{2}|2100)-\d{2}-\d{2}$/.test(key) &&
    calendarDate(key).toISOString().slice(0, 10) === key
}

export function validTime(time) {
  return typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
}

export function weekdayFor(key) {
  return calendarDate(key).getUTCDay()
}

export function shiftDay(key, days) {
  const date = calendarDate(key)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function localInstant(key, time) {
  if (!validDay(key) || !validTime(time)) return null

  const [year, month, day] = key.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const date = new Date(year, month - 1, day, hour, minute)

  if (dayKey(date) !== key || date.getHours() !== hour || date.getMinutes() !== minute) {
    return null
  }

  return date.getTime()
}

export function localTimeValue(instant) {
  const date = new Date(instant)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

export function formatClock(instant) {
  return new Date(instant).toLocaleTimeString('ar-EG', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function formatDay(instant) {
  return new Date(instant).toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export function formatDayKey(key) {
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(calendarDate(key))
}

export function formatMinutes(minutes) {
  return `${numberFormat.format(minutes)} د`
}

export function seriesIncludes(series, key) {
  return validDay(key) && key >= series.startDate &&
    (!series.endDate || key <= series.endDate) && weekdayFor(key) === series.weekday
}

export function firstSeriesDay(series, fromDay) {
  const start = fromDay < series.startDate ? series.startDate : fromDay
  const distance = (series.weekday - weekdayFor(start) + 7) % 7
  const occurrenceDay = shiftDay(start, distance)
  return seriesIncludes(series, occurrenceDay) ? occurrenceDay : ''
}

function getOccurrences(appointments, today) {
  const occurrences = []
  const skippedNames = []
  const nearbyDays = [shiftDay(today, -1), today]

  for (const appointment of appointments) {
    if (appointment.kind === 'once') {
      occurrences.push(appointment)
      continue
    }

    for (const exception of appointment.exceptions) {
      if (exception.kind === 'edit') {
        occurrences.push({ ...exception, id: `${appointment.id}:${exception.date}` })
      }
    }

    for (const date of nearbyDays) {
      if (!seriesIncludes(appointment, date) ||
          appointment.exceptions.some(exception => exception.date === date)) continue

      const startAt = localInstant(date, appointment.time)
      if (startAt === null) {
        if (date === today) skippedNames.push(appointment.name)
        continue
      }
      occurrences.push({ ...appointment, id: `${appointment.id}:${date}`, startAt })
    }
  }

  return { occurrences, skippedNames }
}

export function getTodayPlan(appointments, tasks, now) {
  const today = dayKey(new Date(now))
  const { occurrences, skippedNames } = getOccurrences(appointments, today)
  let currentEnd = now
  let nextAppointment = null

  for (const appointment of occurrences) {
    if (appointment.startAt <= now) {
      const endAt = appointment.startAt + appointment.duration * minuteMs
      currentEnd = Math.max(currentEnd, endAt)
    } else if (dayKey(new Date(appointment.startAt)) === today &&
      (!nextAppointment || appointment.startAt < nextAppointment.startAt ||
        (appointment.startAt === nextAppointment.startAt && appointment.travel > nextAppointment.travel))) {
      nextAppointment = appointment
    }
  }

  const leaveAt = nextAppointment ? nextAppointment.startAt - nextAppointment.travel * minuteMs : null
  const timeLeft = leaveAt === null ? null : Math.max(0, Math.floor((leaveAt - currentEnd) / minuteMs))
  const suggestedTasks = tasks
    .filter(task => !task.done && (timeLeft === null || task.duration <= timeLeft))
    .sort((first, second) => second.priority - first.priority ||
      (first.deadline || '9999').localeCompare(second.deadline || '9999'))

  return {
    nextAppointment,
    leaveAt,
    timeLeft,
    currentEnd: currentEnd > now ? currentEnd : null,
    departurePassed: leaveAt !== null && leaveAt < now,
    suggestedTasks,
    skippedNames,
  }
}
