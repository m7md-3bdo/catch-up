import React, { useState } from 'react'
import AppointmentFields from './AppointmentFields.jsx'
import { dayKey, firstSeriesDay, formatClock, formatDayKey, localInstant, localTimeValue, seriesIncludes } from '../utils/time.js'
import { cleanName, maxDuration, maxTravel, validInteger } from '../utils/validation.js'

function ChangeOccurrence({ series, date, exception, saveException, closeForm }) {
  const edited = exception?.kind === 'edit'
  const [fields, setFields] = useState({
    date: edited ? dayKey(new Date(exception.startAt)) : date,
    time: edited ? localTimeValue(exception.startAt) : series.time,
    name: edited ? exception.name : series.name,
    duration: String(edited ? exception.duration : series.duration),
    travel: String(edited ? exception.travel : series.travel),
  })
  const [error, setError] = useState('')

  function updateField(event) {
    const { name, value } = event.target
    setFields(previous => ({ ...previous, [name]: value }))
  }

  async function submitChange(event) {
    event.preventDefault()
    const name = cleanName(fields.name)
    const duration = Number(fields.duration)
    const travel = Number(fields.travel)
    const sameLocalTime = edited && fields.date === dayKey(new Date(exception.startAt)) &&
      fields.time === localTimeValue(exception.startAt)
    const startAt = sameLocalTime ? exception.startAt : localInstant(fields.date, fields.time)
    if (!name || startAt === null || !validInteger(duration, 1, maxDuration) ||
        !fields.travel || !validInteger(travel, 0, maxTravel)) {
      setError('راجع الحقول. لو الساعة دي مش موجودة بسبب تغيير التوقيت، اختار وقت تاني.')
      return
    }
    if (await saveException(series.id, date, { date, kind: 'edit', name, startAt, duration, travel })) closeForm()
  }

  return (
    <form className="occurrence-form" onSubmit={submitChange} noValidate>
      <div className="form-grid">
        <AppointmentFields fields={fields} updateField={updateField} />
        <label className="field">التاريخ الجديد
          <input type="date" name="date" className="form-control" value={fields.date} onChange={updateField}
            min="2000-01-01" max="2100-12-31" required />
        </label>
        <label className="field">الساعة الجديدة
          <input type="time" name="time" className="form-control" value={fields.time} onChange={updateField} required />
        </label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" className="btn btn-primary">حفظ تعديل اليوم</button>
        <button type="button" className="btn btn-outline-light" onClick={closeForm}>رجوع</button>
      </div>
    </form>
  )
}

export default function OccurrenceEditor({ series, now, saveException }) {
  const [date, setDate] = useState(() =>
    firstSeriesDay(series, dayKey(new Date(now))) || firstSeriesDay(series, series.startDate))
  const [editing, setEditing] = useState(false)
  const validOccurrence = seriesIncludes(series, date)
  const exception = series.exceptions.find(item => item.date === date)

  function chooseDate(newDate) {
    setDate(newDate)
    setEditing(false)
  }

  async function cancelOccurrence() {
    if (window.confirm('تحب تلغي المعاد في اليوم ده بس؟')) {
      if (await saveException(series.id, date, { date, kind: 'cancel' })) setEditing(false)
    }
  }

  return (
    <div className="occurrence-editor">
      <h3>إدارة يوم من السلسلة</h3>
      <label className="field occurrence-date">تاريخ المعاد الأصلي
        <input type="date" className="form-control" value={date} onChange={event => chooseDate(event.target.value)}
          min={series.startDate} max={series.endDate || '2100-12-31'} />
      </label>
      {!validOccurrence && <p className="form-error">اختار تاريخ فيه معاد من السلسلة دي.</p>}
      {exception?.kind === 'cancel' && <p className="row-details">معاد اليوم ده ملغي.</p>}
      {exception?.kind === 'edit' && <p className="row-details">
        المعاد اتنقل لـ {formatDayKey(dayKey(new Date(exception.startAt)))}، الساعة {formatClock(exception.startAt)}.
      </p>}
      {validOccurrence && !editing && (
        <div className="actions">
          <button type="button" className="btn btn-outline-light" onClick={() => setEditing(true)}>تعديل اليوم ده</button>
          {exception?.kind !== 'cancel' && (
            <button type="button" className="btn btn-danger-text" onClick={cancelOccurrence}>إلغاء معاد اليوم ده</button>
          )}
          {exception && <button type="button" className="btn btn-text" onClick={() => saveException(series.id, date, null)}>
            استرجاع المعاد الأصلي
          </button>}
        </div>
      )}
      {validOccurrence && editing && (
        <ChangeOccurrence key={date} series={series} date={date} exception={exception} saveException={saveException}
          closeForm={() => setEditing(false)} />
      )}
      {series.exceptions.length > 0 && (
        <details className="exception-list">
          <summary>الأيام المعدّلة أو الملغية ({series.exceptions.length})</summary>
          <ul className="list-unstyled mb-0">
            {[...series.exceptions].sort((a, b) => a.date.localeCompare(b.date)).map(item => (
              <li key={item.date}>
                <button type="button" className="btn btn-text btn-sm" onClick={() => chooseDate(item.date)}>
                  {formatDayKey(item.date)} · {item.kind === 'cancel' ? 'ملغي' : 'معدّل'}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
