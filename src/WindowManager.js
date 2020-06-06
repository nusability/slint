export const ISSUES = 'slintIssues.webview'
export const SETTINGS = 'slintSettings.webview'

const options = new Map()
options.set
  (ISSUES, {
    identifier: ISSUES,
    title: `Slint`,
    width: 1000,
    height: 180,
    x: 100,
    y: 1600,
    fullscreenable: false,
    acceptsFirstMouse: true,
    titleBarStyle: 'hidden',
    remembersWindowFrame: true,
    hidesOnDeactivate: false,
    show: false
  })

options.set
  (SETTINGS, {
    identifier: SETTINGS,
    title: `Slint Settings`,
    width: 600,
    height: 500,
    x: 500,
    y: 500,
    fullscreenable: false,
    acceptsFirstMouse: false,
    titleBarStyle: 'hidden',
    remembersWindowFrame: true,
    hidesOnDeactivate: false,
    show: false
  })

class WindowManager {
  windows = []

  open(window) {
    let options = options.get(window)
    this.windows.push(new Window(options))
  }

  getWebContent(window) {
    return this.windows.find(w => w.identifier == window).webContent
  }
}

class Window {
  constructor(options) {

  }

  getContent() {
    return this.webContent
  }

  getWindow() {
    return this.window
  }
}


export default new WindowManager()