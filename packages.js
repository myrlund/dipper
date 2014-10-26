var _ = require('underscore');
var path = require('path');
var Q = require('q');
var Topo = require('topo');

var util = require('./util');

module.exports = {
    loadConfig: loadConfig,
    loadAll: loadAll,
};

function loadConfig(filename) {
    try {
        return Q.resolve(require(filename).services);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
        }
        return Q.reject('service config file not found: ' + filename);
    }
};

/**
 * Builds complete package objects, loads metadata, and sets them up in a correct order.
 */
function loadAll(packages) {
    if (!(_.isArray(packages) && packages.length > 0)) {
        return Q.reject('no packages defined in config file');
    }

    return loadPackageMetas(packages)
        .then(detectMissingDependencies)
        .then(sortedByDependencies)
        .then(setupEntryPoints);
}

/**
 * Builds package objects from metadata in package.json files in each package directory.
 */
function loadPackageMetas(packages) {
    var loadPackageMeta = function (package) {
        if (_.isString(package)) {
            package = { path: package };
        }

        // Grab service metadata from the service.json file.
        var packageInfoPath = path.resolve(path.join(package.path, 'package.json'));
        try {
            package.meta = require(packageInfoPath);
        } catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') {
                throw e;
            }
            return Q.reject('package.json file not found for service path: ' + package.path);
        }

        // Service name defaults to the last piece of the path.
        var pathComponents = package.path.split(path.sep);
        package.name = package.meta.name || pathComponents[pathComponents.length - 1];

        return Q.resolve(package);
    }

    return Q.all(packages.map(loadPackageMeta));
}

/**
 * Compares the provided and consumed services of provided packages.
 * Rejects the promise if any consumed packages are missing.
 */
function detectMissingDependencies(packages) {
    var providedServices = util.packagesByMetaService(packages, 'provides');
    var consumedServices = util.packagesByMetaService(packages, 'consumes');

    var servicesMissingProvider = _.difference(Object.keys(consumedServices), Object.keys(providedServices));
    if (servicesMissingProvider.length > 0) {
        console.error('' + servicesMissingProvider.length + ' services are missing a provider:');
        servicesMissingProvider.forEach(function (service) {
            console.error(' - ' + service + ': consumed by ' + consumedServices[service].name);
        });

        return Q.reject(new Error('unresolved dependencies'));
    }

    return Q.resolve(packages);
}

/**
 * Sorts packages in topological order based on their mutual service consumption.
 */
function sortedByDependencies(packages) {
    var groupedByServices = util.packagesToServices(packages, { consumes: 'after', service: 'group' });

    // Add to topological graph
    var topo = new Topo();
    groupedByServices.forEach(function (package) {
        topo.add(package.name, _.omit(package, 'name'));
    });

    // Return sorted services, including those without provisions.
    var sortedPackageNames = _.union(topo.nodes, _.pluck(packages, 'name'));

    return sortedPackageNames.map(function (packageName) {
        return _.findWhere(packages, { name: packageName });
    });
}

/**
 * Augments the service with a setupFn property.
 */
function setupEntryPoints(packages) {
    var setupEntryPoint = function (package) {
        // Prioritized list of relative entry point file names.
        var entryPoints = _.compact([
            package.meta.main,
            'index',
            package.name
        ]);

        var entryPoint = util.getEntryPoint(package.path, entryPoints);
        if (!entryPoint) {
            return Q.reject('unable to resolve entry point for ' + package.path);
        }

        // Require entry point to be a function.
        if (!_.isFunction(entryPoint)) {
            return Q.reject('service entry point must export a setup function: ' + service.name);
        }

        // Augment package.
        package.setupFn = entryPoint;

        return Q.resolve(package);
    };

    return Q.all(packages.map(setupEntryPoint));
};
