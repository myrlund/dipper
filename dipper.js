var _ = require('underscore');
var Q = require('q');

var packages = require('./packages');

module.exports = {
    createApplication: function (options, callback) {
        return bootstrap(options).nodeify(callback);
    },
    bootstrap: bootstrap,
    loadPackages: loadPackages,
    setupServices: setupServices,
};

/**
 * Bootstraps the application.
 *
 * @returns a promise resolving to the application's service registry.
 */
function bootstrap(options) {
    options = _.defaults(options || {}, {
        configFile: './config.json',
        setupTimeout: 150,
    });

    return loadPackages(options)
        .then(_.partial(setupServices, options));
}

/**
 * @returns packages with metadata, setup functions, sorted topologically by dependencies.
 */
function loadPackages(options) {
    var getPackageConfig = function () {
        return options.config ?
            Q.resolve(options.config) :
            packages.loadConfig(options.configFile);
    }

    return getPackageConfig().then(packages.loadAll);
};

/**
 * Calls the setup functions of all the provided packages with their consumed services.
 *
 * @returns the application service registry.
 */
function setupServices(options, packages) {
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
        }, options.setupTimeout);

        return deferred.promise;
    }));

    // When all services are set up, return the service registry.
    return setupAllServices.then(function () {
        return serviceRegistry;
    });
};
