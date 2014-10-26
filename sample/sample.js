var path = require('path');

var dipper = require('../dipper');

dipper.createApplication({
    packageConfigFile: path.resolve(__dirname, 'config.sample.json'),
    basePath: __dirname,
})
	.then(function (app) {
		console.log(app);
	})
	.catch(function (e) {
        console.log("Oh no! We've failed to set up your application:");
        console.log(e);
		console.log(e.stack);
	});

