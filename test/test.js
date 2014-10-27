var expect = require('chai').expect;
var sinon = require('sinon');
var Q = require('q');

var dipper = require('../dipper');

describe('Dipper', function () {
    describe('createApplication', function () {
        it('rejects empty configs', function (done) {
            var app = dipper.createApplication({
                config: []
            });

            app.catch(function (e) {
                expect(e).to.be.ok;
                done();
            });
        });
    });
});
