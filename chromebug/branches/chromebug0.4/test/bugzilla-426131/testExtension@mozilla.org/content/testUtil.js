

var Util = {

    openChromeResourceAsContent: function(chromeURL, handleOnLoad)
    {
        var content = this.getResource(chromeURL);
        var dataURL = this.getDataURLForContent(content, chromeURL);
        gBrowser.selectedTab = gBrowser.addTab(dataURL);
        if (handleOnLoad)
        {
            setTimeout( function() {
                getBrowser().selectedTab.addEventListener('load', handleOnLoad, false);
            });
        }

    },

    getResource: function(aURL)
    {
        var ioService=Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
        var scriptableStream=Components
            .classes["@mozilla.org/scriptableinputstream;1"]
            .getService(Components.interfaces.nsIScriptableInputStream);

        var channel=ioService.newChannel(aURL,null,null);
        var input=channel.open();
        scriptableStream.init(input);
        var str=scriptableStream.read(input.available());
        scriptableStream.close();
        input.close();
        return str;
    },

    getDataURLForContent: function(content, url)
    {
        // data:text/javascript;fileName=x%2Cy.js;baseLineNumber=10,<the-url-encoded-data>
        var uri = "data:text/html;";
        uri += "fileName="+encodeURIComponent(url)+ ","
        uri += encodeURIComponent(content);
        return uri;
    }
}