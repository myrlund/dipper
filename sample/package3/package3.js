module.exports = function (options, imports, register) {
    console.log("this is 3");
    console.log(imports);

    register(null, {
        'package3-1': 'foobar',
    });
}
