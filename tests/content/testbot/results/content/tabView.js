/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) { with (Domplate) {

// ************************************************************************************************

/**
 * Basic TabView implementation. This object is used as a base for all
 * tab views.
 */
CDB.Reps.TabView = domplate(CDB.Rep,
{
    listeners: [],

    tag:
        TABLE({"class": "tabView", cellpadding: 0, cellspacing: 0},
            TBODY(
                TR({"class": "tabViewRow"},
                    TD({"class": "tabViewCol", valign: "top"},
                        TAG("$tabList")
                    )
                )
            )
        ),

    hideTab: function(context)
    {
        return false;
    },

    onClickTab: function(event)
    {
        var e = fixEvent(event || window.event);
        var tab = getAncestorByClass(e.target, "tab");
        if (tab)
            this.selectTab(tab);
    },

    selectTabByName: function(tabView, tabName)
    {
        var tab = getElementByClass(tabView, tabName + "Tab");
        if (tab)
            this.selectTab(tab);
    },

    selectTab: function(tab)
    {
        if (!hasClass(tab, "tab"))
            return;

        var view = tab.getAttribute("view");
        var viewBody = getAncestorByClass(tab, "tabViewBody");

        // Deactivate current tab.
        if (viewBody.selectedTab)
        {
            viewBody.selectedTab.removeAttribute("selected");
            if (viewBody.selectedBody)
                viewBody.selectedBody.removeAttribute("selected");

            // xxxHonza: IE workaround. Removing the "selected" attribute
            // doesn't update the style (associated using attribute selector).
            // So use a class name instead.
            removeClass(viewBody.selectedTab, "selected");
            if (viewBody.selectedBody)
                removeClass(viewBody.selectedBody, "selected");
        }

        // Store info about new active tab. Each tab has to have a body, 
        // which is identified by class.
        var tabBody = getElementByClass(viewBody, "tab" + view + "Body");

        viewBody.selectedTab = tab;
        viewBody.selectedBody = tabBody;

        // Activate new tab.
        viewBody.selectedTab.setAttribute("selected", "true");
        viewBody.selectedBody.setAttribute("selected", "true");

        // xxxHonza: IE workaround. Adding the "selected" attribute doesn't
        // update the style. Use class name instead.
        setClass(viewBody.selectedBody, "selected");
        setClass(viewBody.selectedTab, "selected");

        this.updateTabBody(viewBody, view, null);
    },

    updateTabBody: function(viewBody, view, object)
    {
        var tab = viewBody.selectedTab;

        for (var i=0; i<this.listeners.length; i++) {
            var listener = this.listeners[i];
            if (listener.onUpdateTabBody)
                listener.onUpdateTabBody(viewBody, view, object);
        }
    },

    appendUpdateListener: function(listener)
    {
        this.listeners.push(listener);
    },

    removeUpdateListener: function(listener)
    {
        remove(this.listeners, listener);
    },

    render: function(obj, parentNode)
    {
        return this.tag.replace(obj, parentNode, this);
    }
});

// ************************************************************************************************
}}});
