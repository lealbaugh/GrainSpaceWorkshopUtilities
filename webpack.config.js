const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: {
    main: './src/frontend/main.ts'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/frontend'),
  },
  devtool: "source-map",
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/frontend/", to: ".", globOptions: {ignore: ['**/*.ts', '**/.*']}},
      ],
    }),
  ]
};