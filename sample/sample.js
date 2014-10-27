var path = require('path');

var dipper = require('../dipper');

var config = {
    configFile: path.resolve(__dirname, 'config.sample.json'),
};

dipper.createApplication(config)
    .then(function (services) {
        console.log(services);
    })
    .catch(function (e) {
        console.log("Oh no! We've failed to set up your application:");
        console.log(e);
        console.log(e.stack);
    });

