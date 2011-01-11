function runTest()
{
    FBTest.sysout("relativepath.START;");
    FBTest.progress(baseLocalPath);

    Components.utils["import"]("resource://firebug/moduleLoader.js");

    var require = (new ModuleLoader(null, {context: "foo"})).loadDepsThenCallback;

    var baseUrl = baseLocalPath + "loader/paths/";
    require([
        baseUrl + "add.js",
        baseUrl + "subtract.js"
    ],
    function(AddModule, SubtractModule)
    {
        FBTest.compare(3, AddModule.add(1, 2), "The add module must be properly loaded");
        FBTest.compare(2, SubtractModule.subtract(3, 1), "The subtract module must be properly loaded");
        FBTest.testDone("relativepath.DONE");
    });
}
