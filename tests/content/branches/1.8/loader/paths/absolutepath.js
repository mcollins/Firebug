function runTest()
{
    FBTest.sysout("absolutepath.START;");
    FBTest.progress("using baseLocalPath: "+baseLocalPath);

    Components.utils["import"]("resource://moduleloader/moduleLoader.js");
    ModuleLoader.bootstrap("resource://moduleloader/require.js");

    var uid = Math.random();  // to give each test is own loader
    var require = (new ModuleLoader(null, {
        context: "foo" + uid
    })).loadDepsThenCallback;

    var baseUrl = baseLocalPath + "loader/paths/";
    require([
        baseUrl + "add.js",
        baseUrl + "subtract.js"
    ],
    function(AddModule, SubtractModule)
    {
        FBTest.compare(3, AddModule.add(1, 2), "The add module must be properly loaded");
        FBTest.compare(2, SubtractModule.subtract(3, 1), "The subtract module must be properly loaded");
        FBTest.testDone("absolutepath.DONE");
    });
}
