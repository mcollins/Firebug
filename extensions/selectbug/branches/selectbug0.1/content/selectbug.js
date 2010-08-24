/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

// ************************************************************************************************

// Register string bundle of this extension so, $STR method (implemented by Firebug)
// can be used. Also, perform the registration here so, localized strings used
// in template definitions can be resolved.
Firebug.registerStringBundle("chrome://selectbug/locale/selectbug.properties");

// ************************************************************************************************


/**
 * @panel Selector side panel displaying HTML elements for the current selector, either from the CSS main panel or user entry
 */
function SelectorPanel() {}
SelectorPanel.prototype = extend(Firebug.Panel,
/** @lends SelectorPanel */
{
    name: 'selection',
    parentPanel: 'stylesheet',
    title: $STR("selectbug.Selection"),
    editable: true,

    initialize: function(context, doc)
    {
        Firebug.Panel.initialize.apply(this, arguments);
    },

    initializeNode: function(oldPanelNode)
    {
        Firebug.Panel.initializeNode.apply(this, arguments);
        appendStylesheet(this.panelNode.ownerDocument, "chrome://selectbug/skin/selectbug.css");
        appendStylesheet(this.mainPanel.panelNode.ownerDocument, "chrome://selectbug/skin/selectbug.css");
        this.setSelection = bind(this.setSelection, this);
        this.clearSelection = bind(this.clearSelection, this);
        this.lockSelection = bind(this.lockSelection, this);
        this.mainPanel.panelNode.addEventListener("mouseover", this.setSelection, false);
        this.mainPanel.panelNode.addEventListener("mouseout", this.clearSelection, false);
        this.mainPanel.panelNode.addEventListener("mousedown", this.lockSelection, false);
    },

    destroyNode: function()
    {
        this.mainPanel.panelNode.removeEventListener("mouseover", this.setSelection, false);
        this.mainPanel.panelNode.removeEventListener("mouseout", this.clearSelection, false);
        this.mainPanel.panelNode.removeEventListener("mousedown", this.lockSelection, false);
        Firebug.Panel.destroyNode.apply(this, arguments);
    },

    show: function(state)
    {
        Firebug.Panel.show.apply(this, arguments);
        this.refresh();
    },

    getCSSStyleRule: function(event)
    {
        var object = Firebug.getRepObject(event.target);
        if(object && (object instanceof CSSStyleRule))
            return object;
    },

    getCSSRuleElement: function(element)
    {
        while(element && !element.classList.contains("cssRule"))
            element = element.parentNode;

        return element;
    },

    setSelection: function(event)
    {
        var rule = this.getCSSStyleRule(event);
        if (rule) // then we have entered a rule element
        {
            var ruleElement = this.getCSSRuleElement(event.target);
            if (ruleElement && ruleElement !== this.lockedElement)
                ruleElement.classList.add("selectedSelectorRule");

            this.selection = rule;
            this.rebuild();
        }
    },

    clearSelection: function(event)
    {
        if (this.selection !== this.lockedSelection)
        {
            this.selection = this.lockedSelection;
            this.rebuild();
        }

        var rule = this.getCSSStyleRule(event);
        if (rule)  // then we are leaving a rule element that we may have highlighted.
        {
            var ruleElement = this.getCSSRuleElement(event.target);
            if (ruleElement)
                ruleElement.classList.remove("selectedSelectorRule");
        }
    },

    lockSelection: function(event)
    {
        var rule = this.getCSSStyleRule(event);
        if (rule)
        {
            if (this.lockedElement)
                this.lockedElement.classList.remove("lockedSelectorRule");

            this.lockedElement = this.getCSSRuleElement(event.target);

            if (this.lockedElement)
            {
                this.lockedElement.classList.add("lockedSelectorRule");
                this.lockedElement.classList.remove("selectedSelectorRule");
            }

            this.lockedSelection = rule;
        }
    },

    hide: function()
    {
        Firebug.Panel.hide.apply(this, arguments);
    },

    refresh: function()
    {
        var root = this.context.window.document.documentElement;
        this.selection = this.mainPanel.selection;
        this.rebuild(true);
    },

    /*
     * returns an array of Elements matched from selector
     */
    getSelectedElements: function(selectorText)
    {

        var selections = Firebug.currentContext.window.document.querySelectorAll(selectorText);
        if (selections instanceof NodeList)
            return selections;
        else
            throw new Error("Selection Failed: "+selections);
    },

    /**
     * Build content of the panel. The basic layout of the panel is generated by
     * {@link SelectorTemplate} template.
     */
    rebuild: function()
    {
        if (this.selection)
        {
            try
            {
                if (this.selection instanceof CSSStyleRule)
                    var selectorText = this.selection.selectorText;
                else
                    var selectorText = this.selection;

                var elements = this.getSelectedElements(selectorText);
                if (elements && elements.length)
                {
                    SelectorTemplate.tag.replace({object: elements}, this.panelNode);
                    return;
                }
            }
            catch(e)
            {
                WarningTemplate.selectErrorTag.replace({object: e}, this.panelNode);
                return;
            }
        }

        WarningTemplate.noSelectionTag.replace({object: this.selection}, this.panelNode);
    },

    getObjectPath: function(object)
    {
        if (FBTrace.DBG_SELECTBUG)
            FBTrace.sysout("selectbug.getObjectPath NOOP", object);
    },

     supportsObject: function(object)
    {
        return 0;
    },
    //********************************************************
    tryASelector:function(element)
    {
        if (!this.trialSelector)
            this.trialSelector = this.selection ? this.selection.selectorText : "";

        this.editProperty(element, this.trialSelector);
    },

    editProperty: function(row, editValue)
    {
        Firebug.Editor.startEditing(row, editValue);
    },

    getEditor: function(target, value)
    {
        if (!this.editor)
            this.editor = new SelectorEditor(this);

        return this.editor;
    }

});

// ************************************************************************************************

// ************************************************************************************************

var BaseRep = domplate(Firebug.Rep,
{
    // xxxHonza: shouldn't this be in Firebug.Rep?
    getNaturalTag: function(value)
    {
        var rep = Firebug.getRep(value);
        var tag = rep.shortTag ? rep.shortTag : rep.tag;
        return tag;
    }
});

// ************************************************************************************************


var TrialRow =
        TR({"class": "watchNewRow", level: 0, onclick: "$onClickEditor"},
            TD({"class": "watchEditCell", colspan: 3},
                    DIV({"class": "watchEditBox a11yFocusNoTab", role: "button", 'tabindex' : '0',
                        'aria-label' : $STR('a11y.labels.press enter to add new selector')},
                        $STR("selectbug.TryASelector"),
                    DIV({"class": "trialSelector", collapsed: "true"}, "")
                    )
                )
            );

/**
 * @domplate: Template for basic layout of the {@link SelectorPanel} panel.
 */
var SelectorTemplate = domplate(BaseRep,
{
    // object will be array of elements CSSStyleRule
    tag:
        TABLE({"class": "cssSelectionTable", cellpadding: 0, cellspacing: 0},
            TBODY({"class": "cssSelectionTBody"},
                TrialRow,
                FOR("element", "$object",
                    TR({"class": "elementRow", _repObject:"$element"},
                        TD({"class": "selectionElement"},
                            TAG( "$element|getNaturalTag", {object: "$element"})
                        )
                    )
                )
            )
        ),

    onClickEditor: function(event)
    {
        var tr = event.currentTarget;
        var panel = Firebug.currentContext.getPanel("selection", true);
        panel.tryASelector(tr);
    },

});

function SelectorEditor(panel)
{
    var doc = panel.document;
    this.panel = panel;
    this.box = this.tag.replace({}, doc, this);
    this.input = this.box;

    this.tabNavigation = false;
    this.tabCompletion = true;
    this.completeAsYouType = false;
    this.fixedWidth = true;

    this.autoCompleter = Firebug.CommandLine.autoCompleter;
}

SelectorEditor.prototype = domplate(Firebug.InlineEditor.prototype,
{
    tag:
        INPUT({"class": "fixedWidthEditor a11yFocusNoTab",
            type: "text", title:$STR("Selector"),
            oninput: "$onInput", onkeypress: "$onKeyPress"}),

    endEditing: function(target, value, cancel)
    {
        if (cancel || value == "")
            return;
        var trialSelector = target.getElementsByClassName('trialSelector')[0];
        trialSelector.textContent = value;
        collapse(trialSelector, false);
        this.panel.selection = value;
        this.panel.rebuild();
    }
});


var WarningTemplate = domplate(Firebug.Rep,
{
    noSelectionTag: DIV({"class":"selectbugWarning "},
            SPAN($STR("selectbug.noSelection"))
            ),

    selectErrorTag: DIV({"class":"selectbugWarning"},
            DIV($STR("selectbug.selectorError")),
            DIV({"class":"selectionErrorText"}, SPAN("$object"))
            ),
});

// ************************************************************************************************
// ************************************************************************************************
// Registration

// xxxHonza: what if the stylesheet registration would be as follows:
//Firebug.registerStylesheet("chrome://selectbug/skin/selectbug.css");

Firebug.registerPanel(SelectorPanel);

// ************************************************************************************************
}});