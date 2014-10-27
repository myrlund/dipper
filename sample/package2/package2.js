module.exports = function setup(options, imports, register) {
    console.log("YES this is package2");
    console.log(imports);

    return {
        'package2-1': 'p2',
    };
};
