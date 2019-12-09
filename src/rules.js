import dom from 'sketch'

const rules = [
  {
    'types': ['Page'],
    'name': `Page has a default name`,
    'explanation': `All pages should be named semantically.`,
    'test': node => node.type == 'Page' && node.name.match(/^Page \d+$/) != null,
    'fixText': node => dom.getSelectedDocument().sketchObject.fileURL() && !node.isSymbolsPage() ? `Rename to '${dom.getSelectedDocument().sketchObject.fileURL().lastPathComponent().replace('.sketch', '')}'` : undefined,
    'fix': node => node.name = dom.getSelectedDocument().sketchObject.fileURL().lastPathComponent().replace('.sketch', '')
  },
  {
    'types': ['Artboard'],
    'name': `Artboard has a default name`,
    'explanation': `All artboards should be named semantically.`,
    'test': node => node.type == 'Artboard' && node.name == 'Artboard'
  },
  {
    'types': ['ShapePath'],
    'name': `Rectangle has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.shapeType == 'Rectangle' && node.name == 'Rectangle',
    'fixText': node => node.index == 0 ? `Rename to '${node.parent.name} Background'` : undefined,
    'fix': node => node.name = `${node.parent.name} Background`
  },
  {
    'types': ['ShapePath'],
    'name': `Oval has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.shapeType == 'Oval' && node.name == 'Oval'
  },
  {
    'types': ['ShapePath'],
    'name': `Line has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.sketchObject.class() == 'MSShapePathLayer' && node.points.length == 2 && node.name == 'Line'
  },
  {
    'types': ['Image'],
    'name': `Image has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.type == 'Image' && node.name == 'Bitmap'
  },
  {
    'types': ['HotSpot'],
    'name': `Hotspot has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.type == 'HotSpot' && node.name == 'Hotspot'
  },
  {
    'types': ['Group'],
    'name': `Group has a default name`,
    'explanation': `All groups should be named semantically.`,
    'test': node => node.type == 'Group' && node.name == 'Group'
  },
  {
    'types': ['SymbolInstance'],
    'name': `Symbol instance has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => {
      let document = dom.getSelectedDocument()
      return node.type == 'SymbolInstance'
        && node.name == document?.getSymbolMasterWithID(node.symbolId).name
    }
  },
  {
    'name': `Layer name contains 'Copy'`,
    'explanation': `All layers should be named semantically. You can disable the 'Rename dublicate layers' setting in the preferences.`,
    'test': node => node?.name?.match(/.+Copy(\s\d+)?$/) != null
  },
  {
    'types': ['ShapePath'],
    'name': `Line found`,
    'explanation': `Lines may result in sub-pixel placement which leads to blurry pixels. They also don't adjust well in resizing symbols. They should therefore be avoided and replaced by rectangles.`,
    'test': node => node.sketchObject.class() == 'MSShapePathLayer' && node.points.length == 2
  },
  {
    'types': ['Shape'],
    'name': `Combined shape layer has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.type == 'Shape' && node.name == 'Combined Shape'
  },
  {
    'types': ['Text'],
    'name': `Text layer has a default name`,
    'explanation': `All layers should be named semantically.`,
    'test': node => node.type == 'Text' && node.name == 'Type something'
  },
  {
    'name': `Layer style is out of sync with shared layer style`,
    'explanation': `A layer's style should be managed centrally with a shared layer style and not deviate from it.'`,
    'test': node => {
      try {
        if (node.sharedStyleId) {
          return !!node.sharedStyleId && node.style?.isOutOfSyncWithSharedStyle(node.sharedStyle)
        }
      } catch (error) {
      }
    },
    fixText: node => `Sync`,
    fix: node => node.style.syncWithSharedStyle(node.sharedStyle)
  },
  {
    'name': `Shape layer does not have a shared layer style`,
    'explanation': `A shape's style should be managed centrally with a shared layer style.`,
    'test': node => {
      /* let parent
      try {
        parent = node.parent
      } catch (error) {

      } */
      if ((node.type == 'ShapePath' || node.type == 'Shape')
        && !node.sharedStyleId
        && !node.style.fills.some(fill => fill.fillType == 'Pattern') // if the layer is used for displaying images, you don't want a shared style for each image
        && node.parent?.type != 'Shape'
        && !node._object.hasClippingMask()) {
        return true
      };
    }
  },
  {
    'types': ['Text'],
    'name': `Text layer does not have a shared text style`,
    'explanation': `A text's style should be managed centrally with a shared text style.`,
    'test': node => {
      if (node.type == 'Text'
        && !node.sharedStyleId
        && node.parent.type != 'Shape') return true;
    }
  },
  {
    'types': ['Text'],
    'name': `Text layer uses fill style`,
    'explanation': `A text's color should be managed with a shared text style, not with a fill style.`,
    'test': node => node.type == 'Text' && node.style.fills.length > 0,
  },
  {
    'name': `Layer uses a border`,
    'explanation': `It is often advisable to use a combined shape of two rectangles, subtracted from one another, instead of layer borders. This avoids having to manage both fill styles and border styles.`,
    'test': node => node.style && node.style.borders.length > 0
  },
  {
    'name': `Layer has an unused border style`,
    'explanation': `An unused border style might as well be removed completely.`,
    'test': node => node.style && node.style.borders.some(border => !border.enabled),
    'fixText': node => `Remove`,
    'fix': node => {
      for (let i = node.style.borders.length - 1; i >= 0; --i) {
        if (!node.style.borders[i].enabled) {
          try {
            node.sketchObject.style().removeStyleBorderAtIndex(i) // doesn't do anything 
          } catch (error) {
            console.log(error)
          }
        }
      }
    }
  },
  {
    'name': `Layer has an unused fill style`,
    'explanation': `An unused fill style might as well be removed completely.`,
    'test': node => node.style && node.style.fills.some(fill => !fill.enabled)
  },
  {
    'name': `Layer has an unused shadow style`,
    'explanation': `An unused shadow style might as well be removed completely.`,
    'test': node => node.style && node.style.shadows.some(shadow => !shadow.enabled)
  },
  {
    'name': `Layer has an unused inner shadow style`,
    'explanation': `An unused inner shadow style might as well be removed completely.`,
    'test': node => node.style && node.style.innerShadows.some(shadow => !shadow.enabled)
  },
  {
    'types': ['SymbolMaster'],
    'name': `Symbol uses a background`,
    'explanation': `Symbol background colors should be determined by a background layer.`,
    'test': node => node.type == 'SymbolMaster' && node.background.enabled && node.background.includedInInstance
  },
  {
    'types': ['Group'],
    'name': `Superfluous group`,
    'explanation': `A group that contains nothing but a group is superfluous and should be removed.`,
    'test': node => node.type == 'Group' && node.parent.type == 'Group' && node.parent.layers.length == 1
  },
  {
    'types': ['Group'],
    'name': `Empty group`,
    'explanation': `A group that contains nothing is superfluous and should be removed.`,
    'test': node => node.type == 'Group' && node.layers.length == 0,
    'fixText': node => `Remove`,
    'fix': node => node.remove()
  },
  {
    'types': ['SymbolMaster'],
    'name': `Unexportable icon`,
    'explanation': `All icon symbols should be set to exportable so that they can be downloaded as assets in Abstract or Zeplin.`,
    'test': node => node.type == 'SymbolMaster' && node.name.match(/\bicon/i) != null && node.exportFormats.length == 0
  },
  {
    'types': ['Image'],
    'name': `Image in symbol`,
    'explanation': `Images in symbols don't retain their aspect ratio when then symbol is resized. This leades to skewed images. Use rectangles with the fill type 'Pattern Fill' and paste the image in there instead.`,
    'test': node => node.type == 'Image' && node.getParentArtboard()?.type == 'SymbolMaster'
  },
  {
    'types': ['SymbolMaster'],
    'name': `Master symbol override is not disabled`,
    'explanation': `If you use a master symbol within a set of symbols to create variations of the master symbol, it is advised to disable the override of the master symbol in those variations.`,
    'test': node => {
      if (node.type == 'SymbolMaster'
        && node.layers.length == 1
        && node.layers[0].type == 'SymbolInstance'
        && node.overrides[0].editable // may be a bit shakey
      ) return true
    }
  },
  {
    'types': ['SymbolInstance'],
    'name': `Text in symbol instance is not overridden`,
    'explanation': `Since symbols are supposed to be reused multiple times, it is advisable to use placeholder text like 'Label' instead of example text that works only in one place.`,
    'test': node =>
      node.type == 'SymbolInstance'
      && node.getParentArtboard()?.type != 'SymbolMaster' // For nested symbols, this is usually not a problem
      && node.overrides.some(override =>
        override.affectedLayer.type == 'Text'
        && override.property == 'stringValue'
        && override.isDefault
        && override.editable
      )
  },
  {
    'name': `Hidden layer found`,
    'explanation': `Hidden layers are often old stuff that should be removed entirely.`,
    'test': node => node.hidden
  },
  {
    /* TODO: This one should really be cached! */
    'name': `Layers are not arranged top to bottom and left to right`,
    'explanation': `Layers and artboards should be arranged in such a fashion that the top most layer in the layer list corresponds to the top left layer in the artboard. This is especially important for symbols because the overrides should appear in the symbol instance in a logical order.`,
    'test': node => {
      if (node.layers && node.type != 'Shape' && node.type != 'Page') {
        return node.layers.some((layer, index, layers) => {
          let previous = layers[index - 1];

          if (!previous) return;

          let a = layer.frame;
          let b = previous.frame;

          if (!( // If the following conditions aren't true, the issue should be raised
            a.y < b.y // A is higher than b, …
            || (a.y <= b.y + b.height  // …or it is on the same line but…
              && (a.x < b.x // …either to the left
                || a.x >= b.x && a.x + a.width <= b.x + b.width) // …or enclosed by the previous layer…
              || previous.name.match(/\bbackground\b|\bbg\b|\bborder\b/i) != null) // except when b is a background
          )) {
            return true;
          }
        });
      }
    }
  },
  {
    'types': ['SymbolInstance'],
    'name': `Symbol instance on Symbol page`,
    'explanation': `There shouldn't be any instances of symbols on the Symbol page.`,
    'test': node => node.type == 'SymbolInstance' && node.parent.type == 'Page' && node.parent.name == 'Symbols'
  },
  {
    'name': `Free floating layer on page`,
    'explanation': `All layers should be contained by an artboard.`,
    'test': node => {
      let parent

      try {
        if (node?.type == "Page") return false

        parent = node.parent
        if (node.type != 'SymbolMaster' && node.type != 'Artboard' && parent?.type == 'Page')
          return true
      } catch (error) {
        console.log(error)
      }
    }
  },
]

export { rules as default };