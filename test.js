var dipper = require('./dipper');

dipper.createApplication()
	.then(function (app) {
		app.forEach(function (package) {
            package.setupFn();
        });
	})
	.catch(function (e) {
        console.log("Oh no! We've failed to set up your application:");
        console.log(e);
		console.log(e.stack);
	});

