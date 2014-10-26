var expect = require('chai').expect;
var sinon = require('sinon');
var Q = require('q');

var dipper = require('../dipper');

describe('Dipper', function () {
    describe('createApplication', function () {
        it('rejects empty configs', function (done) {
            var app = dipper.createApplication({
                serviceConfig: []
            });

            app.catch(function (e) {
                expect(e).to.be.ok;
                done();
            });
        });

        it('loads and sets up provided packages', function (done) {
            var packages = ['package1'];
            var fakeServiceRegistry = { service: 'registry' };

            var _dipper = new dipper.Dipper({
                packageConfig: packages
            });
            _dipper.serviceRegistry = fakeServiceRegistry;

            var loadStub =  sinon.stub(_dipper, 'loadPackages').returns(Q.resolve());
            var setupStub =  sinon.stub(_dipper, 'setupServices').returns(Q.resolve());

            _dipper.bootstrap().then(function (serviceRegistry) {
                expect(serviceRegistry).to.eql(fakeServiceRegistry);
                expect(loadStub.calledOnce).to.be.true;
                expect(setupStub.calledOnce).to.be.true;
                done();
            });
        });
    });
});
