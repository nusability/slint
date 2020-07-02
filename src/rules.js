import dom from 'sketch'
var Flow = require('sketch/dom').Flow
var Shape = require('sketch/dom').Shape
var ShapePath = require('sketch/dom').ShapePath
var Style = require('sketch/dom').Style

const rules = [
  {
    'types': ['Page'],
    'group': 'Default Names',
    'name': `Page has a default name`,
    'explanation': `All pages should be named semantically.`,
    'test': node => node.name.match(/^Page \d+$/) != null,
    'fixText': node => dom.getSelectedDocument().sketchObject.fileURL() && !node.isSymbolsPage() ? `Rename to '${dom.getSelectedDocument().sketchObject.fileURL().lastPathComponent().replace('.sketch', '')}'` : undefined,
    'fix': node => node.name = dom.getSelectedDocument().sketchObject.fileURL().lastPathComponent().replace('.sketch', '')
  },
  {
    'types': ['Artboard'],
    'group': 'Default Names',
    'name': `Artboard has a default name`,
    'explanation': `All artboards should be named semantically.`,
    'test': node => node.name == 'Artboard'
  },
  {
    'types': ['ShapePath'],
    'group': 'Default Names',
    'name': `Rectangle has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.shapeType == 'Rectangle' && node.name == 'Rectangle',
    'fixText': node => node.index == 0 ? `Rename to '${node.parent.name} Background'` : undefined,
    'fix': node => node.name = `${node.parent.name} Background`
  },
  {
    'types': ['ShapePath'],
    'group': 'Default Names',
    'name': `Oval has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.shapeType == 'Oval' && node.name == 'Oval'
  },
  {
    'types': ['ShapePath'],
    'group': 'Default Names',
    'name': `Line has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.sketchObject.class() == 'MSShapePathLayer' && node.points.length == 2 && node.name == 'Line'
  },
  {
    'types': ['Image'],
    'group': 'Default Names',
    'name': `Image has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.name == 'Bitmap'
  },
  {
    'types': ['HotSpot'],
    'group': 'Default Names',
    'name': `Hotspot has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.name == 'Hotspot',
    // some bug lurks here:
    'fixText': node => node.flow?.targetId && node.flow?.target?.name ? `Rename to '${node.flow?.targetId == Flow.BackTarget ? 'Back' : node.flow?.target?.name} Hotspot'` : undefined,
    'fix': node => node.name = `${node.flow?.targetId == Flow.BackTarget ? 'Back' : node.flow?.target?.name} Hotspot`
  },
  {
    'types': ['Group'],
    'group': 'Default Names',
    'name': `Group has a default name`,
    'explanation': `All groups should be named semantically.`,
    'test': node => node.name == 'Group'
  },
  {
    'types': ['SymbolInstance'],
    'group': 'Default Names',
    'name': `Symbol instance has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => {
      let document = dom.getSelectedDocument()
      return node.name == document?.getSymbolMasterWithID(node.symbolId).name
    },
    'fixText': node => node.overrides.some(override => !override.isDefault && override.editable && override.property == 'stringValue') ? `Rename to '${node.overrides.find(override => !override.isDefault && override.editable && override.property).value}'` : undefined,
    'fix': node => node.name = node.overrides.find(override => !override.isDefault && override.editable && override.property).value
  },
  {
    'name': `Layer name contains 'Copy'`,
    'group': 'Default Names',
    'explanation': `All layers should be named semantically. You can disable the 'Rename dublicate layers' setting in the preferences.`,
    'test': node => node?.name?.match(/.+Copy(\s\d+)?$/) != null,
    'fixText': node => `Remove`,
    'fix': node => node.name = node.name.replace(/\sCopy(\s\d+)?$/, ''),
    'fixAll': true
  },
  {
    'types': ['ShapePath'],
    'name': `Line found`,
    'group': 'Harmful Features',
    'explanation': `Lines may result in sub-pixel placement which leads to blurry pixels. They also don't adjust well in resizing symbols. They should therefore be avoided and replaced by rectangles.`,
    'test': node => node.sketchObject.class() == 'MSShapePathLayer'
      && node.points.length == 2
      && node.transform.rotation == 0
      && node.style.borders.some(border => border.enabled)
      && (node.points[0].point.x.toFixed(3) == node.points[1].point.x.toFixed(3)
        || node.points[0].point.y.toFixed(3) == node.points[1].point.y.toFixed(3)
      ),
    'fixText': node => `Convert to Rectangle`,
    'fix': node => {
      let firstBorder = node.style.borders.slice().reverse().find(border => border.enabled)
      let rect = new ShapePath({
        frame: node.frame,
        style: {
          borders: [],
          fills: [{
            color: firstBorder.color,
            gradient: firstBorder.gradient,
            fillType: firstBorder.fillType
          }]
        },
        name: node.name,
        parent: node.parent,
        index: node.index
      })

      // Translate line thickness to rectangle size
      let vertical = node.points[0].point.x.toFixed(3) == node.points[1].point.x.toFixed(3)
      let thickness = firstBorder.thickness
      rect.frame[vertical ? 'width' : 'height'] = thickness
      rect.frame[vertical ? 'height' : 'width'] -= 1
      rect.frame[vertical ? 'x' : 'y'] -= thickness / 2 - .5
      rect.frame[vertical ? 'y' : 'x'] += .5

      // Translate line end style to rectangle length 
      let lineEnd = node.style.borderOptions.lineEnd
      if (lineEnd != Style.LineEnd.Butt) {
        rect.frame[vertical ? 'height' : 'width'] += thickness
        rect.frame[vertical ? 'y' : 'x'] -= thickness / 2
      }
      if (lineEnd == Style.LineEnd.Round) {
        for (let i = 0; i < rect.points.length; ++i) {
          rect.points[i].cornerRadius = thickness / 2
        }
      }

      rect.selected = node.selected
      node.remove()
    },
    'fixAll': true
  },
  {
    'types': ['Shape'],
    'group': 'Default Names',
    'name': `Combined shape layer has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.name == 'Combined Shape'
  },
  {
    'types': ['Text'],
    'group': 'Default Names',
    'name': `Text layer has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.name == 'Type something'
  },
  {
    'name': `Layer style is out of sync with shared layer style`,
    'group': 'Styles',
    'explanation': `A layer's style should be managed centrally with a shared layer style and not deviate from it.`,
    'test': node => {
      try {
        if (node.sharedStyleId) {
          return !!node.sharedStyleId && node.style?.isOutOfSyncWithSharedStyle(node.sharedStyle)
        }
      } catch (error) {
      }
    },
    'fixText': node => `Sync`,
    'fix': node => node.style.syncWithSharedStyle(node.sharedStyle),
    'fixAll': true
  },
  {
    'name': `Shape layer does not have a shared layer style`,
    'group': 'Styles',
    'explanation': `A shape's style should be managed centrally with a shared layer style.`,
    'test': node => {
      if ((node.type == 'ShapePath' || node.type == 'Shape')
        && !node.sharedStyleId
        && !node.style.fills.some(fill => fill.fillType == 'Pattern') // if the layer is used for displaying images, you don't want a shared style for each image
        && node.parent?.type != 'Shape'
        && !node._object.hasClippingMask()) {
        return true
      }
    }
  },
  {
    'types': ['Text'],
    'name': `Text layer does not have a shared text style`,
    'group': 'Styles',
    'explanation': `A text's style should be managed centrally with a shared text style.`,
    'test': node => {
      if (!node.sharedStyleId
        && node.parent.type != 'Shape') return true
    }
  },
  {
    'types': ['Text'],
    'name': `Text layer uses fill style`,
    'group': 'Styles',
    'explanation': `A text's color should be managed with a shared text style, not with a fill style.`,
    'test': node => node.style.fills.length > 0,
    'fixText': node => `Remove`,
    'fix': node => node.style.fills = []
  },
  {
    'types': ['ShapePath'],
    'name': `Layer uses a border`,
    'group': 'Harmful Features',
    'explanation': `It is often advisable to use a combined shape of two rectangles, subtracted from one another, instead of layer borders. This avoids having to manage both fill styles and border styles.`,
    'test': node => node.style?.borders.filter(border => border.enabled).length > 0,
    'fixText': node => node.shapeType == 'Rectangle' ? `Convert to Combined Shape` : undefined,
    'fix': node => {
      node.style?.borders.filter(border => border.enabled).forEach(border => {
        try {

          let borderShape = new Shape({
            frame: {
              x: node.frame.x,
              y: node.frame.y,
              width: node.frame.width,
              height: node.frame.height
            },
            name: `${node.name} Border`,
            parent: node.parent,
            index: node.index + 1,
          })
          borderShape.style.fills = [{
            color: border.color,
            gradient: border.gradient,
            fillType: border.fillType
          }]

          let inner = new ShapePath({
            name: 'Inner',
            parent: borderShape,
          })
          inner.sketchObject.booleanOperation = 1
          inner.sketchObject.hasFixedLeft = true
          inner.sketchObject.hasFixedRight = true
          inner.sketchObject.hasFixedTop = true
          inner.sketchObject.hasFixedBottom = true

          let outer = borderShape.layers[0]
          outer.name = 'Outer'

          let radiusCorrection

          if (border.position == Style.BorderPosition.Outside) {
            radiusCorrection = border.thickness
            outer.frame.x -= border.thickness
            outer.frame.y -= border.thickness
            outer.frame.height = node.frame.height + border.thickness * 2
            outer.frame.width = node.frame.width + border.thickness * 2
            inner.frame.height = node.frame.height
            inner.frame.width = node.frame.width
          } else if (border.position == Style.BorderPosition.Inside) {
            radiusCorrection = 0
            inner.frame.x += border.thickness
            inner.frame.y += border.thickness
            inner.frame.height = node.frame.height - border.thickness * 2
            inner.frame.width = node.frame.width - border.thickness * 2
          } else { // Center
            radiusCorrection = border.thickness / 2
            outer.frame.x -= border.thickness / 2
            outer.frame.y -= border.thickness / 2
            outer.frame.height = node.frame.height + border.thickness
            outer.frame.width = node.frame.width + border.thickness
            inner.frame.x += border.thickness / 2
            inner.frame.y += border.thickness / 2
            inner.frame.height = node.frame.height - border.thickness
            inner.frame.width = node.frame.width - border.thickness
          }

          node.points.forEach((point, i) => {
            outer.points[i].cornerRadius = point.cornerRadius + radiusCorrection
            inner.points[i].cornerRadius = outer.points[i].cornerRadius - border.thickness
          })

          borderShape.adjustToFit()
          borderShape.selected = true

        } catch (error) {
          console.log(error)
        }

      })

      node.style.borders = node.style?.borders.filter(border => !border.enabled)
    },
    'fixAll': true
  },
  {
    'name': `Layer has an unused border style`,
    'group': 'Styles',
    'explanation': `An unused border style might as well be removed completely.`,
    'test': node => node.style?.borders.some(border => !border.enabled),
    'fixText': node => `Remove`,
    'fix': node => {
      node.style.borders = node.style.borders.filter(border => border.enabled)
      dom.getSelectedDocument().sketchObject.inspectorController().reload()
    },
    'fixAll': true
  },
  {
    'name': `Layer has an unused fill style`,
    'group': 'Styles',
    'explanation': `An unused fill style might as well be removed completely.`,
    'test': node => node.style?.fills.some(fill => !fill.enabled),
    'fixText': node => `Remove`,
    'fix': node => {
      node.style.fills = node.style.fills.filter(fill => fill.enabled)
      dom.getSelectedDocument().sketchObject.inspectorController().reload()
    },
    'fixAll': true
  },
  {
    'name': `Layer has an unused shadow style`,
    'group': 'Styles',
    'explanation': `An unused shadow style might as well be removed completely.`,
    'test': node => node.style?.shadows.some(shadow => !shadow.enabled),
    'fixText': node => `Remove`,
    'fix': node => {
      node.style.shadows = node.style.shadows.filter(shadow => shadow.enabled)
      dom.getSelectedDocument().sketchObject.inspectorController().reload()
    },
    'fixAll': true
  },
  {
    'name': `Layer has an unused inner shadow style`,
    'group': 'Styles',
    'explanation': `An unused inner shadow style might as well be removed completely.`,
    'test': node => node.style?.innerShadows.some(shadow => !shadow.enabled),
    'fixText': node => `Remove`,
    'fix': node => {
      node.style.innerShadows = node.style.innerShadows.filter(innerShadow => innerShadow.enabled)
      dom.getSelectedDocument().sketchObject.inspectorController().reload()
    },
    'fixAll': true
  },
  {
    'types': ['SymbolMaster'],
    'group': 'Symbols',
    'name': `Symbol uses a background`,
    'explanation': `Symbol background colors should be determined by a background layer.`,
    'test': node => node.background.enabled && node.background.includedInInstance,
    'fixText': node => `Disable for Instances`,
    'fix': node => node.background.includedInInstance = false,
    'fixAll': true
  },
  {
    'types': ['Group'],
    'group': 'Miscellaneous',
    'name': `Superfluous group`,
    'explanation': `A group that contains nothing but a group is superfluous and should be removed. If the group uses shadows or resizing constraints, those should be moved to the outer group.`,
    'test': node => node.parent.type == 'Group' && node.parent.layers.length == 1,
    'fixText': node => `Ungroup`,
    'fix': node => node.sketchObject.ungroup(),
    'fixAll': true
  },
  {
    'types': ['Group'],
    'group': 'Miscellaneous',
    'name': `Empty group`,
    'explanation': `A group that contains nothing is superfluous and should be removed.`,
    'test': node => node.layers.length == 0,
    'fixText': node => `Remove`,
    'fix': node => node.remove(),
    'fixAll': true
  },
  {
    'types': ['SymbolMaster'],
    'group': 'Miscellaneous',
    'name': `Unexportable icon`,
    'explanation': `All icon symbols should be set to exportable so that they can be downloaded as assets in Abstract or Zeplin.`,
    'test': node => node.name.match(/\bicon/i) != null && node.exportFormats.length == 0
  },
  {
    'types': ['Image'],
    'group': 'Symbols',
    'name': `Image in symbol`,
    'explanation': `Images in symbols don't retain their aspect ratio when then symbol is resized. This leades to skewed images. Use rectangles with the fill type 'Pattern Fill' and paste the image in there instead.`,
    'test': node => node.getParentArtboard()?.type == 'SymbolMaster'
  },
  {
    'types': ['SymbolMaster'],
    'group': 'Symbols',
    'name': `Master symbol override is not disabled`,
    'explanation': `If you use a master symbol within a set of symbols to create variations of the master symbol, it is advised to disable the override of the master symbol in those variations.`,
    'test': node => {
      if (node.layers.length == 1
        && node.layers[0].type == 'SymbolInstance'
        && node.overrides[0].editable // may be a bit shakey
      ) return true
    }
  },
  {
    'types': ['SymbolInstance'],
    'group': 'Symbols',
    'name': `Text in symbol instance is not overridden`,
    'explanation': `Since symbols are supposed to be reused multiple times, it is advisable to use placeholder text like 'Label' instead of example text that works in only one place.`,
    'test': node =>
      node.getParentArtboard()?.type != 'SymbolMaster' // For nested symbols, this is usually not a problem
      && node.overrides.some(override =>
        override.affectedLayer.type == 'Text'
        && override.property == 'stringValue'
        && override.isDefault
        && override.editable
      )
  },
  {
    'name': `Hidden layer found`,
    'group': 'Miscellaneous',
    'explanation': `Hidden layers are often old stuff that should be removed entirely.`,
    'test': node => node.hidden,
    'fixText': node => `Remove`,
    'fix': node => node.remove(),
    'fixAll': true
  },
  {
    'name': `Layers are not arranged top to bottom and left to right`,
    'group': 'Miscellaneous',
    'explanation': `Layers and artboards should be arranged in such a fashion that the top most layer in the layer list corresponds to the top left layer in the artboard. This is especially important for symbols because the overrides should appear in the symbol instance in a logical order.`,
    'test': node => {
      if (node.layers && node.type != 'Shape' && node.type != 'Page') {
        return node.layers.some((layer, index, layers) => {
          let previous = layers[index - 1]

          if (!previous) return

          let a = layer.frame
          let b = previous.frame

          if (!( // If the following conditions aren't true, the issue should be raised
            a.y < b.y // A is higher than b, …
            || (a.y <= b.y + b.height  // …or it is on the same line but…
              && (a.x < b.x // …either to the left
                || a.x >= b.x && a.x + a.width <= b.x + b.width) // …or enclosed by the previous layer…
              || previous.name.match(/\bbackground\b|\bbg\b|\bborder\b/i) != null) // except when b is a background
          )) {
            return true
          }
        })
      }
    }
  },
  {
    'types': ['SymbolInstance'],
    'group': 'Symbols',
    'name': `Symbol instance on Symbol page`,
    'explanation': `There shouldn't be any instances of symbols on the Symbol page.`,
    'test': node => node.parent.type == 'Page' && node.parent.name == 'Symbols'
  },
  {
    'name': `Free-floating layer on page`,
    'group': 'Miscellaneous',
    'explanation': `All layers should be contained by an artboard.`,
    'test': node => {
      let parent

      try {
        if (node?.type == "Page") return false

        parent = node.parent
        if (node.type != 'SymbolMaster' && node.type != 'Artboard' && node.type != 'Slice' && parent?.type == 'Page')
          return true
      } catch (error) {
        console.log(error)
      }
    }
  },
]

export { rules as default }