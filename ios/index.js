const fs = require('fs');
const path = require('path');

const debug = require('debug')('appcenter-link:ios:index');
const glob = require('glob');
const inquirer = require('inquirer');

// Assumption - react-native link is always called from the top of the project
// As indicated in https://github.com/facebook/react-native/blob/4082a546495c5d9f4c6fd1b0c2f64e9bc7a88bc7/local-cli/link/getProjectDependencies.js#L7
const pjson = require(path.join(process.cwd(), './package.json'));

const AppDelegate = require('./AppDelegate');

const appDelegatePaths = glob.sync('**/AppDelegate.m', { ignore: 'node_modules/**' });
const appDelegatePath = findFileByAppName(appDelegatePaths, pjson ? pjson.name : null) || appDelegatePaths[0];
debug(`AppDelegate.m path - ${appDelegatePath}`);

module.exports = {
    checkIfAppDelegateExists() {
        try {
            fs.accessSync(appDelegatePath, fs.F_OK);
        } catch (e) {
            debug(`Could not find AppDelegate.m file at ${appDelegatePath}, so could not add the framework for iOS.`);
            return false;
        }
        return true;
    },

    initInAppDelegate(header, initCode, oldInitCodeRegExp) {
        console.log(`Patching file ${appDelegatePath}`);
			return inquirer.prompt([{
				type: 'input',
				message: 'What BaiduMapKey does your iOS app use? [None]',
				name: 'BaiduMapKey',
			}]).then((answers) => {
				try {
					const resultCode = initCode.replace('BaiduMapKey',answers.BaiduMapKey)
					const appDelegate = new AppDelegate(appDelegatePath);
					appDelegate.addHeader(header);
					appDelegate.addInitCode(resultCode, oldInitCodeRegExp);
					return Promise.resolve(appDelegate.save());
				} catch (e) {
					debug('Could not change AppDelegate', e);
					return Promise.reject(e);
				}
			});

    },
};

// Helper that filters an array with AppDelegate.m paths for a path with the app name inside it
// Should cover nearly all cases
function findFileByAppName(array, appName) {
    if (array.length === 0 || !appName) return null;

    const appNameLower = appName.toLowerCase();
    for (let i = 0; i < array.length; i++) {
        if (array[i] && array[i].toLowerCase().indexOf(appNameLower) !== -1) {
            return array[i];
        }
    }

    return null;
}
