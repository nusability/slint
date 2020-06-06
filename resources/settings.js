let rules

window.setTheme = theme => {
  document.body.classList.add(theme)
}

window.updateRules = rules => {
  window.rules = rules
}

window.init = rules => {
  updateRules(rules)

  let groups = rules.reduce((set, rule) => {
    if (rule.group) {
      if (!set.includes(rule.group)) {
        set.push(rule.group)
      }
    }
    return set;
  }, [])

  listGroups(groups)

  if (groups.length > 0)
    listRules(groups[0])

  document.querySelector('#groups li').classList.add('active')
}

function listGroups(groups) {
  document.getElementById('groups').innerHTML = groups.reduce((acc, cur) => acc + `<li data-group-name="${cur}">${cur}</li>`, '')

  document.querySelectorAll('#groups li').forEach(group => group.addEventListener('click', (e) => {
    e.preventDefault()
    document.querySelectorAll('#groups li').forEach(group => group.classList.remove('active'))
    e.target.classList.add('active')
    listRules(group.getAttribute('data-group-name'))
    return false
  }))
}

function listRules(group) {
  document.getElementById('rules').innerHTML = window.rules
    .filter(rule => rule.group == group)
    .reduce((acc, cur, index) => acc + `<li><input id="rule-${index}" name="rule-name" type="checkbox" data-rule-name="${cur.name}" ${cur.active ? 'checked' : ''}>
      <label for="rule-${index}">${cur.name}<br>${cur.explanation}</label>
    </li>`, '')

  document.querySelectorAll('input[id^=rule-]').forEach(i => i.addEventListener('change', () => {
    window.postMessage('toggleRule', { name: i.getAttribute('data-rule-name'), active: i.checked })
  }))
}