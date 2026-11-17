import React from 'react'
import { dayKey, formatClock, formatDay, formatMinutes } from '../utils/time.js'

export default function Today({ plan, now, openAppointments, openTasks, toggleTask }) {
  const { nextAppointment, timeLeft, leaveAt, currentEnd, departurePassed, suggestedTasks, skippedNames } = plan

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="heading-date">{formatDay(now)}</p>
          <h1>النهارده</h1>
        </div>
        <button type="button" className="btn btn-outline-light" onClick={openAppointments}>إدارة المواعيد</button>
      </div>

      <section className="time-summary" aria-label="الوقت المتاح">
        <div className="available-box">
          <p className="section-kicker">الوقت المتاح</p>
          {nextAppointment ? (
            <>
              <p className="available-time">{formatMinutes(timeLeft)}</p>
              <p className="summary-note">{departurePassed ? 'وقت التحرك عدى' : 'قبل ميعاد التحرك'}</p>
            </>
          ) : (
            <p className="no-appointment">مفيش مواعيد تانية النهارده</p>
          )}
          {currentEnd !== null && <p className="active-note">معادك الحالي يخلص {formatClock(currentEnd)}</p>}
        </div>
        {nextAppointment && (
          <div className="next-box">
            <p className="section-kicker">المعاد الجاي</p>
            <h2><bdi>{nextAppointment.name}</bdi></h2>
            <div className="appointment-times">
              <div><span>بداية المعاد</span><strong>{formatClock(nextAppointment.startAt)}</strong></div>
              <div>
                <span>اتحرك الساعة</span>
                <strong>{dayKey(new Date(leaveAt)) !== dayKey(new Date(now)) && 'امبارح '}{formatClock(leaveAt)}</strong>
              </div>
            </div>
          </div>
        )}
      </section>

      {skippedNames.length > 0 && (
        <div className="notice" role="status">
          في مواعيد وقتها اختفى بسبب تغيير الساعة. عدّل معاد النهارده من شاشة المواعيد.
          <ul className="mb-0">{skippedNames.map((name, index) => <li key={index}>{name}</li>)}</ul>
        </div>
      )}

      <section className="list-section" aria-labelledby="suggestions-heading">
        <div className="section-heading">
          <div>
            <h2 id="suggestions-heading">{nextAppointment ? 'تلحق تعمل إيه؟' : 'المهام اللي لسه مخلصتش'}</h2>
            {nextAppointment && suggestedTasks.length > 0 && <p>مدة كل مهمة هنا تكفي لو بدأت بيها.</p>}
          </div>
          <button type="button" className="btn btn-text" onClick={openTasks}>إدارة المهام</button>
        </div>
        {suggestedTasks.length > 0 ? (
          <ul className="list-unstyled entry-list">
            {suggestedTasks.map(task => (
              <li className="entry-row" key={task.id}>
                <div className="row-main">
                  <bdi className="entry-name">{task.name}</bdi>
                  <span className="duration-label">{formatMinutes(task.duration)}</span>
                </div>
                <button type="button" className="btn btn-outline-light btn-sm" onClick={() => toggleTask(task.id)}>
                  خلصتها
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-list">{nextAppointment ? 'مفيش مهام مناسبة للوقت ده.' : 'كل مهامك خلصانة.'}</p>
        )}
      </section>
    </>
  )
}
