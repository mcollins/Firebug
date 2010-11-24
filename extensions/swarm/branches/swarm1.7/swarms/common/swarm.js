if (!window.console)
{
    window.console = { log: function(){}, error: function(){} };
}

var swarmCommands =
{
    installAll: function(event)
    {
        this.selectAll();
        this.installSelected();
    },

    selectAll: function()
    {
        eachSwarm(function selectSwarm(swarm)
        {
           var input = getInput(swarm);
           input.checked = true;
        });
        doSwarmSelect();
    },

    installSelected: function()
    {
        var selected = getSelectedExtensions();
        var installInfo = {};
        for (var i = 0; i < selected.length; i++)
        {
            installInfo[selected[i].id] =
            {
                URL: selected[i].href,
                IconURL: "http://getfirebug.com/img/firebug-tiny.png", // should be 32x32 not 24x24
                hash: selected[i].hash,
            }

        }
       try
        {
           InstallTrigger.install(installInfo);
        }
        catch(exc)
        {
           console.log("InstallTrigger FAILS "+exc, exc, installInfo);
        }
    },


};

function doSwarmCommand(event)
{
    console.log('doSwarmCommand', event.target);
    var command = event.target.getAttribute('id');
    if ( swarmCommands.hasOwnProperty(command) )
        swarmCommands[command].call(swarmCommands,event);
    else
        console.error("no swarm command "+command, swarmCommands);
}

function getSelectedExtensions()
{
    var inputs = document.getElementsByClassName("installThisOne");
    var selectedForInstall = []
    for (var i = 0; i < inputs.length; i++)
    {
        if (inputs[i].checked)
        {
            var a = inputs[i].parentNode.getElementsByClassName('extensionURL')[0];
            selectedForInstall.push(a);
        }
    }
    return selectedForInstall;
}

function updateTotal(totalSelected)
{
    var theTotal = document.getElementById("extensionsSelected");
    theTotal.innerHTML = totalSelected +" extension"+(totalSelected>1?"s":"")+" selected";
}

function doUpdateTotal(event)
{
    updateTotal(getSelectedExtensions().length);
}

function hookSwarmButtons()
{
    var swarmButtons = document.getElementsByClassName("swarmCommand");
    for (var i = 0; i < swarmButtons.length; i++)
    {
        swarmButtons[i].addEventListener('click', doSwarmCommand, true);
    }

    var swarmSelectors = document.getElementsByClassName("swarmSelector");
    for (var i = 0; i < swarmSelectors.length; i++)
    {
        swarmSelectors[i].addEventListener('click', doSwarmSelect, true);
        var input = swarmSelectors[i].getElementsByTagName('input')[0];

    }

    var extensionButtons = document.getElementsByClassName("installThisOne");
    for (var i = 0; i < extensionButtons.length; i++)
    {
        extensionButtons[i].addEventListener('click', doUpdateTotal, true);
    }
}

// **************************************************

function doSwarmShowHide(event)
{
    var selectedNames = "";

    eachExtInSwarm(event, function colorize(inSwarm)
    {
        if (event.type === "mouseover")
        inSwarm.classList.add("inSwarm");
        else if (event.type === "mouseout")
        inSwarm.classList.remove("inSwarm");

    selectedNames += inSwarm.getElementsByTagName('a')[0].textContent +" ";
    });

    if (event.type === "mouseover")
    event.target.classList.add('inSwarm');
    else if (event.type === 'mouseout')
    event.target.classList.remove('inSwarm');

    event.target.title = selectedNames;
}

function doSwarmSelect()
{
    var selectedSwarms = [];
    eachSwarm(function getSelectedSwarmNames(swarm)
    {
        var input = getInput(swarm);
        if (input.checked)
          selectedSwarms.push(input.value+"Swarm");
    });

    eachExt(function selectIfASwarmSelected(ext)
    {
        var extInput = getInput(ext);
        extInput.checked = false;
        for (var i = 0; i < selectedSwarms.length; i++)
        {
            if (ext.classList.contains(selectedSwarms[i]))
                extInput.checked = true;
            console.log("Checking selectedSwarm "+selectedSwarms[i], ext);
        }
    });
    doUpdateTotal();
}

function eachExt(fnOfExtDiv)
{
    var exts = document.getElementsByClassName("extension");
    for(var i = 0; i < exts.length; i++)
        fnOfExtDiv(exts[i]);
}

function eachSwarm(fnOfSwarmDiv)
{
    var swarms = document.getElementsByClassName("swarmSelector");
    for(var i = 0; i < swarms.length; i++)
       fnOfSwarmDiv(swarms[i]);
}

function eachExtInSwarm(event, fnOfExtensionDiv)
{
    if (!event.target.tagName === "div")
    return;

    var inputElement = getInput(event.target);
    if (!inputElement)
       return;

    var swarmName = inputElement.getAttribute("value");
    var swarmClassName = swarmName+"Swarm";

    var selectedNames = "";
    var inSwarm = document.getElementsByClassName(swarmClassName);
    for (var i = 0; i < inSwarm.length; i++)
        fnOfExtensionDiv(inSwarm[i]);
}

function getInput(targetDiv)
{
    if (targetDiv.tagName === 'INPUT')
    return targetDiv;

    var inputElement = targetDiv.getElementsByTagName('input')[0];
    return inputElement;
}

function addMouseOvers()
{
    var swarmButtons = document.getElementsByClassName("swarmSelector");
    for (var i = 0; i < swarmButtons.length; i++)
    {
        swarmButtons[i].addEventListener('mouseover', doSwarmShowHide, true);
        swarmButtons[i].addEventListener('mouseout', doSwarmShowHide, true);
    }
}

// **************************************************
function doCommands()
{
   var href = window.location.toString();
   var parts = href.split('?');
   if (parts[1])
   {
      var params = parts[1].split('&');
      console.log("doCommands params: ", params);
      for (var i = 0; i < params.length; i++)
      {
         var nv = params[i].split('=');
         if (nv[0] === 'installAll')
           swarmCommands.installAll();
         else if (nv[0] === 'swarms')
         {
           eachSwarm(function selectSwarm(swarm)
           {
              var input = getInput(swarm);
              if (input.value === nv[1])
                 input.checked = true;
           });
         }
      }
   }
}
// **************************************************

function onload()
{
    if (!this.youDidTheLoadSilly)
    {
        hookSwarmButtons();
        addMouseOvers();
        doCommands();
        doSwarmSelect();
        doUpdateTotal();
        this.youDidTheLoadSilly = true;
     }
}
window.addEventListener('load', onload, false);
