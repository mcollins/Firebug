
Components.utils.reportError("First Bug is that this does not show up");

// second bug is that this fails silently
Components.utils.import("resource://bug/testModule.js");

//http://ted.mielczarek.org/code/mozilla/jscomponentwiz/

const nsISupports = Components.interfaces.nsISupports;

//You can change these if you like
const CLASS_ID = Components.ID("291a4875-3b83-4030-962d-cd5ca5c59426");
const CLASS_NAME = "bug";
const CONTRACT_ID = "@johnjbarton/testcomponent;1";

//This is your constructor.
//You can do stuff here.
function TestComponent() {
// you can cheat and use this
// while testing without
// writing your own interface
this.wrappedJSObject = this;
}

//This is the implementation of your component.
TestComponent.prototype = {
// for nsISupports
QueryInterface: function(aIID)
{
 // add any other interfaces you support here
 if (!aIID.equals(nsISupports))
     throw Components.results.NS_ERROR_NO_INTERFACE;
 return this;
},
test: function()
{
    if (typeof(Testing) === "undefined")
        Components.utils.reportError("Testing === undefined");

    if (Testing)
        Components.utils.reportError("Third bug is that the if test fails silently");

    Components.utils.import("resource://bug/testModule.js");

    Components.utils.reportError("Testing is "+Testing);

}
}

//=================================================
//Note: You probably don't want to edit anything
//below this unless you know what you're doing.
//
//Factory
var TestComponentFactory = {
singleton: null,
createInstance: function (aOuter, aIID)
{
 if (aOuter != null)
   throw Components.results.NS_ERROR_NO_AGGREGATION;
 if (this.singleton == null)
   this.singleton = new TestComponent();
 return this.singleton.QueryInterface(aIID);
}
};

//Module
var TestComponentModule = {
registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
{
 aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
 aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
},

unregisterSelf: function(aCompMgr, aLocation, aType)
{
 aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
 aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);
},

getClassObject: function(aCompMgr, aCID, aIID)
{
 if (!aIID.equals(Components.interfaces.nsIFactory))
   throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

 if (aCID.equals(CLASS_ID))
   return TestComponentFactory;

 throw Components.results.NS_ERROR_NO_INTERFACE;
},

canUnload: function(aCompMgr) { return true; }
};

//module initialization
function NSGetModule(aCompMgr, aFileSpec) { return TestComponentModule; }
