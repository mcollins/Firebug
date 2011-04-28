function runTest()
{
    FBTest.sysout("instanceof.START;");
    FBTest.progress("using module dependencies: " + baseLocalPath);

    Components.utils["import"]("resource://firebug/moduleLoader.js");

    var uid = Math.random();  // to give each test its own loader

    // Compute relative path and construct module loader.
    var baseUrl = baseLocalPath + "loader/instanceof/";
    var require = (new ModuleLoader(null, {
        context: "foo"+uid,
        baseUrl: baseUrl
    })).loadDepsThenCallback;

    require(["reps.js"], function(Reps)
    {
        var obj = new MyObject("hello");

        // obj is instance of MyObject
        FBTest.ok((obj instanceof MyObject),
            "The object is instance of MyObject");

        FBTest.ok((Reps.instanceOf(obj, MyObject)),
            "The object is instance of MyObject");

        FBTest.ok((Reps.XW_instanceOf(FW.FBL, obj, MyObject)),
            "The object is instance of MyObject");

        // obj is not instance of Window
        FBTest.ok(!(obj instanceof window.Window),
            "The object is not an instance of Window");

        FBTest.ok(!(Reps.instanceOf(obj, window.Window)),
            "The object is not an instance of Window");

        FBTest.ok(!(Reps.XW_instanceOf(FW.FBL, obj, window.Window)),
            "The object is not an instance of Window");

        // window is instance of Window
        FBTest.ok((window instanceof window.Window),
            "The window is an instance of Window");

        FBTest.ok((Reps.instanceOf(window, window.Window)),
            "The window is an instance of Window");

        FBTest.ok((Reps.XW_instanceOf(FW.FBL, window, window.Window)),
            "The window is an instance of Window");

        FBTest.testDone("instanceof.DONE");
    });
}

function MyObject(msg)
{
    this.msg = msg;
}
