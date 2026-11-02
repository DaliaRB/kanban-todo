// tests de la to-do avec jest + jsdom (un faux navigateur)
// pour lancer : npm test

const fs = require('fs')
const path = require('path')

// on récupère le body de index.html pour avoir la même page que dans le navigateur
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/, '')

// avant chaque test : page vide, localStorage vide, on recharge index.js
beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = body
    window.confirm = () => true   // jsdom n'a pas de confirm, on répond toujours OK
    jest.isolateModules(() => require('../index.js'))
})

// petites fonctions pour aller plus vite
function addTask(title, description = '', priority = 'low', dueDate = '') {
    document.querySelector('#titleInput').value = title
    document.querySelector('#descInput').value = description
    document.querySelector('#priorityInput').value = priority
    document.querySelector('#dueInput').value = dueDate
    document.querySelector('#taskForm').dispatchEvent(new Event('submit', { cancelable: true }))
}
const titles = (col) => [...document.querySelectorAll(`#${col} .task-title`)].map(t => t.textContent)
const error = () => document.querySelector('#formError').textContent

// ---------- ajout et vérifications
test('ajouter une tâche la met dans To do', () => {
    addTask('Réviser le SQL', 'JOIN et GROUP BY')
    expect(titles('colTodo')).toEqual(['Réviser le SQL'])
    expect(document.querySelector('#countTodo').textContent).toBe('1')
})

test('titre trop court -> message d\'erreur et pas de tâche', () => {
    addTask('ab')
    expect(error()).toContain('3 caractères')
    expect(titles('colTodo')).toEqual([])
})

test('description de plus de 200 caractères -> refusée', () => {
    addTask('Titre ok', 'x'.repeat(201))
    expect(error()).toContain('200 caractères')
    expect(titles('colTodo')).toEqual([])
})

test('sans priorité -> refusée', () => {
    addTask('Faire les courses', '', '')
    expect(error()).toBe('Choisir une priorité.')
    expect(titles('colTodo')).toEqual([])
})

test('date passée -> refusée', () => {
    addTask('Tâche datée', '', 'low', '2020-01-01')
    expect(error()).toBe('Choisir une date future.')
})

// ---------- sécurité
test('XSS : une balise tapée reste du texte', () => {
    addTask('<img src=x onerror="alert(1)">')
    expect(titles('colTodo')).toEqual(['<img src=x onerror="alert(1)">'])
    expect(document.querySelector('.task-card img')).toBeNull()   // aucune vraie image créée
})

// ---------- localStorage
test('les tâches sont enregistrées dans le localStorage', () => {
    addTask('Faire les courses')
    const saved = JSON.parse(localStorage.getItem('My_Kanban_tasks_V1'))
    expect(saved[0].title).toBe('Faire les courses')
    expect(saved[0].status).toBe('todo')
})

// ---------- statut, suppression
test('le bouton avancer passe la tâche en In Progress', () => {
    addTask('Ranger mon bureau')
    document.querySelector('#colTodo .btn-statut').click()
    expect(titles('colTodo')).toEqual([])
    expect(titles('colDoing')).toEqual(['Ranger mon bureau'])
})

test('supprimer une tâche (avec confirmation)', () => {
    addTask('À supprimer')
    document.querySelector('#colTodo .btn-del').click()
    expect(titles('colTodo')).toEqual([])
    expect(document.querySelector('#emptyTodo').classList.contains('hidden')).toBe(false)
})

test('modifier une tâche avec le même formulaire', () => {
    addTask('Ancien titre')
    document.querySelector('#colTodo .btn-edit').click()
    expect(document.querySelector('#formTitle').textContent).toBe('Modifier la tâche')
    document.querySelector('#titleInput').value = 'Nouveau titre'
    document.querySelector('#taskForm').dispatchEvent(new Event('submit', { cancelable: true }))
    expect(titles('colTodo')).toEqual(['Nouveau titre'])
})

// ---------- recherche, filtre, tri
test('recherche : « pear » ne garde que la bonne tâche (majuscules ignorées)', () => {
    addTask('English Pear')
    addTask('Wood Sage')
    const search = document.querySelector('#searchInput')
    search.value = 'pear'
    search.dispatchEvent(new Event('input'))
    expect(titles('colTodo')).toEqual(['English Pear'])
})

test('recherche dans la description aussi', () => {
    addTask('Courses', 'acheter du lait')
    addTask('Sport')
    const search = document.querySelector('#searchInput')
    search.value = 'LAIT'
    search.dispatchEvent(new Event('input'))
    expect(titles('colTodo')).toEqual(['Courses'])
})

test('filtre par priorité', () => {
    addTask('Urgent', '', 'high')
    addTask('Pas urgent', '', 'low')
    const filter = document.querySelector('#priorityFilter')
    filter.value = 'high'
    filter.dispatchEvent(new Event('input'))
    expect(titles('colTodo')).toEqual(['Urgent'])
})

test('tri par date limite : la plus proche en premier, sans date à la fin', () => {
    addTask('Sans date')
    addTask('Mai', '', 'low', '2030-05-01')
    addTask('Janvier', '', 'low', '2030-01-01')
    const sort = document.querySelector('#sortSelect')
    sort.value = 'dueAsc'
    sort.dispatchEvent(new Event('change'))
    expect(titles('colTodo')).toEqual(['Janvier', 'Mai', 'Sans date'])
})

// ---------- localStorage au démarrage
test('les tâches reviennent après un rechargement de la page (load)', () => {
    addTask('Tâche gardée')
    // on "recharge" : nouvelle page, même localStorage
    document.body.innerHTML = body
    jest.isolateModules(() => require('../index.js'))
    expect(titles('colTodo')).toEqual(['Tâche gardée'])
})

// ---------- les autres tris
test('tri récentes / anciennes', () => {
    const now = jest.spyOn(Date, 'now')
    now.mockReturnValue(1000); addTask('Première')
    now.mockReturnValue(2000); addTask('Deuxième')
    now.mockRestore()
    const sort = document.querySelector('#sortSelect')
    sort.value = 'createdDesc'; sort.dispatchEvent(new Event('change'))
    expect(titles('colTodo')).toEqual(['Deuxième', 'Première'])
    sort.value = 'createdAsc'; sort.dispatchEvent(new Event('change'))
    expect(titles('colTodo')).toEqual(['Première', 'Deuxième'])
})

test('tri par date limite décroissante', () => {
    addTask('Janvier', '', 'low', '2030-01-01')
    addTask('Mai', '', 'low', '2030-05-01')
    const sort = document.querySelector('#sortSelect')
    sort.value = 'dueDesc'; sort.dispatchEvent(new Event('change'))
    expect(titles('colTodo')).toEqual(['Mai', 'Janvier'])
})

// ---------- boutons retour, annuler, confirmation
test('les boutons retour : Done -> In Progress -> To do', () => {
    addTask('Aller-retour')
    document.querySelector('#colTodo .btn-statut').click()     // -> In Progress
    document.querySelector('#colDoing .btn-statut').click()    // -> Done
    expect(titles('colDone')).toEqual(['Aller-retour'])
    document.querySelector('#colDone .btn-inpro').click()      // ↩ In Progress
    expect(titles('colDoing')).toEqual(['Aller-retour'])
    document.querySelector('#colDoing .btn-todo').click()      // ↩ To Do
    expect(titles('colTodo')).toEqual(['Aller-retour'])
})

test('Annuler remet le formulaire en mode création', () => {
    addTask('Une tâche')
    document.querySelector('#colTodo .btn-edit').click()
    document.querySelector('#cancelBtn').click()
    expect(document.querySelector('#formTitle').textContent).toBe('Créer une tâche')
    expect(document.querySelector('#cancelBtn').classList.contains('hidden')).toBe(true)
    expect(document.querySelector('#titleInput').value).toBe('')
})

test('si on répond Annuler à la confirmation, la tâche reste', () => {
    addTask('À garder')
    window.confirm = () => false
    document.querySelector('#colTodo .btn-del').click()
    expect(titles('colTodo')).toEqual(['À garder'])
})

test('compteurs et message « Aucune tâche »', () => {
    expect(document.querySelector('#emptyTodo').classList.contains('hidden')).toBe(false)
    addTask('Une')
    addTask('Deux')
    expect(document.querySelector('#countTodo').textContent).toBe('2')
    expect(document.querySelector('#emptyTodo').classList.contains('hidden')).toBe(true)
    expect(document.querySelector('#emptyDoing').classList.contains('hidden')).toBe(false)
})
