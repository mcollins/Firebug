function runTest()
{
    FBTest.sysout("appCache.START");
    FBTest.openNewTab(basePath + "dom/appCache/appCache.html", function(win)
    {
        FBTest.openFirebug();
        var panel = FW.FirebugChrome.selectPanel("dom");

        addOfflinePermission(win);

        FBTest.reload(function(win)
        {
            FBTest.waitForDOMProperty("applicationCache", function(row)
            {
                FBTest.compare(
                    /\s*applicationCache\s*1 items in offline cache\s*/,
                    row.textContent, "There must be 1 item in the applicationCache.");

                //clearAppCache(win);
                clearOfflinePermission(win);
                FBTest.testDone("appCache.DONE");
            });

            var href = win.location.href;
            var i = href.lastIndexOf(".");
            var itemURL = href.substr(0, i) + ".js";

            waitForAdd(win, itemURL, function()
            {
                FBTest.refreshDOMPanel();
            });

            FBTest.click(win.document.getElementById("addButton"));
        });

    });
}

function addOfflinePermission(win)
{
    var pm = Cc["@mozilla.org/permissionmanager;1"]
      .getService(Ci.nsIPermissionManager);
    var uri = Cc["@mozilla.org/network/io-service;1"]
      .getService(Ci.nsIIOService)
      .newURI(win.location.href, null, null);

    if (pm.testPermission(uri, "offline-app") != 0)
      FBTest.progress("Previous test failed to clear offline-app permission!");

    pm.add(uri, "offline-app", Ci.nsIPermissionManager.ALLOW_ACTION);
}

function clearOfflinePermission(win)
{
    var pm = Cc["@mozilla.org/permissionmanager;1"]
        .getService(Ci.nsIPermissionManager);
    var uri = Cc["@mozilla.org/network/io-service;1"]
        .getService(Ci.nsIIOService)
        .newURI(win.location.href, null, null);

    pm.remove(uri.host, "offline-app");
}

function clearAppCache(win)
{
    // XXX: maybe we should just wipe out the entire disk cache.
    var appCache = getActiveCache(win);
    if (appCache)
        appCache.discard();
}

function getManifestUrl(win)
{
    return win.document.documentElement.getAttribute("manifest");
}

function getActiveCache(win)
{
    // Note that this is the current active cache in the cache stack, not the
    // one associated with this window.
    var serv = Cc["@mozilla.org/network/application-cache-service;1"]
        .getService(Ci.nsIApplicationCacheService);

    return serv.getActiveCache(getManifestUrl(win));
}

// The offline API as specified has no way to watch the load of a resource
// added with applicationCache.mozAdd().
function waitForAdd(win, itemURL, onFinished)
{
    // Check every half second.
    var numChecks = 15;
    var waitFunc = function()
    {
        var hasItem = false;
        try {
            hasItem = win.applicationCache.mozHasItem(itemURL)
        } catch (e) {
        }

        if (hasItem)
        {
            onFinished();
            return;
        }

        if (--numChecks == 0)
        {
            onFinished();
            return;
        }

        setTimeout(waitFunc, 500);
    }

    setTimeout(waitFunc, 500);
}
