// disable the context menu (eg. the right click menu) to have a more native feel
document.addEventListener('contextmenu', (e) => {
  //e.preventDefault()
})


// call the plugin from the webview
document.getElementById('button').addEventListener('click', () => {
  window.postMessage('lint')
})

document.getElementById('resetIgnore').addEventListener('click', () => {
  window.postMessage('resetIgnore')
})

document.getElementById('settings').addEventListener('click', () => {
  window.postMessage('settings')
})

// call the wevbiew from the plugin
window.setRandomNumber = (randomNumber) => {
  document.getElementById('answer').innerHTML = 'Random number from the plugin: ' + randomNumber
}

window.setTheme = (theme) => {
  //ocument.getElementById('status').innerHTML = `Setting theme to ${theme}`
  document.body.classList.add(theme)
}

window.showProgress = (progress) => {
  document.getElementById('status').innerHTML = `<progress id="progress" max="100" value="${progress}">${progress}%</progress>`
}

window.listIssues = (issues) => {
  if (issues.length > 0) {
    document.getElementById('issues').innerHTML = `<div>${issues.length} issues</div><ul>${issues.reduce((str, issue) =>
      str + `<li>${issue.path.reduce((str, node) =>
        str + `<a data-select-id="${node.id}" href="#">${node.name}</a> → `
        , '')}<span title="${issue.rule.explanation}">${issue.rule.name}</span>
          <select name="ignore-rule" data-ignore-node-id="${issue.node.id}" data-ignore-rule-name="${issue.rule.name}">
            <option value="none" selected>Ignore</option>
            <option value="node">Ignore this rule here</option>
            <option value="all">Ignore this rule on all layers</option>
          </select>
          ${issue.rule.fixAll ? `<select name="fix-issue" data-fix-issue-id="${issue.node.id}" data-fix-issue-name="${issue.rule.name}">
            <option value="none" selected>${issue.rule.fixText}</option>
            <option value="node">Apply this fix here</option>
            <option value="all">Apply this fix on all layers</option>
          </select>` : `<a data-fix-node-id="${issue.node.id}" data-fix-rule-name="${issue.rule.name}" href="#">${issue.rule.fixText || ''}</a>`}

        </li>`
      , '')}</ul>`

    document.querySelectorAll('a[data-select-id]').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault()
      window.postMessage('select', a.getAttribute('data-select-id'))
      return false
    }))

    document.querySelectorAll('a[data-fix-node-id]').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault()
      window.postMessage('fix', { nodeId: a.getAttribute('data-fix-node-id'), ruleName: a.getAttribute('data-fix-rule-name') })
      return false
    }))

    document.querySelectorAll('select[name="ignore-rule"]').forEach(select => select.addEventListener('change', e => {
      e.preventDefault()
      window.postMessage('ignore', { nodeId: select.getAttribute('data-ignore-node-id'), ruleName: select.getAttribute('data-ignore-rule-name'), type: event.target.value })
    }))

    document.querySelectorAll('select[name="fix-issue"]').forEach(select => select.addEventListener('change', e => {
      e.preventDefault()
      window.postMessage('fix', { nodeId: select.getAttribute('data-fix-issue-id'), ruleName: select.getAttribute('data-fix-issue-name'), type: event.target.value })
    }))
  } else {
    document.getElementById('issues').innerHTML = `Amazing 😀`
  }
}