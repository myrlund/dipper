var path = require('path');

var dipper = require('../dipper');

var config = {
    configFile: path.resolve(__dirname, 'config.sample.json'),
};

dipper.createApplication(config)
    .then(function (application) {
        var someService = application.services['package2-1'];
        var package2 = application.packages.package2;

        var imports = application.getPackageImports(package2);

        console.log(someService);
        console.log(imports);
    })
    .catch(function (e) {
        console.log("Oh no! We've failed to set up your application:");
        console.log(e);
        console.log(e.stack);
    });

