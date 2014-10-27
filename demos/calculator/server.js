#!/usr/bin/env node

var path = require('path');
var dipper = require('dipper');

var configPath = path.join(__dirname, 'config.js');
var config = dipper.createApplication({
    configFile: configPath
})
.then(function (app) {
    console.log("app ready");
})
.done();
