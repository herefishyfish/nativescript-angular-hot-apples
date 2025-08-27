const webpack = require("@nativescript/webpack");
const { resolve } = require('path');

module.exports = (env) => {
	webpack.init(env);

	webpack.chainWebpack((config) => {
		const nodeModulesPath = webpack.Utils.project.getProjectFilePath('node_modules');

		config.resolve.alias.set('globals', resolve(nodeModulesPath, '@nativescript/core/globals'));
	});

	return webpack.resolveConfig();
};
