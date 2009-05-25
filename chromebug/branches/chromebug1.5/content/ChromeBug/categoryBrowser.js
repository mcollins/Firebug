/* See license.txt for terms of usage */
window.dump("categoryBrowser.js loading \n");
try {
FBL.ns(function() { with (FBL) {
    window.dump("categoryBrowser.js running \n");
const Cc = Components.classes;
const Ci = Components.interfaces;
const nsISupportsCString = Ci.nsISupportsCString;

const browserElt = $('cbXPCOMBrowser');
const explorerElt = $('cbExplorer');
const fbContentBox = $('fbContentBox');

Firebug.Chromebug.CategoryBrowser = extend(Firebug.Module,
{
    dispatchName: "categoryBrowser",
    XPCOMBrowserUp: false,


    //**********************************************************************************
    toggleXPCOMBrowser: function(context)
    {
        if (this.XPCOMBrowserUp)
            this.stopXPCOMBrowser();
        else
            this.startXPCOMBrowser(context);
    },

    startXPCOMBrowser: function(context)
    {
        fbContentBox.setAttribute("collapsed", true);
        explorerElt.removeAttribute("collapsed");
        this.XPCOMBrowserUp = true;
        FirebugChrome.setGlobalAttribute("cmd_toggleXPCOMBrowser", "checked", "true");

        if (!this.categoryBox)
            this.categoryBox = browserElt.contentDocument.getElementById('categoryBox');
FBTrace.sysout("startXPCOMBrowser browserElt", browserElt);
        this.refresh();
    },

    stopXPCOMBrowser: function()
    {
        explorerElt.setAttribute("collapsed", true);
        fbContentBox.removeAttribute("collapsed");
        this.XPCOMBrowserUp = false;
        FirebugChrome.setGlobalAttribute("cmd_toggleXPCOMBrowser", "checked", "false");
    },
    //**************************************************************************************
    //
    getCategories: function()
    {
        if (!this.catman)
            this.catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);

        var list = [];
        var categories = this.catman.enumerateCategories();
        while( categories.hasMoreElements() )
        {
            var categoryName =  categories.getNext().QueryInterface(nsISupportsCString);
            list.push( new Category(categoryName) );
        }
        return list;
    },

    getProperties: function(category)
    {
        var list = [];
        var properties = this.catman.enumerateCategory(category);
        while( properties.hasMoreElements() )
        {
            var property = properties.getNext().QueryInterface(nsISupportsCString);
            list.push( new CategoryProperty(category, property) );
        }
        return list;
    },

    getPropertyValue: function(property)
    {
        if (!property.propertyValue)
        {
            var name = property.propertyName;
            property.propertyValue = this.catman.getCategoryEntry(property.categoryName, name);
        }
        return property.propertyValue;
    },

    //************************************************************************************************
    //
    refresh: function()
    {
        var categories = Firebug.Chromebug.CategoryBrowser.getCategories();
        FBTrace.sysout("BEFORE this.categoryBox", this.categoryBox);
        this.CategoryRep.tag.replace({categories: categories}, this.categoryBox);

        this.categoryBox.addEventListener('click', this.showProperties, true); // capturing

        FBTrace.sysout("AFTER: this.categoryBox.innerHTML", this.categoryBox.innerHTML);
    },

    showProperties: function(event)
    {
        FBTrace.sysout("categoryBrowser.showProperties", event.target);
        var categoryBox = FBL.getAncestorByClass(event.target, "categoryBox");
        toggleClass(categoryBox, "showProperties");
    }
});

function Category(categoryName)
{
    this.categoryName = categoryName;
}

function CategoryProperty(category, property)
{
    this.categoryName = category;
    this.propertyName = property;
}

// ************************************************************************************************
Firebug.Chromebug.CategoryBrowser.CategoryProperties = domplate(Firebug.Rep,
{
    tag:
       FOR("property", "$category|getProperties",
              DIV ( {class:"categoryPropertyBox"},
                   SPAN({class: "categoryPropertyTag"}, "$property|getPropertyName"),
                   SPAN({class: "categoryPropertyValue"}, "$property|getPropertyValue")
                )
       ),

    className: "category-property",

    supportsObject: function(object)
    {
        return object instanceof CategoryProperty;
    },

    getProperties: function(category)
    {
        return Firebug.Chromebug.CategoryBrowser.getProperties(category.categoryName);
    },

    getPropertyName: function(property)
    {
        return property.propertyName;
    },

    getPropertyValue: function(property)
    {
        return Firebug.Chromebug.CategoryBrowser.getPropertyValue(property);
    },
});

Firebug.Chromebug.CategoryBrowser.CategoryRep = domplate(Firebug.Rep,
{
    tag:
        FOR("category", "$categories",
              DIV({class: "categoryBox"},
                    IMG({class: "twisty", src: "chrome://firebug/content/blank.gif"}),
                      SPAN({class: "categoryName"}, "$category|getCategoryName"),
                   TAG(Firebug.Chromebug.CategoryBrowser.CategoryProperties.tag, {category: "$category"})
            )
        ),

    className: "category",

    supportsObject: function(object)
    {
        return object instanceof Category;
    },

    getCategoryName: function(category)
    {
        return category.categoryName;
    }
});

Firebug.registerModule(Firebug.Chromebug.CategoryBrowser);

// ************************************************************************************************

}});
} catch(exc)
{
    window.dump("categorybrowser fails "+exc+"\n");
}
