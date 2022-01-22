const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    index: './src/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name]_bundle.[hash].js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx']
  },
  module: {
    rules: [
      { test: /\.(jsx?|tsx?)$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      {
        test: /\.(jpe?g|png|gif|svg|flac|wav|glb)$/i,
        use: 'file-loader?name=assets/[name].[hash].[ext]'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      chunks: ['index'],
      filename: 'index.html',
      template: 'src/index.html'
    })
  ],

  devServer: {
    static: [
      {
        directory:
          'C:\\Users\\nickm\\Google Drive\\Gamedev\\Sector3f Public Assets',
        publicPath: '/assets'
      }
    ]
  }
};
