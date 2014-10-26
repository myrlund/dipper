var fs = require('fs');
var path = require('path');

module.exports = {
    packagesToServices: function (packages, keys) {
        return packages.reduce(function (memo, package) {
            return memo.concat((package.meta.provides || []).map(function (service) {
                var serviceObj = {};
                serviceObj[keys.name || 'name'] = package.name;
                serviceObj[keys.consumes || 'consumes'] = package.meta.consumes || [];
                serviceObj[keys.service || 'service'] = service;
                return serviceObj;
            }));
        }, []);
    },
    packagesByMetaService: function (packages, metaKey) {
        return packages.reduce(function (memo, package) {
            var services = (package.meta && package.meta[metaKey]) || [];
            services.forEach(function (service) {
                memo[service] = package;
            });
            return memo;
        }, {});
    },
    getEntryPoint: function (packagePath, prioritizedNames) {
        // Try each entry point in turn, looking for existing files.
        for (var i = 0; i < prioritizedNames.length; i++) {
            var filename = path.resolve(path.join(packagePath, prioritizedNames[i] + '.js'));
            if (!isFile(filename)) {
                continue;
            }

            return require(filename);
        }
        return null;
    }
};

// Util utils (yep).
function isFile(filename) {
    try {
        // Verify that the entry point is, in fact, a file.
        var stats = fs.statSync(path.join(filename));
        return stats.isFile();
    } catch (e) {
        if (e.code !== 'ENOENT') {
            // Make sure to re-throw errors thrown in the setup function.
            throw e;
        }
        return false;
    }
}
