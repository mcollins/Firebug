function runTest()
{
    FBTest.sysout("relativepath.START;");
    FBTest.progress("using baseLocalPath: " + baseLocalPath);

    Components.utils["import"]("resource://firebug/moduleLoader.js");
    ModuleLoader.bootstrap("resource://firebug/require.js");

    var uid = Math.random();  // to give each test is own loader

    // Compute relative path and construct module loader.
    var baseUrl = baseLocalPath + "loader/paths/";
    var require = (new ModuleLoader(null, {
        context: "foo" + uid,
        baseUrl: baseUrl
    })).loadDepsThenCallback;

    require(["add.js", "subtract.js"], function(AddModule, SubtractModule)
    {
        FBTest.compare(3, AddModule.add(1, 2), "The add module must be properly loaded");
        FBTest.compare(2, SubtractModule.subtract(3, 1), "The subtract module must be properly loaded");
        FBTest.testDone("relativepath.DONE");
    });
}
