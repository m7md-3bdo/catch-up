import React, { useState } from 'react'
import AppointmentForm from './AppointmentForm.jsx'
import OccurrenceEditor from './OccurrenceEditor.jsx'
import { dayKey, formatClock, formatDayKey, formatMinutes, weekDays } from '../utils/time.js'

const newAppointmentEditor = Symbol('new-appointment')

export default function Appointments({ appointments, now, saveAppointment, deleteAppointment, saveException }) {
  const [editor, setEditor] = useState(null)
  const [openSeries, setOpenSeries] = useState(null)
  const editedAppointment = appointments.find(item => item.id === editor)
  const orderedAppointments = [...appointments].sort((first, second) => {
    if (first.kind !== second.kind) return first.kind === 'once' ? -1 : 1
    return first.kind === 'once' ? first.startAt - second.startAt : first.weekday - second.weekday
  })

  function openEditor(id) {
    setEditor(id)
    setOpenSeries(null)
    document.getElementById('main-content')?.scrollIntoView({ block: 'start' })
  }

  async function removeAppointment(appointment) {
    const message = appointment.kind === 'weekly' ? 'تحب تحذف السلسلة كلها وتعديلات أيامها؟' : 'تحب تحذف المعاد ده؟'
    if (!window.confirm(message) || !await deleteAppointment(appointment.id)) return
    if (editor === appointment.id) setEditor(null)
    if (openSeries === appointment.id) setOpenSeries(null)
  }

  return (
    <>
      <div className="page-heading">
        <h1>المواعيد</h1>
        <button type="button" className="btn btn-primary" onClick={() => openEditor(newAppointmentEditor)}>إضافة معاد</button>
      </div>
      {(editor === newAppointmentEditor || editedAppointment) && (
        <AppointmentForm key={editedAppointment?.id ? `edit:${editedAppointment.id}` : 'new'} appointment={editedAppointment} now={now}
          saveAppointment={saveAppointment} closeEditor={() => setEditor(null)} />
      )}
      <section className="list-section" aria-labelledby="appointment-list-heading">
        <div className="section-heading"><h2 id="appointment-list-heading">جدول المواعيد</h2></div>
        {orderedAppointments.length > 0 ? (
          <ul className="list-unstyled entry-list">
            {orderedAppointments.map(appointment => {
              const weekly = appointment.kind === 'weekly'
              return (
                <li key={appointment.id}>
                  <div className="entry-row">
                    <div className="row-main">
                      <bdi className="entry-name">{appointment.name}</bdi>
                      <span className="row-details">
                        {weekly ? <>كل {weekDays[appointment.weekday]}، الساعة <bdi>{appointment.time}</bdi></> :
                          <>{formatDayKey(dayKey(new Date(appointment.startAt)))}، الساعة {formatClock(appointment.startAt)}</>}
                        {' · المدة '}{formatMinutes(appointment.duration)}{' · الطريق '}{formatMinutes(appointment.travel)}
                      </span>
                      {weekly && <span className="row-details">
                        من {formatDayKey(appointment.startDate)}
                        {appointment.endDate ? <> لحد {formatDayKey(appointment.endDate)}</> : ' · بدون تاريخ انتهاء'}
                      </span>}
                    </div>
                    <div className="row-actions">
                      {weekly && <button type="button" className="btn btn-outline-light btn-sm"
                        aria-expanded={openSeries === appointment.id}
                        onClick={() => setOpenSeries(openSeries === appointment.id ? null : appointment.id)}>
                        {openSeries === appointment.id ? 'إغلاق' : 'إدارة يوم'}
                      </button>}
                      <button type="button" className="btn btn-text btn-sm" onClick={() => openEditor(appointment.id)}>
                        {weekly ? 'تعديل السلسلة' : 'تعديل'}
                      </button>
                      <button type="button" className="btn btn-danger-text btn-sm" onClick={() => removeAppointment(appointment)}>
                        {weekly ? 'حذف السلسلة' : 'حذف'}
                      </button>
                    </div>
                  </div>
                  {weekly && openSeries === appointment.id && (
                    <OccurrenceEditor series={appointment} now={now} saveException={saveException} />
                  )}
                </li>
              )
            })}
          </ul>
        ) : <p className="empty-list">لسه مفيش مواعيد. ابدأ بإضافة معاد.</p>}
      </section>
    </>
  )
}
