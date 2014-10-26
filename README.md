Dipper.js
=========

An lightweight promise-driven dependency injection library for Node.js. Heavily inspired by [Cloud9](https://c9.io/)'s [Architect](https://github.com/c9/architect/).

Usage
-----

A dipper-driven application is comprised of _packages_, each providing and consuming _services_.

Putting together an application consists of three simple steps:

1. **Application configuration.** Divide logical modules into _packages_, each living in a separate directory, and list them in an application config file.
2. **Package configuration.** Specify the services imported and exported from each package in tiny package config files. An entry point for each package is invoked with its imports, and a callback.
3. **Bootstrap the application.** Give `dipper.createApplication` your application config.

In a bit more detail...

### 1. Application configuration

Packages are passed to `dipper.createApplication`, or set up in a JSON configuration file – by default `./config.json` – in the following manner:

```json
{
  "packages": [
    "./some-package",
    {"path": "./another-package", "someParameter": "itsValue"}
  ]
}
```

### 2. Package configuration

Each package requires a `package.json` in its root directory:

```javascript
{
  "name": "Service 1", // optional (defaults to: last part of package path)
  "main": "entry.js",  // the package's entry point (defaults to: name || 'index')
  "consumes": ["service2"], // package imports. must be provided by another package.
  "provides": ["service1"]  // package exports. can be consumed by other packages.
}
```

#### The package setup function

The entry point of each package must export a setup function, through which it is injected options, its dependencies, and a callback for registering its own provided services:

```javascript
// A package entry point.
module.exports = function (options, imports, register) {
    var someServer = require('./someServer').setup(imports.service2);
    
    register({
        service1: someServer
    });
};
```

### 3. Bootstrap the application

Bring it all together. Finally, in your main application module:

```javascript
var dipper = require('dipper');

dipper.createApplication(yourConfig).then(function (services) {
    services.service1.start();
});
```

API
---

@TODO.

