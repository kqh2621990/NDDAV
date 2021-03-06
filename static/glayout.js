class glayout {
  constructor(container, panelMetaInfo, objectMap) {
    this.panelMetaInfo = panelMetaInfo;
    this.objectMap = objectMap;

    this.container = container;
    this.uuid = "div_" + uuidv1();

    socket.on(this.uuid, this.handleInitLayout.bind(this));

    //request the componentLayout
    var msg = {
      "type": "subscribeData",
      "name": "componentLayout",
      "uid": this.uuid
    };
    socket.emit("message", msg);
    // console.log("message, ", msg);
  }

  convertToConfig(desc) {
    var config = {
      settings: {
        showPopoutIcon: true,
        // showPopoutIcon: false,
        showCloseIcon: false
      },
      content: []
    };


    //depth first search
    var panelMetaInfo = this.panelMetaInfo;
    var parseDesc = function(node) {
      if (node !== null && typeof node === 'object') {
        for (var key in node) {
          if (node.hasOwnProperty(key)) {
            // console.log("key:", key)
            let entry = node[key];
            node['type'] = key;

            //if have more div children
            node['content'] = node[key];
            delete node[key];
            for (let i = 0; i < entry.length; i++) {
              //if entry[i] is object do nothing
              if (entry[i] !== null && typeof entry[i] ===
                'object')
                parseDesc(entry[i]);
              else
                node['content'][i] = parseDesc(entry[i]);
            }
          }
        }
      } else {
        //processing entry
        // console.log("leftNode", node)
        let item = createItem("component", node,
          panelMetaInfo);
        // console.log(item);
        return item;
      }
    }


    var createItem = function(type, label, info) {
      if (type === "component") {
        return {
          type: 'component',
          componentName: label,
          componentState: {
            route: info[label][0],
            name: info[label][1]
          }
        };
      } else {
        return {

        }
      }
    }

    parseDesc(desc);
    // console.log(desc);
    config.content[0] = desc;

    return config;
  }

  handleInitLayout(msg) {
    console.log(msg["data"]["data"]);
    var layoutDesc = msg["data"]["data"]
    var config = this.convertToConfig(layoutDesc);

    this.layout = new window.GoldenLayout(config, this.container);
    // console.log(config);
    this.layout.on("initialised", function() {
      // console.log("!!!! initialised callback !!!!!!!\n");
      let msg = {
        "type": "initialised",
        "name": "componentLayout",
        "uid": this.uuid
      };
      socket.emit("message", msg);
    }.bind(this));

    var panelMetaInfo = this.panelMetaInfo;
    //register components
    for (let key in this.panelMetaInfo) {
      if (this.panelMetaInfo.hasOwnProperty(key)) {
        this.addMenuItem(key, panelMetaInfo[key][0], panelMetaInfo[
          key][1], this.layout);
        this.registerComponent(this.layout, key);

      }
    }



    this.layout.init();
    // console.log("layout finished\n");
  }

  setAddMenuCallback(callback) {
    // console.log("setAddMenuCallback");
    this.addMenuItem = callback;
  }

  getLayout() {
    return this.layout;
  }

  registerComponent(appLayout, name) {
    //register factory callback
    var objectMap = this.objectMap;
    appLayout.registerComponent(name, function(container,
      componentState) {
      // console.log("loading -- ", componentState);
      //popout test
      // console.log("container constructor:", componentState.name);
      // container.getElement().html( '<h2>' + componentState.name + '</h2>' );

      $.get(componentState.route,
        function(template) {
          // var uuid = guid();
          var uuid = "div_" + uuidv1();
          var data = {
            id: uuid
          };
          var htmlComponent = Mustache.render(
            template,
            data);
          //create panel component
          var panel = container.getElement();
          panel.html(htmlComponent)
            // var panel = new window[componentState.name](uuid);
            //storge the object with panel
          var component = new objectMap[
            componentState.name](uuid);
          panel.data("component", component);
          container.on("resize", component.resize
            .bind(component));
        });
    });
  }
}
