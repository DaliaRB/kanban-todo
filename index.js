//*****************
// -- VARIABLES --
//*****************
const STORAGE_KEY = 'My_Kanban_tasks_V1'  // clé du localStorage
let tasks = []
let editingId = null  // null = création, sinon id de la tâche modifiée

//*****************
// -- DOM --
//*****************
const taskForm   = document.querySelector('#taskForm')
const formTitle  = document.querySelector('#formTitle')
const titleInput = document.querySelector('#titleInput')
const descInput  = document.querySelector('#descInput')
const priorInput = document.querySelector('#priorityInput')
const dueInput   = document.querySelector('#dueInput')
const submitBtn  = document.querySelector('#submitBtn')
const cancelBtn  = document.querySelector('#cancelBtn')
const formError  = document.querySelector('#formError')

const searchInput = document.querySelector('#searchInput')
const priorFilter = document.querySelector('#priorityFilter')
const sortSelect  = document.querySelector('#sortSelect')

const colTodo  = document.querySelector('#colTodo')
const colDoing = document.querySelector('#colDoing')
const colDone  = document.querySelector('#colDone')

const countTodo  = document.querySelector('#countTodo')
const countDoing = document.querySelector('#countDoing')
const countDone  = document.querySelector('#countDone')

const emptyTodo  = document.querySelector('#emptyTodo')
const emptyDoing = document.querySelector('#emptyDoing')
const emptyDone  = document.querySelector('#emptyDone')

//*****************
// -- FUNCTIONS --
//*****************

// id unique : crypto si le navigateur l'a, sinon date + nombre au hasard
// ?. = pas d'erreur si ça existe pas / ?? = valeur de secours
function uid() {
    return (crypto?.randomUUID?.() ?? ('id_' + Date.now() + '_' + Math.random().toString(16).slice(2)))
}

// affiche le message d'erreur (ou l'efface si msg est vide)
function showError(msg) {
    if (!msg) {
        formError.textContent = ''
        return
    }
    formError.textContent = msg
}

// texte affiché pour la priorité
function priorityLabel(priority) {
    if (priority === 'low') return '🟢 Low'
    if (priority === 'medium') return '🟡 Moyen'
    if (priority === 'high') return '🔴 High'
    return ''
}

// texte affiché pour la date (Aucune si vide)
function formatDate(date) {
    if (!date) return 'Aucune'
    return date
}

// remet le formulaire en mode création
function resetForm() {
    editingId = null
    taskForm.reset()
    formTitle.textContent = 'Créer une tâche'
    submitBtn.textContent = '+ Add task'
    cancelBtn.classList.add('hidden')
    showError('')
    titleInput.focus()
}

// minuscules + sans espaces -> la recherche marche avec Pear ou pear
function normalize(str) {
    return (str ?? '').toString().trim().toLowerCase()
}

//*****************
// -- FILTER AND SORT --
//*****************

// renvoie les tâches à afficher : recherche, filtre, puis tri
// [...tasks] = copie du tableau -> on touche pas aux vraies données
function getVisibleTasks() {
    const searchRequest = normalize(searchInput.value)
    const priorityValue = normalize(priorFilter.value)
    const selectedSort = sortSelect.value

    let filtered = [...tasks]

    if (searchRequest) {
        filtered = filtered.filter(t => {
            const cont = normalize(`${t.title} ${t.description}`)
            return cont.includes(searchRequest)
        })
    }

    if (priorityValue !== 'all') {
        filtered = filtered.filter(t => t.priority === priorityValue)
    }

    filtered.sort((a, b) => {
        if (selectedSort === 'createdDesc') return b.createAt - a.createAt  // récentes en premier
        if (selectedSort === 'createdAsc')  return a.createAt - b.createAt

        const aDue = a.dueDate ? Date.parse(a.dueDate) : null  // date en ms, ou null si pas de date
        const bDue = b.dueDate ? Date.parse(b.dueDate) : null

        if (selectedSort === 'dueAsc') {
            if (aDue === null && bDue === null) return 0
            if (aDue === null) return 1  // sans date -> à la fin
            if (bDue === null) return -1
            return aDue - bDue
        }
        if (selectedSort === 'dueDesc') {
            if (aDue === null && bDue === null) return 0
            if (aDue === null) return 1
            if (bDue === null) return -1
            return bDue - aDue
        }
        return 0
    })

    return filtered
}

//*****************
// -- TASKS --
//*****************
function addTask(title, description, priority, dueDate) {
    const task = {
        id: uid(),
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || '',
        status: 'todo',
        createAt: Date.now()
    }
    tasks.push(task)
    save()
    render()
}

function updateTask(taskId, updates) {
    const t = tasks.find(t => t.id === taskId)
    if (!t) return
    t.title = updates.title.trim()
    t.description = updates.description.trim()
    t.dueDate = updates.dueDate
    t.priority = updates.priority
    editingId = null
    showError('')
    save()
    render()
}

//*****************
// -- LOCALSTORAGE --
//*****************

// localStorage garde que du texte -> JSON.stringify pour enregistrer
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

// au démarrage : JSON.parse pour retrouver le tableau, sinon tableau vide
function load() {
    const saved = localStorage.getItem(STORAGE_KEY)
    tasks = saved ? JSON.parse(saved) : []
}

//*****************
// -- RENDER --
//*****************
function clearColumns() {
    colTodo.innerHTML = ''
    colDoing.innerHTML = ''
    colDone.innerHTML = ''
}

// render = vide les colonnes et réaffiche tout
// on change les données -> save() -> render(), jamais l'affichage à la main
function render() {
    const visible = getVisibleTasks()

    clearColumns()
    let todoCount = 0, doingCount = 0, doneCount = 0

    for (const task of visible) {
        const taskEl = renderTaskCard(task)

        if (task.status === 'todo') {
            colTodo.appendChild(taskEl)
            todoCount++
        } else if (task.status === 'doing') {
            colDoing.appendChild(taskEl)
            doingCount++
        } else {
            colDone.appendChild(taskEl)
            doneCount++
        }
    }

    countTodo.textContent = todoCount.toString()
    countDoing.textContent = doingCount.toString()
    countDone.textContent = doneCount.toString()

    toggleEmpty(emptyTodo, todoCount === 0)
    toggleEmpty(emptyDoing, doingCount === 0)
    toggleEmpty(emptyDone, doneCount === 0)
}

// affiche "Aucune tâche" si la colonne est vide (classe hidden)
function toggleEmpty(nodeName, isEmpty) {
    if (isEmpty) nodeName.classList.remove('hidden')
    else nodeName.classList.add('hidden')
}

// crée la carte d'une tâche
// textContent et pas innerHTML -> un texte tapé ne devient jamais du code (faille XSS)
function renderTaskCard(task) {
    const card = document.createElement('article')
    card.className = task.status === 'done' ? 'task-card done-card' : 'task-card'

    const h3 = document.createElement('h3')  // h3 car les colonnes sont en h2
    h3.className = 'task-title'
    h3.textContent = task.title

    const p = document.createElement('p')
    p.className = 'task-desc'
    p.textContent = task.description ? task.description : 'Aucune description'

    card.appendChild(h3)
    card.appendChild(p)

    const meta = document.createElement('div')
    meta.className = 'task-meta'

    const pr = document.createElement('span')
    pr.textContent = priorityLabel(task.priority)

    const due = document.createElement('span')
    due.textContent = `📅 ${formatDate(task.dueDate)}`

    meta.appendChild(pr)
    meta.appendChild(due)
    card.appendChild(meta)

    const actions = document.createElement('div')
    actions.className = 'task-btns'

    if (task.status === 'todo') {
        actions.appendChild(makeBtn('→ In Progress', () => moveStatus(task.id, 'doing'), 'btn-statut'))
    } else if (task.status === 'doing') {
        actions.appendChild(makeBtn('↩ To Do', () => moveStatus(task.id, 'todo'), 'btn-todo'))
        actions.appendChild(makeBtn('→ Done', () => moveStatus(task.id, 'done'), 'btn-statut'))
    } else {
        actions.appendChild(makeBtn('↩ In Progress', () => moveStatus(task.id, 'doing'), 'btn-inpro'))
    }

    actions.appendChild(makeBtn('✏️', () => onEdit(task.id), 'btn-edit'))
    actions.appendChild(makeBtn('🗑️', () => onDelete(task.id), 'btn-del'))

    card.appendChild(actions)
    return card
}

// crée un bouton + son event click (variant = classe css en plus)
function makeBtn(label, onClick, variant) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = label
    if (variant) btn.classList.add(variant)
    btn.addEventListener('click', onClick)
    return btn
}

//*****************
// -- ACTIONS --
//*****************
function moveStatus(taskId, newStatus) {
    const t = tasks.find(t => t.id === taskId)
    if (!t) return
    t.status = newStatus
    save()
    render()
}

function onEdit(taskId) {
    const t = tasks.find(t => t.id === taskId)
    if (!t) return
    setEditMode(t)
}

// confirm = boîte OK / Annuler avant de supprimer
function onDelete(taskId) {
    const t = tasks.find(t => t.id === taskId)
    if (!t) return
    const ok = confirm(`Supprimer la tâche « ${t.title} » ?`)
    if (!ok) return

    tasks = tasks.filter(t => t.id !== taskId)  // on garde tout sauf celle-là

    if (editingId === taskId) resetForm()
    save()
    render()
}

// mode modification : on remplit le formulaire avec la tâche
function setEditMode(task) {
    editingId = task.id
    formTitle.textContent = 'Modifier la tâche'
    submitBtn.textContent = 'Enregistrer'
    cancelBtn.classList.remove('hidden')
    titleInput.value = task.title
    descInput.value = task.description
    priorInput.value = task.priority
    dueInput.value = task.dueDate ?? ''
    showError('')
    titleInput.focus()
}

//*****************
// -- EVENT --
//*****************
taskForm.addEventListener('submit', (e) => {
    e.preventDefault()  // sinon la page se recharge

    const title = titleInput.value
    const description = descInput.value
    const priority = priorInput.value
    const dueDate = dueInput.value

    if (!title || title.trim().length < 3) {
        showError('Le titre est obligatoire (minimum 3 caractères).')
        titleInput.focus()
        return
    }
    if (dueDate && Date.parse(dueDate) < Date.now() - 86400000) {  // 86400000 ms = 24h -> aujourd'hui est accepté
        showError('Choisir une date future.')
        dueInput.focus()
        return
    }
    if (description.length > 200) {
        showError('La description ne doit pas dépasser 200 caractères.')
        descInput.focus()
        return
    }
    showError('')

    if (editingId) {
        updateTask(editingId, { title, description, priority, dueDate })
        resetForm()
    } else {
        addTask(title, description, priority, dueDate)
        taskForm.reset()
        titleInput.focus()
    }
})

cancelBtn.addEventListener('click', resetForm)

searchInput.addEventListener('input', () => render())
priorFilter.addEventListener('input', () => render())
sortSelect.addEventListener('change', () => render())

//*****************
// -- INIT APP --
//*****************
function init() {
    load()
    render()
    resetForm()
}

init()
