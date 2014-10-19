var _ = require('underscore');
var path = require('path');
var fs = require('fs');
var Q = require('q');
var floyd = require('floyd');

function loadPackageConfig(filename) {
    try {
        return Q.resolve(require(filename));
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
        }
        return Q.reject('package config file not found: ' + filename);
    }
};

function loadPackageInfo(package) {
    if (_.isString(package)) {
        package = { path: package };
    }

    // Grab package metadata from the package.json file.
    var packageInfoPath = path.resolve(path.join(package.path, 'package.json'));
    try {
        package.meta = require(packageInfoPath);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
        }
        return Q.reject('package.json file not found for package path: ' + package.path);
    }

    // Package name defaults to the last piece of the path.
    var pathComponents = package.path.split(path.sep);
    package.name = package.meta.name || pathComponents[pathComponents.length - 1];

    return Q.resolve(package);
};

var resolvePackageEntryPoints = function (packages) {
    return Q.all(packages.map(function (package) {
        var entryPoints = _.compact([
            package.meta.main,
            'index',
            package.name
        ]);

        for (var i = 0; i < entryPoints.length; i++) {
            var filename = path.resolve(path.join(package.path, entryPoints[i]));
            try {
                var setupFn = require(filename);
                if (!_.isFunction(setupFn)) {
                    return Q.reject('package entry point must export a setup function: ' + package.name);
                }

                package.setupFn = setupFn;
                return Q.resolve(package);
            } catch (e) {
                if (e.code !== 'MODULE_NOT_FOUND') {
                    throw e;
                }
            }
        }
        return Q.reject('unable to resolve entry point for ' + package.path);
    }));
};

var loadAllPackages = function (packageConfig) {
    var packages = packageConfig.packages;
    if (!(_.isArray(packages) && packages.length > 0)) {
        return Q.reject('no packages defined in config file');
    }

    return Q.all(packages.map(loadPackageInfo))
        .then(resolvePackageEntryPoints);
};

var validatePackages = function (packages) {
    var provisions = packages.reduce(function (memo, package) {
        return memo.concat(package.meta.provides || []);
    }, []);

    return detectMissingDependencies(packages, provisions)
        .then(detectCircularDependencies);
}
var detectMissingDependencies = function (packages, provisions) {
    var packageChecks = packages.map(function (package) {
        return Q.all((package.meta.consumes || []).map(function (dependency) {
            if (provisions.indexOf(dependency) === -1) {
                return Q.reject('dependency not satisfied for ' + package.name + ': ' + dependency);
            }
        })).then(_.constant(Q.resolve(package)));
    });
    return Q.all(packageChecks);
}
var detectCircularDependencies = function (packages) {
    var graph = buildProvisioningGraph(packages);
    var cycles = floyd.detectCycles(graph);

    if (cycles.length > 0) {
        var circularPackages = _.pluck(cycles, 'firstKey');
        return Q.reject('Found ' + cycles.length + ' circular dependencies involving ' + circularPackages.join(', ') + '.');
    }

    return Q.resolve(packages);
};
var buildProvisioningGraph = function (packages) {
    var metas = _.pluck(packages, 'meta');
    var directedMetas = _.groupBy(metas, 'provides');
    var graph = _.object(
        _.keys(directedMetas),
        _.map(directedMetas, function (metaList) {
            return metaList[0].consumes;
        })
    );
    return graph;
};

module.exports = {
    loadConfig: loadPackageConfig,
    loadAll: loadAllPackages,
    validateAll: validatePackages,
};
