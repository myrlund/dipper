var _ = require('underscore');
var Q = require('q');
var EventEmitter = require('events').EventEmitter;

var packages = require('./packages');

var exports = {
    createApplication: function (options) {
        var dipper = new Dipper(options);
        return dipper.bootstrap();
    }
};

function Dipper(options) {
    this.options = _.defaults(options || {}, {
        packageConfigFile: './config.json',
    });

    // Allow for providing package config directly
    this.packageConfig = this.options.packageConfig;
}
Dipper.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Dipper
    }
});

Dipper.prototype.bootstrap = function () {
    return this.getPackageConfig()
        .then(packages.loadAll)
        .then(packages.validateAll);
};

Dipper.prototype.getPackageConfig = function () {
    if (this.packageConfig) {
        return Q.resolve(this.packageConfig);
    } else {
        return packages.loadConfig(this.options.packageConfigFile);
    }
}

module.exports = exports;
