function onmessage(event) {
  postMessage(analyzeResult(event.data));
}

function analyzeResult(result) {
  var data = JSON.parse(result);
  var graph = data.graph;
  var shapes = {};

  // Convert keys in the graph from strings to ints.
  // TODO: Can we get rid of this ridiculousness?
  var newGraph = {};
  for (id in graph) {
    newGraph[parseInt(id)] = graph[id];
  }
  graph = newGraph;

  // Cull children to the ones that actually exist in our graph.
  for (id in graph)
    graph[id].children = [graph[childId]
                          for each (childId in graph[id].children)
                          if (childId in graph)];

  // Add function and referent information to the graph.
  for (id in graph)
    graph[id].referents = [];
  var functions = {};
  var graphFuncs = [];
  var nativeClasses = {};
  for (id in graph) {
    var info = graph[id];

    var nativeClass = info.nativeClass;
    if (nativeClass.indexOf("XPC") == 0)
      nativeClass = "XPConnect Object Wrapper";
    if (!(nativeClass in nativeClasses))
      nativeClasses[nativeClass] = 1;
    else
      nativeClasses[nativeClass]++;

    // Add function info.
    if (info.filename) {
      var name = info.name;
      if (!name)
        name = "anonymous";
      var idParts = [name, info.filename, info.lineStart, info.lineEnd];
      var id = idParts.join(":");
      if (!(id in functions)) {
        functions[id] = {name: name,
                         filename: info.filename,
                         lineStart: info.lineStart,
                         lineEnd: info.lineEnd,
                         instances: 0,
                         referents: 0,
                         protoCount: 0,
                         isGlobal: false,
                         rating: 0};
      }
      functions[id].instances += 1;
      info.funcInfo = functions[id];
      graphFuncs.push(info);
    }

    // Add referent info.
    info.children.forEach(function(child) {
      child.referents.push(info);
    });
  }

  function trackProtoCount(info) {
    if (typeof(info.protoCount) == "undefined") {
      var protoCount = 0;
      info.referents.forEach(
        function(refInfo) {
          if (refInfo.nativeClass == 'Object' &&
              refInfo.prototype == info.id)
            protoCount += 1 + trackProtoCount(refInfo);
        });
      info.protoCount = protoCount;
    }
    return info.protoCount;
  }

  function makeWindowInfo(id, info) {
    return {id: id,
            references: info.children.length,
            referents: info.referents.length};
  }

  graphFuncs.forEach(
    function(info) {
      info.funcInfo.referents = info.referents.length;
      info.referents.forEach(
        function(refInfo) {
          switch (refInfo.nativeClass) {
          case 'Window':
            info.funcInfo.isGlobal = true;
            break;
          case 'Object':
            info.funcInfo.protoCount += trackProtoCount(refInfo);
            break;
          }
        });

      info.funcInfo.rating = (info.funcInfo.protoCount +
                              info.funcInfo.instances +
                              info.funcInfo.referents);
    });

  // Generate object shape information about objects we care about.
  for each (info in graph) {
    if ("shape" in info) {
      var shapeName = data.shapes[info.shape];
      var curr = info;
      while ("prototype" in curr && graph[curr.prototype]) {
        var prote = graph[curr.prototype];
        if ("shape" in prote)
          shapeName += "," + data.shapes[prote.shape];
        curr = prote;
      }
      if (!(shapeName in shapes))
        shapes[shapeName] = 0;
      shapes[shapeName]++;
    }
  }

  var windows = {};
  for (name in data.namedObjects) {
    var id = data.namedObjects[name];
    windows[id] = makeWindowInfo(id, graph[id]);
  }

  return JSON.stringify({functions: functions,
                         nativeClasses: nativeClasses,
                         windows: windows,
                         rejectedTypes: data.rejectedTypes,
                         shapes: shapes});
}
