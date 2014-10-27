var _ = require('underscore');
var Q = require('q');

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

Dipper.prototype.getPackageConfig = function () {
    return this.packageConfig ?
        Q.resolve(this.packageConfig) :
        packages.loadConfig(this.options.packageConfigFile);
};

Dipper.prototype.loadPackages = function () {
    return this.getPackageConfig().then(packages.loadAll);
};

Dipper.prototype.setupServices = function (packages) {
    var self = this;

    // Initialize the service registry.
    var serviceRegistry = {};

    var setupAllServices = Q.all(packages.map(function (package) {
        var deferred = Q.defer();

        // Grab only the package's imports from the service registry.
        var packageImports = _.pick(serviceRegistry, package.meta.consumes);

        // Utility for calculating package services pending registration.
        var getRemainingServices = function () {
            return _.difference(package.meta.provides || [], Object.keys(serviceRegistry));
        };

        var addExportsToServiceRegistry = function (exports) {
            // Add each exported service to the service registry.
            _.each(exports, function (service, serviceName) {
                serviceRegistry[serviceName] = service;
            });

            // Resolve when all provided services are registered.
            if (getRemainingServices().length === 0) {
                deferred.resolve();
            }
        };

        // Call the setup function with options, imports, and registry callback.
        var syncExports = package.setupFn(package.meta, packageImports, addExportsToServiceRegistry);

        // Allow for simply returning synchronous exports.
        if (_.isObject(syncExports)) {
            addExportsToServiceRegistry(syncExports);
        }

        // Resolve immediately if no async services are pending.
        if (getRemainingServices().length === 0) {
            return Q.resolve();
        }

        // Require registry callback within the configured setupTimeout.
        setTimeout(function () {
            deferred.reject(new Error('Package ' + package.name + ' did not register services: ' + getRemainingServices().join(', ')));
        }, self.options.setupTimeout);

        return deferred.promise;
    }));

    // When all services are set up, return the service registry.
    return setupAllServices.then(function () {
        return serviceRegistry;
    });
};

Dipper.prototype.bootstrap = function () {
    var setupServices = this.setupServices.bind(this);

    return this.loadPackages().then(setupServices);
};

module.exports = exports;
