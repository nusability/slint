module.exports = function (config, entry) {
  config.node = entry.isPluginCommand ? false : {
    setImmediate: false
  };
  config.module.rules.push({
    test: /\.(html)$/,
    use: [{
      loader: "@skpm/extract-loader",
    },
    {
      loader: "html-loader",
      options: {
        attrs: [
          'img:src',
          'link:href'
        ],
        interpolate: true,
      },
    },
    ]
  })
  config.module.rules.push({
    test: /\.(css)$/,
    use: [{
      loader: "@skpm/extract-loader",
    },
    {
      loader: "css-loader",
    },
    ]
  })
  config.module.rules.push(
    {
      test: /\.m?js$/,
      exclude: /(node_modules|bower_components)/,
      use: {
        loader: 'babel-loader',
        options: {
          plugins: ["@babel/plugin-proposal-optional-chaining"]
        }
      }
    })

}
