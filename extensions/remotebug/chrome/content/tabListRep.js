/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ********************************************************************************************* //
// Domplate: list of tabs on the server

Firebug.RemoteBug.TabListRep = domplate(
{
    tag:
        UL(
            FOR("tab", "$tabs",
                LI({"class": ""},
                    A({"class": "link", onclick: "$onClick", _repObject: "$tab"},
                        "$tab.title"
                    )
                )
            )
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Domplate Handlers

    onClick: function(event)
    {
        var target = event.target;
        var tab = target.repObject;

        // Subscribe to the clicked remote tab.
        var panel = Firebug.getElementPanel(target);
        panel.subscribe(tab.actor);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Public

    render: function(parentNode, object)
    {
        this.tag.replace(object, parentNode, this);
    }
});

// ********************************************************************************************* //
}});
