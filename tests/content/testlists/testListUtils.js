function getDriverBaseURI()
{
    var parts = window.location.toString().split('/');
    parts.pop(); // remove file name
    parts.pop(); // remove /testLists/
    return parts.join('/') + "/";
}

window.addEventListener("load", function showPage()
{
    var d = document.getElementById("driverURI");
    if (d)
        d.innerHTML = driverBaseURI;

    var t = document.getElementById("testcaseURI");
    if (t)
        t.innerHTML = serverURI;

    var cases = document.getElementById("testList");
    var currentGroup = null;
    for(var i = 0; i < testList.length; i++)
    {
        var testCase = testList[i];
        if (testCase.group != currentGroup)
        {
            currentGroup = testCase.group;
            var h3 = document.createElement('h3');
            h3.innerHTML = currentGroup.charAt(0).toUpperCase() + currentGroup.substr(1).toLowerCase();
            cases.appendChild(h3);
        }
        var entry = document.createElement('div');
        entry.innerHTML="<a href="+driverBaseURI+testCase.uri+">"+testCase.desc+"</a>";
        cases.appendChild(entry);
    }
}, true);
