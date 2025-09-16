const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
require('dotenv').config();

module.exports = (env, argv) => {
	const isFirefox = env.BROWSER === 'firefox';
	const isProduction = argv.mode === 'production';

	const getOutputDir = () => {
		if (isProduction) {
			return isFirefox ? 'dist_firefox' : 'dist';
		} else {
			return isFirefox ? 'dev_firefox' : 'dev';
		}
	};

	const outputDir = getOutputDir();

	const mainConfig = {
		mode: argv.mode,
		entry: {
			content: './src/content.ts',
			background: './src/background.ts',
			popup: './src/popup.ts',
		},
		output: {
			path: path.resolve(__dirname, outputDir),
			filename: '[name].js',
		},
		devtool: isProduction ? false : 'source-map',
		resolve: {
			extensions: ['.ts', '.js'],
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: [
						{
							loader: 'ts-loader',
							options: {
								compilerOptions: {
									module: 'ES2020'
								}
							}
						}
					],
					exclude: /node_modules/,
				},
			]
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(argv.mode),
				'DEBUG_MODE': JSON.stringify(!isProduction),
				'DEADDROP_SERVER_URL': JSON.stringify(process.env.DEADDROP_SERVER_URL || '')
			}),
			new CopyPlugin({
				patterns: [
					{
						from: isFirefox ? "src/manifest.firefox.json" : "src/manifest.chrome.json",
						to: "manifest.json"
					},
					{
						from: "src/popup.html",
						to: "popup.html"
					},
				],
			}),
		]
	};

	return [mainConfig];
};

