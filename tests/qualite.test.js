// qualité de la page : accessibilité (axe) et html valide (html-validate)
// pour lancer : npm test

const fs = require('fs')
const path = require('path')
const { axe, toHaveNoViolations } = require('jest-axe')
const { HtmlValidate } = require('html-validate')

expect.extend(toHaveNoViolations)

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')

test('accessibilité : axe ne trouve aucun problème (avec des tâches affichées)', async () => {
    document.documentElement.innerHTML = new DOMParser().parseFromString(html, 'text/html').documentElement.innerHTML
    document.documentElement.lang = 'fr'
    document.querySelector('script').remove()
    localStorage.clear()
    jest.isolateModules(() => require('../index.js'))
    // une tâche pour tester aussi les cartes et leurs boutons
    document.querySelector('#titleInput').value = 'Réviser l’anglais'
    document.querySelector('#taskForm').dispatchEvent(new Event('submit', { cancelable: true }))
    const results = await axe(document.documentElement, {
        rules: { 'color-contrast': { enabled: false } }   // jsdom ne calcule pas les couleurs : contraste vérifié avec Lighthouse
    })
    expect(results).toHaveNoViolations()
})

test('le html est valide (html-validate)', async () => {
    const validator = new HtmlValidate({ extends: ['html-validate:recommended'] })
    const report = await validator.validateString(html)
    const erreurs = report.results.flatMap(r => r.messages).map(m => `ligne ${m.line} : ${m.message}`)
    expect(erreurs).toEqual([])
})
