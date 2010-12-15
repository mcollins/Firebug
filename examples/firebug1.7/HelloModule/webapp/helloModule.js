/* See license.txt for terms of usage */

define(function(require, exports, module) {

//*************************************************************************************************
// Imports

var DomTree = require("modules/dom-tree").DomTree;

//*************************************************************************************************
// The Application

function HelloModuleApp()
{
}

/**
 * The main application object.
 */
HelloModuleApp.prototype =
/** @lends HelloModuleApp */
{
    initialize: function()
    {
        var content = document.getElementById("content");
        this.domTree = new DomTree(window);
        this.domTree.append(content);
    }
};

//*************************************************************************************************
// Initialization

var theApp = new HelloModuleApp();
theApp.initialize();

//*************************************************************************************************
});
