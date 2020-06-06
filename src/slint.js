import BrowserWindow from 'sketch-module-web-view'
import { getWebview } from 'sketch-module-web-view/remote'
import sketch from 'sketch'
import dom from 'sketch'
import UI from 'sketch/ui'
import rules from './rules.js'
var Settings = require('sketch/settings')
/* 
import rp from './RulesProvider.js'
let rules = new rp.getRules()
let rules = new rp.getRules({
  active: true,
  ignored: true,
  group: 'Symbols'
})

import wm from './WindowManager.js'
wm.open(wm.ISSUES)
wm.open(wm.SETTINGS)
wm.getWebContent(wm.ISSUES).on('bla', e => { e })
wm.getWindow(wm.ISSUES).loadURL('bla') */

const slintIssuesWebView = 'slintIssues.webview'
const slintSettingsWebView = 'slintSettings.webview'

let document = dom.getSelectedDocument()

let issues = Settings.documentSettingForKey(document, 'issues') || []

let ignore = Settings.documentSettingForKey(document, 'ignore') || []

let activeRules = Settings.settingForKey('activeRules')
if (!activeRules) {
  activeRules = rules.map(r => ({ 'name': r.name, 'active': true }))
}
rules.forEach(rule => {
  let activeRule = activeRules.find(ar => ar.name == rule.name)
  let value = activeRule === undefined ? true : activeRule.active
  rule.active = value
})

console.log('activeRules', activeRules)

console.log(`issues: ${issues.length}; ignore: ${ignore.length}; rules: ${rules.length}`)

export default function () {
  const issuesWindowOptions = {
    identifier: slintIssuesWebView,
    width: 1000,
    height: 180,
    x: 100,
    y: 1600,
    fullscreenable: false,
    acceptsFirstMouse: true,
    titleBarStyle: 'hidden',
    remembersWindowFrame: true,
    hidesOnDeactivate: false,
    title: `Slint`,
    show: false
  }

  const slintIssuesWindow = new BrowserWindow(issuesWindowOptions)

  const settingsWindowOptions = {
    identifier: slintSettingsWebView,
    width: 600,
    height: 500,
    x: 500,
    y: 500,
    fullscreenable: false,
    acceptsFirstMouse: false,
    titleBarStyle: 'hidden',
    remembersWindowFrame: true,
    hidesOnDeactivate: false,
    title: `Slint Settings`,
    show: false
  }

  const slintSettingsWindow = new BrowserWindow(settingsWindowOptions)
  const slintSettingsWebContent = slintSettingsWindow.webContents

  // only show the window when the page has loaded to avoid a white flash
  slintIssuesWindow.once('ready-to-show', () => {
    slintIssuesWindow.show()
  })

  const slintIssuesWebContent = slintIssuesWindow.webContents

  // print a message when the page loads
  slintIssuesWebContent.on('did-finish-load', () => {

    slintIssuesWebContent
      .executeJavaScript(`setTheme('${UI.getTheme()}')`)
      .catch(console.error)

    lintDocument()
    listIssues()
  })

  // add a handler for a call from web content's javascript
  slintIssuesWebContent.on('lint', () => {
    lintDocument()
  })

  slintIssuesWebContent.on('settings', () => {

    // only show the window when the page has loaded to avoid a white flash
    slintSettingsWindow.once('ready-to-show', () => {
      slintSettingsWindow.show()
    })

    slintSettingsWindow.loadURL(require('../resources/settings.html'))
  })

  // print a message when the page loads
  slintSettingsWebContent.on('did-finish-load', () => {
    slintSettingsWebContent
      .executeJavaScript(`setTheme('${UI.getTheme()}')`)
      .catch(console.error)

    slintSettingsWebContent
      .executeJavaScript(`init(${JSON.stringify(rules)})`)
      .catch(console.error)
  })

  slintSettingsWebContent.on('toggleRule', rule => {
    rules.find(r => r.name == rule.name).active = rule.active
    activeRules.find(r => r.name == rule.name).active = rule.active
    Settings.setSettingForKey('activeRules', activeRules)

    slintSettingsWebContent
      .executeJavaScript(`updateRules(${JSON.stringify(rules)})`)
      .catch(console.error)
  })

  slintIssuesWebContent.on('select', id => {
    document.selectedLayers.clear()
    let layer = document.getLayerWithID(id)
    let page = layer.getParentPage()
    page.selected = true
    layer.selected = true
    document.centerOnLayer(layer)
  })

  slintIssuesWebContent.on('fix', id => {
    let node = document.getLayerWithID(id.nodeId)
    let rule = rules.find(rule => rule.name == id.ruleName)

    if (id.type == 'all') {
      issues.forEach(issue => {
        if (issue.rule.name == rule.name) {
          let n = document.getLayerWithID(issue.node.id)
          rule.fix(n)
          issues = issues.filter(issue => !(issue.rule.name == rule.name && issue.node.id == n.id))
        }
      })
    } else {
      rule.fix(node)
      issues = issues.filter(issue => !(issue.rule.name == rule.name && issue.node.id == node.id))
    }

    listIssues()
  })

  slintIssuesWebContent.on('ignore', id => {
    //console.log('before filter', issues)
    let node = document.getLayerWithID(id.nodeId)
    let rule = rules.find(rule => rule.name == id.ruleName)

    if (!node || !rule) return

    ignore.push({ node: (id.type == 'node') ? node : null, rule: rule })
    Settings.setDocumentSettingForKey(document, 'ignore', ignore)

    listIssues()
  })

  slintIssuesWebContent.on('resetIgnore', () => {
    ignore = []
    Settings.setDocumentSettingForKey(document, 'ignore', ignore)
    listIssues()
  })

  slintIssuesWindow.loadURL(require('../resources/issues.html'))
}

// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(slintIssuesWebView)
  if (existingWebview) {
    existingWebview.close()
  }
}

let pathCache = new Map()

function path(node) {
  const cached = pathCache.get(node.id)
  if (cached) return cached

  let nodes = [{
    id: node.id,
    name: node.name,
    index: node.parent && node.parent.name ? node.index : document.pages.reduce((acc, cur, index, src) => cur.id == node.id ? src.length - index : acc, null)
  }]
  if (node.parent && node.parent.name) {
    nodes = [path(node.parent), ...nodes]
  }

  let nodesFlat = nodes.flat(Infinity)
  pathCache.set(node.id, nodesFlat)
  return nodesFlat
}

let lintJobs = []
let nChecksAll = 0

function lintDocument() {
  issues = []

  // should be done with a nested loop for readability
  let ruleTypes = rules.filter(rule => rule.active).reduce((set, rule) => {
    if (rule.types) {
      for (let i = 0; i < rule.types.length; ++i) {
        if (!set.includes(rule.types[i])) {
          set.push(rule.types[i])
        }
      }
    }
    return set;
  }, ['*'])

  ruleTypes.forEach(type => {
    let filteredRules = type == '*' ? rules.filter(rule => !rule.types) : rules.filter(rule => rule.types?.includes(type))
    let nodes = sketch.find(type)

    if (rules.length > 0 && nodes.length > 0) {
      lintJobs.push({
        'type': type,
        'rules': filteredRules,
        'nodes': nodes
      })
    }
  })

  nChecksAll = lintJobs.reduce((acc, cur) => acc + cur.nodes.length * cur.rules.length, 0)

  console.time('lintDocument()')

  lintType()
}

function lintType() {

  let type = lintJobs[0]?.type

  let nodes = lintJobs[0]?.nodes
  let nNodes = nodes.length
  let rules = lintJobs[0]?.rules

  let timeKey = `Linting ${nodes.length} ${type} layers with ${rules.length} rules (${nodes.length * rules.length} checks)`
  console.time(timeKey)

  !function lint() {
    if (rules.length > 0) {
      for (let i = 0; i < nodes.length; ++i) {
        if (rules[0].test(nodes[i])) {
          addIssue(nodes[i], rules[0])
        }
      }
      rules.shift()
      showProgress(lintJobs.reduce((acc, cur) => acc + cur.nodes.length * cur.rules.length, 0), nChecksAll)
      setTimeout(lint, 0)
    } else {
      Settings.setDocumentSettingForKey(document, 'issues', issues)
      listIssues()
      lintJobs.shift()
      if (lintJobs.length > 0) {
        console.timeEnd(timeKey)
        lintType()
      } else {
        console.timeEnd('lintDocument()')
      }
    }
  }()
}

function addIssue(node, rule) {
  // Don't add the issue if it is already in the list
  if (issues.some(issue => issue.node.id == node.id && issue.rule.name == rule.name)) {
    return
  }

  issues.push({
    node: {
      id: node.id,
      name: node.name
    },
    rule: {
      name: rule.name,
      explanation: rule.explanation,
      fixText: rule.fixText ? rule.fixText(node) : undefined,
      fixAll: rule.fixAll
    },
    path: path(node)
  })
}

let lintNodeCache = new Set()

function lintNode(node, recursive) {
  if (lintNodeCache.has(node)) {
    return
  }

  issues = issues.filter(issue => issue.node.id != node.id)

  for (let i = 0; i < rules.length; ++i) {
    if (rules[i].types && rules[i].types.includes(node.type)
      && rules[i].test(node)) {
      addIssue(node, rules[i])
    }
  }

  lintNodeCache.add(node)

  if (recursive > 0 && node.type != 'Page') {
    let parent
    try {
      parent = node.parent
      lintNode(parent, --recursive)
    } catch (error) {
    }
  } else {
    Settings.setDocumentSettingForKey(document, 'issues', issues)
  }
}

export function showProgress(remaining, nodes) {
  const slintIssuesWebContent = getWebview(slintIssuesWebView)?.webContents
  if (slintIssuesWebContent)
    slintIssuesWebContent
      .executeJavaScript(`showProgress(${100 - (100 * remaining / nodes)})`)
      .catch(console.error)
}

export function listIssues() {
  const slintIssuesWebContent = getWebview(slintIssuesWebView)?.webContents
  // TODO: break this mess up
  if (slintIssuesWebContent)
    slintIssuesWebContent
      .executeJavaScript(`listIssues(${JSON.stringify(
        issues.filter(issue => {
          let tmp = !ignore.some(i => {
            return (i.node === null || issue.node.id == i.node.id)
              && issue.rule.name == i.rule.name
          })
          return tmp
        })
          .filter(issue => rules.find(rule => rule.name == issue.rule.name).active)
          .sort((a, b) => {
            // Not super elegant but perhaps cooler than trying to sort out which is higher by actually looking at the indicies
            // This method can't sort child layers with more than 1000 siblings!
            let aPath = a.path.reduce((acc, cur) => acc + '_' + String(cur.index).padStart(4, '0'), '')
            let bPath = b.path.reduce((acc, cur) => acc + '_' + String(cur.index).padStart(4, '0'), '')
            return aPath > bPath ? -1 : 1
          })
      )})`)
      .catch(console.error)
}

export function onDocumentChanged(context) {
  let changes = Array.from(context.actionContext)

  !function lint() {
    if (changes.length > 0) {
      let change = changes[0]
      //console.log(changes.map(c => c.object()))
      let node = sketch.fromNative(change.object())

      if (change.type() == 3) {
        //console.log(`Insertion`)
        lintNode(node, 1)
      } else if (change.type() == 2) {
        //console.log(`Removal`)
        issues = issues.filter(issue => issue.node.id != node.id)
        //let parent = eval(`document.${change.fullPath().toString().match(/(.*)\./)[1]}`)
        let parent =
          change
            .fullPath()
            .split('.')
            .slice(0, -1)
            .reduce((acc, cur) => acc[cur.match(/\w+/)[0]][cur.match(/\d+/)[0]], document)

        lintNode(parent, 0)
      } else {
        //console.log(`Property change`)
        lintNode(node, 1)
      }

      changes.shift()

      setTimeout(lint, 0)
    } else {
      listIssues()
    }
  }()
}

export function SelectionChanged(context) {
  if (document == context.actionContext.document) return

  document = context.actionContext.document
  issues = Settings.documentSettingForKey(document, 'issues') || []
  ignore = Settings.documentSettingForKey(document, 'ignore') || []

  listIssues()
}