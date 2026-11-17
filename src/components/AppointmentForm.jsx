import React, { useState } from 'react'
import AppointmentFields from './AppointmentFields.jsx'
import { dayKey, firstSeriesDay, localInstant, localTimeValue, seriesIncludes, validDay, validTime, weekDays } from '../utils/time.js'
import { cleanName, maxDuration, maxTravel, validInteger } from '../utils/validation.js'

function appointmentFields(appointment, now) {
  if (!appointment) return {
    kind: 'once', name: '', duration: '', travel: '0', date: dayKey(new Date(now)), time: '',
    weekday: String(new Date(now).getDay()), endDate: '', hasEnd: false,
  }
  return {
    kind: appointment.kind, name: appointment.name, duration: String(appointment.duration), travel: String(appointment.travel),
    date: appointment.kind === 'once' ? dayKey(new Date(appointment.startAt)) : appointment.startDate,
    time: appointment.kind === 'once' ? localTimeValue(appointment.startAt) : appointment.time,
    weekday: String(appointment.weekday ?? 0), endDate: appointment.endDate || '', hasEnd: Boolean(appointment.endDate),
  }
}

export default function AppointmentForm({ appointment, now, saveAppointment, closeEditor }) {
  const [sourceAppointment] = useState(appointment)
  const [fields, setFields] = useState(() => appointmentFields(appointment, now))
  const [error, setError] = useState('')
  const weekly = fields.kind === 'weekly'

  function updateField(event) {
    const { name, value, checked, type } = event.target
    setFields(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }))
  }

  async function submitAppointment(event) {
    event.preventDefault()
    const { date, time, kind, hasEnd } = fields
    const name = cleanName(fields.name)
    const duration = Number(fields.duration)
    const travel = Number(fields.travel)
    if (!name || !validDay(date) || !validTime(time) || !validInteger(duration, 1, maxDuration) ||
        !fields.travel || !validInteger(travel, 0, maxTravel)) {
      setError('راجع الاسم والتاريخ والوقت والمدة ووقت الطريق.')
      return
    }

    if (!weekly) {
      const sameLocalTime = sourceAppointment && date === dayKey(new Date(sourceAppointment.startAt)) &&
        time === localTimeValue(sourceAppointment.startAt)
      const startAt = sameLocalTime ? sourceAppointment.startAt : localInstant(date, time)
      if (startAt === null) {
        setError('الساعة دي مش موجودة في اليوم ده بسبب تغيير التوقيت. اختار وقت تاني.')
        return
      }
      if (await saveAppointment({ kind, name, duration, travel, startAt }, sourceAppointment)) closeEditor()
      return
    }

    const weekday = Number(fields.weekday)
    const endDate = hasEnd ? fields.endDate : ''
    const series = { kind, name, duration, travel, weekday, time, startDate: date, endDate }
    if (!validInteger(weekday, 0, 6) || (hasEnd && (!validDay(endDate) || endDate < date)) ||
        !firstSeriesDay(series, date)) {
      setError('اختار فترة فيها يوم واحد على الأقل من يوم التكرار اللي اخترته.')
      return
    }

    const oldExceptions = sourceAppointment?.exceptions || []
    const exceptions = oldExceptions.filter(exception => seriesIncludes(series, exception.date))
    if (exceptions.length < oldExceptions.length &&
        !window.confirm('تغيير يوم التكرار أو مدته هيمسح تعديلات الأيام اللي خرجت من الجدول. تكمل؟')) return
    if (await saveAppointment({ ...series, exceptions }, sourceAppointment)) closeEditor()
  }

  return (
    <section className="editor" aria-labelledby="appointment-form-heading">
      <h2 id="appointment-form-heading">{appointment ? 'تعديل المعاد' : 'إضافة معاد'}</h2>
      <form onSubmit={submitAppointment} noValidate>
        <div className="form-grid">
          {!appointment && <label className="field">نوع المعاد
            <select name="kind" className="form-select" value={fields.kind} onChange={updateField}>
              <option value="once">مرة واحدة</option><option value="weekly">يتكرر كل أسبوع</option>
            </select>
          </label>}
          <AppointmentFields fields={fields} updateField={updateField} />
          {weekly && <label className="field">يوم التكرار
            <select name="weekday" className="form-select" value={fields.weekday} onChange={updateField}>
              {weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>}
          <label className="field">{weekly ? 'التكرار يبدأ من' : 'التاريخ'}
            <input name="date" type="date" className="form-control" value={fields.date} onChange={updateField}
              min="2000-01-01" max="2100-12-31" required />
          </label>
          <label className="field">الساعة
            <input name="time" type="time" className="form-control" value={fields.time} onChange={updateField} required />
          </label>
          {weekly && (
            <div className="field">
              <label className="check-field">
                <input className="form-check-input" type="checkbox" name="hasEnd" checked={fields.hasEnd} onChange={updateField} />
                تحديد تاريخ انتهاء
              </label>
              {fields.hasEnd ? <label className="field">تاريخ الانتهاء
                <input name="endDate" type="date" className="form-control" value={fields.endDate} onChange={updateField}
                  min={fields.date || '2000-01-01'} max="2100-12-31" required />
              </label> : <span className="optional">بدون تاريخ انتهاء</span>}
            </div>
          )}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="actions">
          <button type="submit" className="btn btn-primary">{appointment ? 'حفظ التعديل' : 'حفظ المعاد'}</button>
          <button type="button" className="btn btn-outline-light" onClick={closeEditor}>رجوع</button>
        </div>
      </form>
    </section>
  )
}
