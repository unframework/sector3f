const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const ASSETS_DIR =
  'C:\\Users\\nickm\\Google Drive\\Gamedev\\Sector3f Public Assets';

module.exports = {
  entry: {
    index: './src/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name]_bundle.[contenthash].js'
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
    }),

    new CleanWebpackPlugin(),

    new CopyWebpackPlugin({
      patterns: [
        {
          from: ASSETS_DIR,
          to: 'assets'
          // globOptions: { ignore: ['**/desktop.ini'] }
        }
      ]
    })
  ],

  devServer: {
    static: [
      {
        directory: ASSETS_DIR,
        publicPath: '/assets'
      }
    ]
  }
};
