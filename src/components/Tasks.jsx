import React, { useState } from 'react'
import { formatDayKey, formatMinutes, validDay } from '../utils/time.js'
import { cleanName, maxDuration, maxNameLength, validInteger } from '../utils/validation.js'

const emptyTask = { name: '', duration: '', priority: '2', deadline: '' }
const priorities = { 1: 'قليلة', 2: 'متوسطة', 3: 'عالية' }

export default function Tasks({ tasks, saveTask, toggleTask, deleteTask }) {
  const [editingId, setEditingId] = useState(null)
  const [taskFields, setTaskFields] = useState(emptyTask)
  const [error, setError] = useState('')
  const orderedTasks = [...tasks].sort((first, second) => Number(first.done) - Number(second.done))

  function setField(event) {
    const { name, value } = event.target
    setTaskFields(previous => ({ ...previous, [name]: value }))
  }

  function resetForm() {
    setEditingId(null)
    setTaskFields(emptyTask)
    setError('')
  }

  function editTask(task) {
    setEditingId(task.id)
    setTaskFields({
      name: task.name, duration: String(task.duration), priority: String(task.priority), deadline: task.deadline,
    })
    setError('')
    document.getElementById('task-name')?.focus()
  }

  async function submitTask(event) {
    event.preventDefault()
    const name = cleanName(taskFields.name)
    const duration = Number(taskFields.duration)
    const priority = Number(taskFields.priority)
    const { deadline } = taskFields

    if (!name || !validInteger(duration, 1, maxDuration) || !validInteger(priority, 1, 3) ||
        (deadline && !validDay(deadline))) {
      setError('راجع اسم المهمة ومدتها وأولويتها وتاريخ التسليم.')
      return
    }

    if (await saveTask({ name, duration, priority, deadline }, editingId)) resetForm()
  }

  return (
    <>
      <div className="page-heading"><h1>المهام</h1></div>
      <section className="editor" aria-labelledby="task-form-heading">
        <h2 id="task-form-heading">{editingId ? 'تعديل المهمة' : 'إضافة مهمة'}</h2>
        <form onSubmit={submitTask} noValidate>
          <div className="form-grid">
            <label className="field span-two">اسم المهمة
              <input id="task-name" name="name" className="form-control" value={taskFields.name} onChange={setField}
                maxLength={maxNameLength} placeholder="مثال: تجهيز أسئلة الحصة" required />
            </label>
            <label className="field">المدة بالدقائق
              <input name="duration" type="number" inputMode="numeric" className="form-control" value={taskFields.duration}
                onChange={setField} min="1" max={maxDuration} required />
            </label>
            <label className="field">الأولوية
              <select name="priority" className="form-select" value={taskFields.priority} onChange={setField}>
                <option value="3">عالية</option><option value="2">متوسطة</option><option value="1">قليلة</option>
              </select>
            </label>
            <label className="field">موعد التسليم <span className="optional">(اختياري)</span>
              <input name="deadline" type="date" className="form-control" value={taskFields.deadline} onChange={setField}
                min="2000-01-01" max="2100-12-31" />
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="actions">
            <button type="submit" className="btn btn-primary">{editingId ? 'حفظ التعديل' : 'إضافة المهمة'}</button>
            {editingId && <button type="button" className="btn btn-outline-light" onClick={resetForm}>رجوع</button>}
          </div>
        </form>
      </section>

      <section className="list-section" aria-labelledby="task-list-heading">
        <div className="section-heading"><h2 id="task-list-heading">مهامك</h2></div>
        {orderedTasks.length > 0 ? (
          <ul className="list-unstyled entry-list">
            {orderedTasks.map(task => (
              <li className="entry-row" key={task.id}>
                <div className="row-main">
                  <bdi className={task.done ? 'entry-name is-done' : 'entry-name'}>{task.name}</bdi>
                  <span className="row-details">
                    {formatMinutes(task.duration)} · أولوية {priorities[task.priority]}
                    {task.deadline && <> · التسليم {formatDayKey(task.deadline)}</>}
                  </span>
                </div>
                <div className="row-actions">
                  <button type="button" className="btn btn-outline-light btn-sm" onClick={() => toggleTask(task.id)}>
                    {task.done ? 'إعادة فتح' : 'خلصتها'}
                  </button>
                  <button type="button" className="btn btn-text btn-sm" onClick={() => editTask(task)}>تعديل</button>
                  <button type="button" className="btn btn-danger-text btn-sm" onClick={async () => {
                    if (window.confirm('تحب تمسح المهمة دي؟') && await deleteTask(task.id) && editingId === task.id) resetForm()
                  }}>حذف</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="empty-list">لسه مفيش مهام. ضيف أول مهمة من فوق.</p>}
      </section>
    </>
  )
}
