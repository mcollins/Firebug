/* 
 * @author: Jan Odvarko, www.janodvarko.cz
 */

function expandNetRows(panelNode, className) // className, className, ...
{
    var rows = FBL.getElementsByClass.apply(null, arguments);
    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        if (!FBL.hasClass(row, "opened"))
            fireunit.click(row);
    }
}

function expandNetTabs(panelNode, tabClass)
{
    var tabs = FBL.getElementsByClass.apply(null, arguments);
    for (var i=0; i<tabs.length; i++)
    {
        var tab = tabs[i];
        if (!FBL.hasClass(tab, "collapsed"))
            fireunit.click(tab);
    }
}

function unEscapeHTML(str)
{
    return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function makeRequest(method, url, callback) 
{
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == 200)
            setTimeout(function() {
                callback(request);
            }, layoutTimeout);
    };

    request.open(method, url, true);
    request.send(null);
}

function getCurrentPath()
{
    var index = location.pathname.lastIndexOf("/");
    return location.pathname.substr(0, index+1);
}
