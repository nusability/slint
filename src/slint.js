import BrowserWindow from 'sketch-module-web-view'
import { getWebview } from 'sketch-module-web-view/remote'
import sketch from 'sketch'
import dom from 'sketch'
import UI from 'sketch/ui'
import rules from './rules.js'
var Settings = require('sketch/settings')

let fiber = require('sketch/async').createFiber()

const webviewIdentifier = 'slint.webview'

let document = dom.getSelectedDocument()

let issues = Settings.documentSettingForKey(document, 'issues') || []

let ignore = Settings.documentSettingForKey(document, 'ignore') || []

console.log(`issues: ${issues.length}; ignore: ${ignore.length}; rules: ${rules.length}`)

export default function () {
  const options = {
    identifier: webviewIdentifier,
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

  const browserWindow = new BrowserWindow(options)

  // only show the window when the page has loaded to avoid a white flash
  browserWindow.once('ready-to-show', () => {
    browserWindow.show()
  })

  const webContents = browserWindow.webContents

  // print a message when the page loads
  webContents.on('did-finish-load', () => {

    webContents
      .executeJavaScript(`setTheme('${UI.getTheme()}')`)
      .catch(console.error)

    lintDocument()
    listIssues()
  })

  // add a handler for a call from web content's javascript
  webContents.on('lint', () => {
    lintDocument()
  })

  webContents.on('select', id => {
    document.selectedLayers.clear()
    let layer = document.getLayerWithID(id)
    let page = layer.getParentPage()
    page.selected = true
    layer.selected = true
    document.centerOnLayer(layer)
  })

  webContents.on('fix', id => {
    let node = document.getLayerWithID(id.nodeId)
    let rule = rules.find(rule => rule.name == id.ruleName)

    rule.fix(node)

    listIssues()
  })

  webContents.on('ignore', id => {
    //console.log('before filter', issues)
    let node = document.getLayerWithID(id.nodeId)
    let rule = rules.find(rule => rule.name == id.ruleName)

    if (!node || !rule) return

    ignore.push({ node: (id.type == 'node') ? node : null, rule: rule })
    Settings.setDocumentSettingForKey(document, 'ignore', ignore)

    listIssues()
  })

  webContents.on('resetIgnore', () => {
    ignore = []
    Settings.setDocumentSettingForKey(document, 'ignore', ignore)
    listIssues()
  })

  browserWindow.loadURL(require('../resources/webview.html'))
}

// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier)
  if (existingWebview) {
    fiber.cleanup()
    existingWebview.close()
  }
}

function path(node) {
  let nodes = [{ id: node.id, name: node.name }]
  if (node.parent && node.parent.name) {
    nodes.push(path(node.parent))
  }

  return nodes.flat(Infinity)
}

export function lintDocument() {
  issues = []

  let nodes = sketch.find('*')
  let nNodes = nodes.length

  console.time('lint()')

  !function lint() {
    if (nodes.length > 0) {
      for (let i = 0; i < rules.length; ++i) {
        if (rules[i].test(nodes[0])) {
          addIssue(nodes[0], rules[i])
        }
      }
      nodes.shift()

      setTimeout(lint, 0)
      showProgress(nodes.length, nNodes)
    } else {
      console.timeEnd('lint()')
      Settings.setDocumentSettingForKey(document, 'issues', issues)
      listIssues()
    }
  }()

}

function addIssue(node, rule) {
  // Don't add the issue if it is already in the list
  if (issues.some(issue => issue.node.id == node.id && issue.rule.name == rule.name)) {
    return false
  }

  issues.push({
    node: {
      id: node.id,
      name: node.name
    },
    rule: {
      name: rule.name,
      explanation: rule.explanation,
      fixText: rule.fixText ? rule.fixText(node) : undefined
    },
    path: path(node).reverse()
  })

  if (rule.fixText) { console.log(rule.fixText(node)) }
}

let cache = []

function lintNode(node, recursive) {
  if (cache.includes(node)) {
    return
  }

  issues = issues.filter(issue => issue.node.id != node.id)

  for (let i = 0; i < rules.length; ++i) {
    if (rules[i].test(node)) {
      addIssue(node, rules[i])
    }
  }

  if (!cache.includes(node)) {
    cache.push(node)
  }

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
  const webContents = getWebview(webviewIdentifier)?.webContents
  if (webContents)
    webContents
      .executeJavaScript(`showProgress(${100 - (100 * remaining / nodes)})`)
      .catch(console.error)
}

export function listIssues() {
  const webContents = getWebview(webviewIdentifier)?.webContents
  // TODO: break this mess up
  if (webContents)
    webContents
      .executeJavaScript(`listIssues(${JSON.stringify(
        issues.filter(issue => {
          let tmp = !ignore.some(i => {
            return (i.node === null || issue.node.id == i.node.id)
              && issue.rule.name == i.rule.name
          })
          return tmp
        })
      )})`)
      .catch(console.error)
}

export function onDocumentChanged(context) {
  let changes = Array.from(context.actionContext)

  !function lint() {
    if (changes.length > 0) {
      let change = changes[0]
      let node = sketch.fromNative(change.object())

      if (change.type() == 3) {
        //console.log(`Insertion`)
        lintNode(node, 1)
      } else if (change.type() == 2) {
        //console.log(`Removal`)
        issues = issues.filter(issue => issue.node.id != node.id)
        let parent = eval(`document.${change.fullPath().toString().match(/(.*)\./)[1]}`)
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