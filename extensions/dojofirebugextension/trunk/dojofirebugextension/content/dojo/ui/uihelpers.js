/* Released under BSD license (see license.txt) */
/*
 * Copyright IBM Corporation 2010, 2010. All Rights Reserved. 
 * U.S. Government Users Restricted Rights -  Use, duplication or disclosure restricted by GSA ADP 
 * Schedule Contract with IBM Corp. 
 */


/**
 * UI helpers
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
define([
        "firebug/firebug",
        "firebug/lib/css",
        "firebug/lib/dom",
        "dojo/ui/dojoreps"
       ], function dojoUIHelperFactory(Firebug, Css, Dom, DojoReps)
{

const Ci = Components.interfaces;
const nsIInterfaceRequestor = Ci.nsIInterfaceRequestor;
const nsISelectionDisplay = Ci.nsISelectionDisplay;
const nsISelectionController = Ci.nsISelectionController;

//the name of our strings bundle
var DOJO_BUNDLE = "dojostrings";    
var DOJO_EXT_CSS_URL = "chrome://dojofirebugextension/skin/dojofirebugextension.css";
    
//  //are we on top of FF4?
//  var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
//  var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
//
//  var isFF4 = (versionChecker.compare(appInfo.version, "4.0*") >= 0);

    var UI = {};

 // ***************************************************************
    
    /**
     * Return the visibility value for the parameter.
     * @param visibility the visibility
     */
    var getVisibilityValue = UI.getVisibilityValue = function(visibility){
        return visibility ? 'inherit' : 'none';
    };
       
    /**
     * sets our default css styles to a given document.
     * This method is used by the panels on this file.
     */
    var addStyleSheet = UI.addStyleSheet = function(doc) {
        Css.appendStylesheet(doc, DOJO_EXT_CSS_URL);
    };        
    

    var getSelectionController = function(panel) {
        var browser = Firebug.chrome.getPanelBrowser(panel);
        return browser.docShell.QueryInterface(nsIInterfaceRequestor)
            .getInterface(nsISelectionDisplay)
            .QueryInterface(nsISelectionController);
    };

    /**
     * Scroll search found selection. 
     */
    var scrollSelectionIntoView = UI.scrollSelectionIntoView = function(panel) {
        var selCon = getSelectionController(panel);
        selCon.scrollSelectionIntoView(
                nsISelectionController.SELECTION_NORMAL,
                nsISelectionController.SELECTION_FOCUS_REGION, true);
    };

    

 // ****************************************************************
 // HELPER OBJECTS IN THIS NAMESPACE
 // ****************************************************************    
     var DomHighlightSelector = UI.DomHighlightSelector = function(){
         // The selectors
         this._selectors = [];
         
         /**
          * Add a selector.
          * @param className the class name to search
          * @param isSelection the function to identify the selection in the repObjects.
          */
         this.addSelector = function(/*String*/className, /*Function*/isSelection){
             this._selectors.push({
                 className: className,
                 isSelection: isSelection
             });
         };
         
         /**
          * This method highlight the selection in the parentNode element.
          * @param parentNode the node where the main panel info is contained.
          * @param selection the selection.
          * @param focus boolean to decide if the object should be focus
          */
         this.highlightSelection = function(parentNode, selection, /*boolean*/focus) {
             var occurrence;
             var firstOccurrence;
             var i;
             for (i = 0; i < this._selectors.length; i++) {
                 occurrence = this._highlightSelection(parentNode, selection, this._selectors[i].className, this._selectors[i].isSelection);
                 firstOccurrence = firstOccurrence || occurrence ;
             }
             if (focus && firstOccurrence) { Dom.scrollIntoCenterView(firstOccurrence); }
         };
                 
         /**
          * This function highlight the current dojo tab selection in the main panel.
          * @param parentNode the node where the main panel info is contained.
          * @param selection the selection.
          * @param className the class name to look the elements in the dom.
          * @param isSelection function that verify if an object is the selection.
          */
         this._highlightSelection = function(parentNode, selection, className, isSelection){
             var domElements = parentNode.getElementsByClassName(className);
             var node;
             var obj;
             var firstOccurrence;
             var i;
             for (i = 0; i < domElements.length; i++) {
                 node = domElements[i];
                 obj = node.referencedObject;
                 if (isSelection(selection, obj)){
                     firstOccurrence = firstOccurrence || node ;
                     Css.setClass(node, "currentSelection");
                 } else {
                     Css.removeClass(node, "currentSelection");
                 }
             }
             return firstOccurrence;
         };
     };
     
// ***************************************************************     
     
     /**
      * This class admin the a message box.
      */
     var ActionMessageBox = UI.ActionMessageBox = function(id, parentNode, msg, btnName, action) {
         // Message box identifier
         this._actionMessageBoxId = "actionMessageBoxId-" + id; 
         
         // The parentNode
         this._parentNode = parentNode; 
         
         // The message
         this._message = msg;
         
         // The button message
         this._btnName = btnName;
         
         // The action
         this._action = action;
     };
     ActionMessageBox.prototype = {

             /**
          * Load the message box in the parentPanel
          * @param visibility boolean that define if the box should be visible or not.
          */
         loadMessageBox: function(visibility){
             DojoReps.ActionMessageBox.tag.append({actionMessageBoxId: this._actionMessageBoxId,
                                               visibility: this._getVisibilityValue(visibility),
                                               message: this._message, btnName: this._btnName,
                                               actionMessageBox: this}, this._parentNode);
         },
         
         /**
          * Show the message box (if it exist).
          */
         showMessageBox: function(){
             this._setMessageBoxVisibility(true);
         },
         
         /**
          * Hide the message box (if it exist).
          */
         hideMessageBox: function(){
             this._setMessageBoxVisibility(false);
         },
         
         _getVisibilityValue: function(visibility){
             return getVisibilityValue(visibility);
         },
         
         /**
          * Set message box visibility.
          */
         _setMessageBoxVisibility: function(visibility){
             // FIXME: Use $() function. Find out why this._parentNode has no getElementById method.
             //var msgbox = $(this._actionMessageBoxId, this._parentNode);
             //var msgbox = this._parentNode.firstElementChild;
             var msgbox = this._getMessageBox(this._parentNode, this._actionMessageBoxId);
             msgbox = (msgbox && (msgbox.id == this._actionMessageBoxId)) ? msgbox :null ;
             
             if (msgbox) { msgbox.style.display = this._getVisibilityValue(visibility); }
         },
         
         /**
          * Find the msg box.
          */
         _getMessageBox: function(parentNode, boxId){
             var children = parentNode.children;
             var int;
             for ( int = 0; int < children.length; int++) {
                 var child = children[int];
                 if (child.id == boxId) { 
                     return child;
                 }
             }
             return null;
         },
         
         /**
          * Execute the action.
          */
         executeAction: function(){
             this._action(this);
         }
     };
     
          
     
 // ***************************************************************
 // exported classes
 // ***************************************************************    

    UI.ActionMessageBox = ActionMessageBox;
    UI.DomHighlightSelector = DomHighlightSelector;   
    UI.DOJO_BUNDLE = DOJO_BUNDLE;
    
    return UI;
});
    