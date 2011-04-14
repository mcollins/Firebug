function runTest()
{
    FBTest.sysout("dependencies.START;");
    FBTest.progress("using module dependencies: " + baseLocalPath);

    Components.utils["import"]("resource://firebug/moduleLoader.js");

    var uid = Math.random();  // to give each test its own loader

    // Compute relative path and construct module loader.
    var baseUrl = baseLocalPath + "loader/dependencies/";
    var require = (new ModuleLoader(null, {
        context: "foo"+uid,
        baseUrl: baseUrl
    })).loadDepsThenCallback;

    require(["module-a.js"], function(A)
    {
        var message = A.getMessage();
        FBTest.compare("Hello World!", message, "The message from modules must match.");
        FBTest.testDone("dependencies.DONE");
    });
}
