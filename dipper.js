var _ = require('underscore');
var Q = require('q');
var EventEmitter = require('events').EventEmitter;

var packages = require('./packages');

var exports = {
    createApplication: function (options, callback) {
        var dipper = new Dipper(options);
        return dipper.bootstrap().nodeify(callback);
    },
    Dipper: Dipper
};

function Dipper(options) {
    this.options = _.defaults(options || {}, {
        packageConfigFile: './config.json',
        setupTimeout: 150,
    });

    // Allow for providing package config directly
    this.packageConfig = this.options.packageConfig;
}
Dipper.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Dipper
    }
});

Dipper.prototype.getPackageConfig = function () {
    return this.packageConfig ?
        Q.resolve(this.packageConfig) :
        packages.loadConfig(this.options.packageConfigFile);
};

Dipper.prototype.loadPackages = function () {
    return this.getPackageConfig()
        .then(packages.loadAll)
        .then(function (packages) {
            this.packages = packages;
        }.bind(this));
};

Dipper.prototype.setupServices = function () {
    var self = this;

    // Initialize the service registry.
    self.serviceRegistry = {};

    return Q.all(this.packages.map(function (package) {
        var deferred = Q.defer();

        // Grab only the package's imports from the service registry.
        var packageImports = _.pick(self.serviceRegistry, package.meta.consumes);

        // Utility for calculating package services pending registration.
        var getRemainingServices = function () {
            return _.difference(package.meta.provides || [], Object.keys(self.serviceRegistry));
        };

        // Call the setup function with options, imports, and registry callback.
        package.setupFn(package.meta, packageImports, function (namespace, exports) {
            _.each(exports, function (provision, key) {
                self.serviceRegistry[key] = provision;
            });

            // Resolve when all provided services are registered.
            if (getRemainingServices().length === 0) {
                deferred.resolve();
            }
        });

        // Resolve immediately if no async services are pending.
        if (getRemainingServices().length === 0) {
            return Q.resolve();
        }

        // Require registry callback within the configured setupTimeout.
        setTimeout(function () {
            deferred.reject(new Error('Package ' + service.name + ' did not register services: ' + getRemainingServices().join(', ')));
        }, self.options.setupTimeout);

        return deferred.promise;
    }));
};

Dipper.prototype.bootstrap = function () {
    return this.loadPackages()
        .then(this.setupServices.bind(this))
        .then(function () {
            return this.serviceRegistry;
        }.bind(this));
};

module.exports = exports;
