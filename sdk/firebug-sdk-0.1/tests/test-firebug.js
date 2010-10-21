var firebug = require("firebug");

exports.ensureAdditionWorks = function(test) {
    test.assertEqual(firebug.add(1, 1), 2, "1 + 1 = 2");
}
